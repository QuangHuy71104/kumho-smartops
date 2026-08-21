import assert from "node:assert/strict";
import test from "node:test";
import {
  cargoOrderEtag,
  parseCargoOrderListQuery,
  parseCreateCargoOrderBody,
  parseTransitionCargoOrderBody,
  presentCargoOrder,
  requireCargoOrderVersion,
  requireCargoOrderId,
  requireIdempotencyKey,
} from "../modules/cargo/presentation/http-contract.ts";

const validCreateBody = {
  owningBranchId: "30000000-0000-7000-8000-000000000001",
  serviceLevel: "same_day",
  originLocationId: "40000000-0000-7000-8000-000000000001",
  destinationLocationId: "40000000-0000-7000-8000-000000000002",
  packageCount: 3,
  totalWeightGrams: 12_500,
  declaredValueMinor: 24_000_000,
  currency: "VND",
  slaDueAt: "2026-08-21T10:00:00.000+07:00",
};

test("cargo HTTP contract accepts bounded production payload", () => {
  assert.deepEqual(parseCreateCargoOrderBody(validCreateBody), validCreateBody);
  assert.deepEqual(parseTransitionCargoOrderBody({
    toStatus: "confirmed",
    reasonCode: "CUSTOMER_CONFIRMED",
  }), {
    toStatus: "confirmed",
    reasonCode: "CUSTOMER_CONFIRMED",
  });
});

test("cargo HTTP contract rejects unknown fields and invalid locations", () => {
  assert.throws(
    () => parseCreateCargoOrderBody({ ...validCreateBody, organizationId: "client-controlled", extra: true }),
    { code: "VALIDATION_FAILED", status: 422 },
  );
  assert.throws(
    () => parseCreateCargoOrderBody({ ...validCreateBody, owningBranchId: "not-a-uuid" }),
    { code: "VALIDATION_FAILED", status: 422 },
  );
});

test("idempotency keys and optimistic ETags are strict", () => {
  assert.equal(requireIdempotencyKey("operation.0123456789"), "operation.0123456789");
  assert.throws(() => requireIdempotencyKey("short"), { code: "BAD_REQUEST", status: 400 });
  assert.throws(() => requireIdempotencyKey("unsafe key with spaces"), { code: "BAD_REQUEST", status: 400 });
  assert.equal(cargoOrderEtag(7), '"cargo-order-v7"');
  assert.equal(requireCargoOrderVersion('"cargo-order-v7"'), 7);
  assert.throws(() => requireCargoOrderVersion(null), { code: "PRECONDITION_REQUIRED", status: 428 });
  assert.throws(() => requireCargoOrderVersion("7"), { code: "BAD_REQUEST", status: 400 });
});

test("list query and resource identifiers reject ambiguous input", () => {
  assert.deepEqual(
    parseCargoOrderListQuery("https://ksops.invalid/api/v1/cargo-orders?status=draft&status=confirmed&limit=25"),
    { statuses: ["draft", "confirmed"], limit: 25 },
  );
  assert.equal(
    requireCargoOrderId("50000000-0000-7000-8000-000000000001"),
    "50000000-0000-7000-8000-000000000001",
  );
  assert.throws(
    () => parseCargoOrderListQuery("https://ksops.invalid/api/v1/cargo-orders?organizationId=other"),
    { code: "BAD_REQUEST", status: 400 },
  );
  assert.throws(() => requireCargoOrderId("CARGO-DEMO-1"), { code: "BAD_REQUEST", status: 400 });
});

test("public presenter excludes actor and organization identifiers", () => {
  const presented = presentCargoOrder({
    id: "50000000-0000-7000-8000-000000000001",
    organizationId: "20000000-0000-7000-8000-000000000001",
    owningBranchId: validCreateBody.owningBranchId,
    publicCode: "CGO-20260821-0001",
    serviceLevel: "same_day",
    status: "draft",
    originLocationId: validCreateBody.originLocationId,
    destinationLocationId: validCreateBody.destinationLocationId,
    packageCount: 3,
    totalWeightGrams: 12_500,
    declaredValueMinor: 24_000_000,
    currency: "VND",
    slaDueAt: validCreateBody.slaDueAt,
    version: 1,
    createdBy: "10000000-0000-7000-8000-000000000001",
    createdAt: "2026-08-21T01:00:00.000Z",
    updatedAt: "2026-08-21T01:00:00.000Z",
  });
  assert.equal("organizationId" in presented, false);
  assert.equal("createdBy" in presented, false);
});
