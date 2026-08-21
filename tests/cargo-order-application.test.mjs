import assert from "node:assert/strict";
import test from "node:test";
import { CargoOrderService } from "../modules/cargo/application/cargo-order-service.ts";
import { InMemoryCargoOrderRepository } from "../modules/cargo/infrastructure/in-memory-cargo-order-repository.ts";

function createHarness(permissionOverrides) {
  const repository = new InMemoryCargoOrderRepository();
  let sequence = 0;
  let clock = new Date("2026-08-21T01:00:00.000Z");
  const service = new CargoOrderService({
    repository,
    now: () => clock,
    generateId: () => `00000000-0000-7000-8000-${String(++sequence).padStart(12, "0")}`,
    generatePublicCode: () => `CGO-20260821-${String(sequence + 1).padStart(4, "0")}`,
  });
  const branchId = "30000000-0000-7000-8000-000000000001";
  const permissions = permissionOverrides ?? [
    "cargo-order:read",
    "cargo-order:create",
    "cargo-order:transition",
    "cargo-order:resolve-exception",
  ];
  const principal = {
    id: "10000000-0000-7000-8000-000000000001",
    organizationId: "20000000-0000-7000-8000-000000000001",
    permissions,
    permissionScopes: Object.fromEntries(permissions.map((permission) => [permission, [branchId]])),
    authenticationMethod: "test",
  };
  const validInput = {
    organizationId: principal.organizationId,
    owningBranchId: branchId,
    serviceLevel: "same_day",
    originLocationId: "40000000-0000-7000-8000-000000000001",
    destinationLocationId: "40000000-0000-7000-8000-000000000002",
    packageCount: 3,
    totalWeightGrams: 12_500,
    declaredValueMinor: 24_000_000,
    currency: "VND",
    slaDueAt: "2026-08-21T10:00:00.000Z",
  };
  const request = (operation, keyHash = "key-hash", requestHash = "request-hash") => ({
    requestId: `req_${sequence + 1}`,
    idempotency: { operation, keyHash, requestHash },
  });
  return {
    repository,
    service,
    principal,
    validInput,
    request,
    setClock(value) { clock = new Date(value); },
  };
}

test("create cargo order commits order, event, audit and outbox together", async () => {
  const harness = createHarness();
  const result = await harness.service.create(
    harness.principal,
    harness.validInput,
    harness.request("cargo-order:create"),
  );

  assert.equal(result.replayed, false);
  assert.equal(result.order.status, "draft");
  assert.equal(result.order.version, 1);
  assert.equal(harness.repository.events.length, 1);
  assert.equal(harness.repository.auditEvents.length, 1);
  assert.equal(harness.repository.outboxMessages.length, 1);
  assert.equal(harness.repository.auditEvents[0].requestId, "req_1");
  assert.doesNotMatch(JSON.stringify(harness.repository.outboxMessages), /phone|email|address/i);
});

test("create cargo order is idempotent and rejects key reuse with another payload", async () => {
  const harness = createHarness();
  const first = await harness.service.create(
    harness.principal,
    harness.validInput,
    harness.request("cargo-order:create"),
  );
  const replay = await harness.service.create(
    harness.principal,
    harness.validInput,
    harness.request("cargo-order:create"),
  );

  assert.equal(replay.replayed, true);
  assert.equal(replay.order.id, first.order.id);
  assert.equal(harness.repository.events.length, 1);

  await assert.rejects(
    harness.service.create(
      harness.principal,
      { ...harness.validInput, packageCount: 4 },
      harness.request("cargo-order:create", "key-hash", "another-request-hash"),
    ),
    { code: "IDEMPOTENCY_CONFLICT", status: 409 },
  );
});

test("server authorization denies missing permission and out-of-scope branch", async () => {
  const denied = createHarness(["cargo-order:read"]);
  await assert.rejects(
    denied.service.create(denied.principal, denied.validInput, denied.request("cargo-order:create")),
    { code: "FORBIDDEN", status: 403 },
  );

  const scoped = createHarness();
  await assert.rejects(
    scoped.service.create(
      scoped.principal,
      { ...scoped.validInput, owningBranchId: "30000000-0000-7000-8000-999999999999" },
      scoped.request("cargo-order:create"),
    ),
    { code: "NOT_FOUND", status: 404 },
  );
});

test("single-order read enforces permission and branch scope", async () => {
  const harness = createHarness();
  const created = await harness.service.create(
    harness.principal,
    harness.validInput,
    harness.request("cargo-order:create", "read-create-key"),
  );
  const loaded = await harness.service.get(harness.principal, {
    organizationId: harness.principal.organizationId,
    orderId: created.order.id,
  });
  assert.equal(loaded.id, created.order.id);

  await assert.rejects(
    harness.service.get({
      ...harness.principal,
      permissionScopes: { ...harness.principal.permissionScopes, "cargo-order:read": [] },
    }, {
      organizationId: harness.principal.organizationId,
      orderId: created.order.id,
    }),
    { code: "NOT_FOUND", status: 404 },
  );
});

test("transition enforces workflow, optimistic version and immutable evidence", async () => {
  const harness = createHarness();
  const created = await harness.service.create(
    harness.principal,
    harness.validInput,
    harness.request("cargo-order:create", "create-key"),
  );
  harness.setClock("2026-08-21T01:05:00.000Z");
  const transitioned = await harness.service.transition(
    harness.principal,
    {
      organizationId: harness.principal.organizationId,
      orderId: created.order.id,
      expectedVersion: 1,
      toStatus: "confirmed",
      reasonCode: "CUSTOMER_CONFIRMED",
    },
    harness.request("cargo-order:transition", "transition-key"),
  );

  assert.equal(transitioned.order.status, "confirmed");
  assert.equal(transitioned.order.version, 2);
  assert.equal(harness.repository.events.length, 2);
  assert.equal(harness.repository.auditEvents.length, 2);
  assert.equal(harness.repository.outboxMessages.length, 2);

  await assert.rejects(
    harness.service.transition(
      harness.principal,
      {
        organizationId: harness.principal.organizationId,
        orderId: created.order.id,
        expectedVersion: 1,
        toStatus: "received",
        reasonCode: "STALE_OPERATOR_VIEW",
      },
      harness.request("cargo-order:transition", "stale-key"),
    ),
    { code: "VERSION_MISMATCH", status: 412 },
  );

  await assert.rejects(
    harness.service.transition(
      harness.principal,
      {
        organizationId: harness.principal.organizationId,
        orderId: created.order.id,
        expectedVersion: 2,
        toStatus: "delivered",
        reasonCode: "SKIP_WORKFLOW",
      },
      harness.request("cargo-order:transition", "invalid-key"),
    ),
    { code: "INVALID_TRANSITION", status: 422 },
  );
});

test("transition replay succeeds after aggregate state has advanced", async () => {
  const harness = createHarness();
  const created = await harness.service.create(
    harness.principal,
    harness.validInput,
    harness.request("cargo-order:create", "create-replay", "create-payload"),
  );
  const transitionRequest = harness.request("cargo-order:transition", "transition-replay", "transition-payload");
  const first = await harness.service.transition(
    harness.principal,
    {
      organizationId: harness.principal.organizationId,
      orderId: created.order.id,
      expectedVersion: 1,
      toStatus: "confirmed",
      reasonCode: "CUSTOMER_CONFIRMED",
    },
    transitionRequest,
  );
  const replay = await harness.service.transition(
    harness.principal,
    {
      organizationId: harness.principal.organizationId,
      orderId: created.order.id,
      expectedVersion: 1,
      toStatus: "confirmed",
      reasonCode: "CUSTOMER_CONFIRMED",
    },
    transitionRequest,
  );

  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal(replay.order.version, 2);
  assert.equal(harness.repository.events.length, 2);
});

test("exception resolution requires its dedicated permission", async () => {
  const harness = createHarness();
  const created = await harness.service.create(
    harness.principal,
    harness.validInput,
    harness.request("cargo-order:create", "create-key"),
  );
  const confirmed = await harness.service.transition(
    harness.principal,
    {
      organizationId: harness.principal.organizationId,
      orderId: created.order.id,
      expectedVersion: 1,
      toStatus: "confirmed",
      reasonCode: "CUSTOMER_CONFIRMED",
    },
    harness.request("cargo-order:transition", "confirm-key"),
  );
  const exception = await harness.service.transition(
    harness.principal,
    {
      organizationId: harness.principal.organizationId,
      orderId: created.order.id,
      expectedVersion: confirmed.order.version,
      toStatus: "exception",
      reasonCode: "ADDRESS_REVIEW_REQUIRED",
    },
    harness.request("cargo-order:transition", "exception-key"),
  );

  const restrictedPrincipal = {
    ...harness.principal,
    permissions: harness.principal.permissions.filter((permission) => permission !== "cargo-order:resolve-exception"),
    permissionScopes: Object.fromEntries(Object.entries(harness.principal.permissionScopes)
      .filter(([permission]) => permission !== "cargo-order:resolve-exception")),
  };
  await assert.rejects(
    harness.service.transition(
      restrictedPrincipal,
      {
        organizationId: harness.principal.organizationId,
        orderId: created.order.id,
        expectedVersion: exception.order.version,
        toStatus: "confirmed",
        reasonCode: "EXCEPTION_RESOLVED",
      },
      harness.request("cargo-order:transition", "resolve-key"),
    ),
    { code: "FORBIDDEN", status: 403 },
  );
});

test("an unrelated organization-wide role never widens a cargo branch grant", async () => {
  const harness = createHarness();
  const crossScopedPrincipal = {
    ...harness.principal,
    permissions: [...harness.principal.permissions, "dashboard:read"],
    permissionScopes: {
      ...harness.principal.permissionScopes,
      "dashboard:read": "*",
    },
  };

  await assert.rejects(
    harness.service.create(
      crossScopedPrincipal,
      { ...harness.validInput, owningBranchId: "30000000-0000-7000-8000-999999999999" },
      harness.request("cargo-order:create", "cross-scope-key"),
    ),
    { code: "NOT_FOUND", status: 404 },
  );
});
