import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { PostgresInternalPrincipalDirectory } from "../lib/server/auth/postgres-directory-core.ts";
import { verifyPilotDatabaseReadiness } from "../lib/server/db/readiness-core.ts";
import { CargoOrderService } from "../modules/cargo/application/cargo-order-service.ts";
import { PostgresCargoOrderRepository } from "../modules/cargo/infrastructure/postgres-cargo-order-repository.ts";

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required for the PostgreSQL integration suite.");
}

const { Pool } = pg;

const SYNTHETIC = Object.freeze({
  organizationId: "0191a000-0000-7000-8000-000000000001",
  branchId: "0191a000-0000-7000-8000-000000000101",
  originLocationId: "0191a000-0000-7000-8000-000000000201",
  destinationLocationId: "0191a000-0000-7000-8000-000000000202",
  principalId: "0191a000-0000-7000-8000-000000000301",
});

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("migrated PostgreSQL satisfies strict pilot readiness checks", async () => {
  const pool = new Pool({ connectionString: testDatabaseUrl, max: 1 });
  try {
    await verifyPilotDatabaseReadiness(pool, SYNTHETIC.organizationId);
  } finally {
    await pool.end();
  }
});

function uuidV7() {
  const bytes = randomBytes(16);
  const timestamp = BigInt(Date.now());

  for (let index = 0; index < 6; index += 1) {
    const shift = BigInt((5 - index) * 8);
    bytes[index] = Number((timestamp >> shift) & 0xffn);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function idempotency(operation, key, payload) {
  return {
    operation,
    keyHash: sha256(`ksops-ci-key:${key}`),
    requestHash: sha256(`ksops-ci-payload:${JSON.stringify(payload)}`),
  };
}

test("PostgreSQL principal directory resolves only active internal grants under RLS", async () => {
  const pool = new Pool({ connectionString: testDatabaseUrl, max: 2 });
  const transactions = {
    async run(work) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await work({
          async query(text, values) {
            const queryResult = await client.query(text, [...values]);
            return { rows: queryResult.rows };
          },
        });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
  const issuer = "https://synthetic-oidc-provider.invalid/";
  const directory = new PostgresInternalPrincipalDirectory({
    organizationId: SYNTHETIC.organizationId,
    identityProvider: "synthetic-oidc-provider.invalid",
    issuer,
    transactions,
  });

  try {
    const principal = await directory.findActiveByAuth0Subject({
      organizationId: SYNTHETIC.organizationId,
      issuer,
      subjectHash: "11".repeat(32),
    });
    assert.equal(principal?.actorId, SYNTHETIC.principalId);
    assert.ok(principal?.permissions.includes("cargo-order:create"));
    assert.ok(principal?.permissions.includes("cargo-order:transition"));
    assert.deepEqual(principal?.scopes, [{ kind: "branch", ids: [SYNTHETIC.branchId] }]);
    assert.ok(principal?.permissionScopes.every((grant) => (
      grant.kind === "branch" && grant.ids[0] === SYNTHETIC.branchId
    )));
  } finally {
    await pool.end();
  }
});

function createReadBarrierRepository(repository, expectedReaders) {
  let readerCount = 0;
  let releaseReaders;
  const allReadersReady = new Promise((resolve) => {
    releaseReaders = resolve;
  });

  async function waitForReaders() {
    let timeoutId;
    try {
      await Promise.race([
        allReadersReady,
        new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error("Timed out waiting for concurrent version reads.")),
            5_000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    list: (query) => repository.list(query),
    async getById(...args) {
      const order = await repository.getById(...args);
      readerCount += 1;
      if (readerCount === expectedReaders) releaseReaders();
      await waitForReaders();
      return order;
    },
    findIdempotentResult: (input) => repository.findIdempotentResult(input),
    create: (transaction) => repository.create(transaction),
    transition: (transaction) => repository.transition(transaction),
  };
}

async function readEvidence(pool, orderId, keyHashes) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query(
      "SELECT set_config('app.organization_id', $1, true), set_config('app.principal_id', $2, true)",
      [SYNTHETIC.organizationId, SYNTHETIC.principalId],
    );

    const context = await client.query(
      "SELECT iam.current_organization_id()::text AS organization_id, iam.current_principal_id()::text AS principal_id",
    );
    assert.deepEqual(context.rows[0], {
      organization_id: SYNTHETIC.organizationId,
      principal_id: SYNTHETIC.principalId,
    });

    const orders = await client.query(
      `SELECT id, status, version::integer
         FROM cargo.cargo_order
        WHERE organization_id = $1 AND id = $2`,
      [SYNTHETIC.organizationId, orderId],
    );
    const events = await client.query(
      `SELECT id, aggregate_version::integer, from_status, to_status, reason_code
         FROM cargo.cargo_order_event
        WHERE organization_id = $1 AND cargo_order_id = $2
        ORDER BY aggregate_version`,
      [SYNTHETIC.organizationId, orderId],
    );
    const audits = await client.query(
      `SELECT id, action, request_id
         FROM audit.audit_event
        WHERE organization_id = $1 AND resource_type = 'cargo_order' AND resource_id = $2
        ORDER BY occurred_at, id`,
      [SYNTHETIC.organizationId, orderId],
    );
    const outbox = await client.query(
      `SELECT id, aggregate_version::integer, event_type, payload
         FROM platform.outbox_message
        WHERE organization_id = $1 AND aggregate_type = 'cargo_order' AND aggregate_id = $2
        ORDER BY aggregate_version`,
      [SYNTHETIC.organizationId, orderId],
    );
    const idempotencyRows = await client.query(
      `SELECT encode(key_hmac, 'hex') AS key_hash, state, resource_id
         FROM platform.idempotency_key
        WHERE organization_id = $1 AND principal_id = $2
          AND encode(key_hmac, 'hex') = ANY($3::text[])
        ORDER BY key_hash`,
      [SYNTHETIC.organizationId, SYNTHETIC.principalId, keyHashes],
    );

    await client.query("COMMIT");
    return {
      orders: orders.rows,
      events: events.rows,
      audits: audits.rows,
      outbox: outbox.rows,
      idempotency: idempotencyRows.rows,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

test("CargoOrderService persists atomic evidence, idempotency, and optimistic conflicts in PostgreSQL", { timeout: 30_000 }, async () => {
  for (const fixedId of Object.values(SYNTHETIC)) {
    assert.match(fixedId, UUID_V7_PATTERN);
  }

  const pool = new Pool({
    connectionString: testDatabaseUrl,
    max: 8,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 5_000,
  });
  const runId = uuidV7();
  const runLabel = runId.replaceAll("-", "").slice(-16).toUpperCase();
  let publicCodeSequence = 0;
  const repository = new PostgresCargoOrderRepository(pool, uuidV7);
  const serviceDependencies = {
    repository,
    now: () => new Date(),
    generateId: uuidV7,
    generatePublicCode: () => `CI-CGO-${runLabel}-${++publicCodeSequence}`,
  };
  const service = new CargoOrderService(serviceDependencies);
  const principal = {
    id: SYNTHETIC.principalId,
    organizationId: SYNTHETIC.organizationId,
    permissions: [
      "cargo-order:read",
      "cargo-order:create",
      "cargo-order:transition",
      "cargo-order:resolve-exception",
    ],
    permissionScopes: {
      "cargo-order:read": [SYNTHETIC.branchId],
      "cargo-order:create": [SYNTHETIC.branchId],
      "cargo-order:transition": [SYNTHETIC.branchId],
      "cargo-order:resolve-exception": [SYNTHETIC.branchId],
    },
    authenticationMethod: "test",
  };
  const createInput = {
    organizationId: SYNTHETIC.organizationId,
    owningBranchId: SYNTHETIC.branchId,
    serviceLevel: "express",
    originLocationId: SYNTHETIC.originLocationId,
    destinationLocationId: SYNTHETIC.destinationLocationId,
    packageCount: 4,
    totalWeightGrams: 87_500,
    declaredValueMinor: 3_200_000,
    currency: "VND",
    slaDueAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
  const createContext = idempotency("cargo-order:create", `${runId}:create`, createInput);
  const createRequest = {
    requestId: `req_ci_${runLabel}_create`,
    idempotency: createContext,
  };

  try {
    await pool.query("SELECT 1");

    const created = await service.create(principal, createInput, createRequest);
    assert.equal(created.replayed, false);
    assert.equal(created.order.status, "draft");
    assert.equal(created.order.version, 1);
    assert.match(created.order.id, UUID_V7_PATTERN);

    const afterCreate = await readEvidence(pool, created.order.id, [createContext.keyHash]);
    assert.equal(afterCreate.orders.length, 1);
    assert.equal(afterCreate.events.length, 1);
    assert.equal(afterCreate.audits.length, 1);
    assert.equal(afterCreate.outbox.length, 1);
    assert.equal(afterCreate.idempotency.length, 1);
    assert.deepEqual(
      {
        version: afterCreate.events[0].aggregate_version,
        from: afterCreate.events[0].from_status,
        to: afterCreate.events[0].to_status,
        reason: afterCreate.events[0].reason_code,
      },
      { version: 1, from: null, to: "draft", reason: "ORDER_CREATED" },
    );
    assert.equal(afterCreate.audits[0].action, "cargo.order.created");
    assert.equal(afterCreate.audits[0].request_id, createRequest.requestId);
    assert.equal(afterCreate.outbox[0].event_type, "cargo.order.created");
    assert.equal(afterCreate.idempotency[0].state, "completed");
    assert.equal(afterCreate.idempotency[0].resource_id, created.order.id);
    for (const evidenceId of [
      afterCreate.events[0].id,
      afterCreate.audits[0].id,
      afterCreate.outbox[0].id,
    ]) {
      assert.match(evidenceId, UUID_V7_PATTERN);
    }
    assert.doesNotMatch(JSON.stringify(afterCreate.outbox), /phone|email|address|token|secret/i);

    const replay = await service.create(principal, createInput, {
      requestId: `req_ci_${runLabel}_replay`,
      idempotency: createContext,
    });
    assert.equal(replay.replayed, true);
    assert.equal(replay.order.id, created.order.id);

    const afterReplay = await readEvidence(pool, created.order.id, [createContext.keyHash]);
    assert.deepEqual(
      {
        orders: afterReplay.orders.length,
        events: afterReplay.events.length,
        audits: afterReplay.audits.length,
        outbox: afterReplay.outbox.length,
        idempotency: afterReplay.idempotency.length,
      },
      { orders: 1, events: 1, audits: 1, outbox: 1, idempotency: 1 },
    );

    const changedInput = { ...createInput, packageCount: createInput.packageCount + 1 };
    await assert.rejects(
      service.create(principal, changedInput, {
        requestId: `req_ci_${runLabel}_conflict`,
        idempotency: idempotency("cargo-order:create", `${runId}:create`, changedInput),
      }),
      { code: "IDEMPOTENCY_CONFLICT", status: 409 },
    );
    const afterConflict = await readEvidence(pool, created.order.id, [createContext.keyHash]);
    assert.deepEqual(
      {
        orders: afterConflict.orders.length,
        events: afterConflict.events.length,
        audits: afterConflict.audits.length,
        outbox: afterConflict.outbox.length,
        idempotency: afterConflict.idempotency.length,
      },
      { orders: 1, events: 1, audits: 1, outbox: 1, idempotency: 1 },
    );

    const transitionCases = [
      {
        toStatus: "confirmed",
        reasonCode: "CI_CUSTOMER_CONFIRMED",
        context: idempotency("cargo-order:transition", `${runId}:confirm`, { toStatus: "confirmed" }),
      },
      {
        toStatus: "quoted",
        reasonCode: "CI_QUOTE_READY",
        context: idempotency("cargo-order:transition", `${runId}:quote`, { toStatus: "quoted" }),
      },
    ];
    const concurrentService = new CargoOrderService({
      ...serviceDependencies,
      repository: createReadBarrierRepository(repository, transitionCases.length),
    });
    const attempts = await Promise.allSettled(
      transitionCases.map((transitionCase, index) => concurrentService.transition(
        principal,
        {
          organizationId: SYNTHETIC.organizationId,
          orderId: created.order.id,
          expectedVersion: 1,
          toStatus: transitionCase.toStatus,
          reasonCode: transitionCase.reasonCode,
        },
        {
          requestId: `req_ci_${runLabel}_transition_${index + 1}`,
          idempotency: transitionCase.context,
        },
      )),
    );
    const successes = attempts.filter((attempt) => attempt.status === "fulfilled");
    const failures = attempts.filter((attempt) => attempt.status === "rejected");

    assert.equal(successes.length, 1);
    assert.equal(failures.length, 1);
    assert.equal(successes[0].value.replayed, false);
    assert.equal(successes[0].value.order.version, 2);
    assert.equal(failures[0].reason?.code, "VERSION_MISMATCH");
    assert.equal(failures[0].reason?.status, 412);

    const afterRace = await readEvidence(
      pool,
      created.order.id,
      [createContext.keyHash, ...transitionCases.map((item) => item.context.keyHash)],
    );
    assert.equal(afterRace.orders[0].version, 2);
    assert.equal(afterRace.orders[0].status, successes[0].value.order.status);
    assert.equal(afterRace.events.length, 2);
    assert.equal(afterRace.audits.length, 2);
    assert.equal(afterRace.outbox.length, 2);
    assert.equal(afterRace.idempotency.length, 2);
    assert.deepEqual(afterRace.events.map((event) => event.aggregate_version), [1, 2]);
    assert.deepEqual(afterRace.outbox.map((message) => message.aggregate_version), [1, 2]);
    assert.ok(afterRace.idempotency.every((record) => record.state === "completed"));
  } finally {
    await pool.end();
  }
});

test("expired idempotency keys can be reused without stale replay", { timeout: 15_000 }, async () => {
  const pool = new Pool({ connectionString: testDatabaseUrl, max: 3 });
  const runId = uuidV7();
  let publicCodeSequence = 0;
  const repository = new PostgresCargoOrderRepository(pool, uuidV7);
  const service = new CargoOrderService({
    repository,
    now: () => new Date(),
    generateId: uuidV7,
    generatePublicCode: () => `CI-EXP-${runId.slice(-8).toUpperCase()}-${++publicCodeSequence}`,
  });
  const permissions = [
    "cargo-order:read",
    "cargo-order:create",
    "cargo-order:transition",
    "cargo-order:resolve-exception",
  ];
  const principal = {
    id: SYNTHETIC.principalId,
    organizationId: SYNTHETIC.organizationId,
    permissions,
    permissionScopes: Object.fromEntries(
      permissions.map((permission) => [permission, [SYNTHETIC.branchId]]),
    ),
    authenticationMethod: "test",
  };
  const input = {
    organizationId: SYNTHETIC.organizationId,
    owningBranchId: SYNTHETIC.branchId,
    serviceLevel: "standard",
    originLocationId: SYNTHETIC.originLocationId,
    destinationLocationId: SYNTHETIC.destinationLocationId,
    packageCount: 1,
    totalWeightGrams: 2_500,
    declaredValueMinor: null,
    currency: "VND",
    slaDueAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
  const key = idempotency("cargo-order:create", `${runId}:expiry`, input);

  try {
    const first = await service.create(principal, input, {
      requestId: `req_${runId}_first`,
      idempotency: key,
    });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('app.organization_id', $1, true), set_config('app.principal_id', $2, true)",
        [SYNTHETIC.organizationId, SYNTHETIC.principalId],
      );
      await client.query(
        `UPDATE platform.idempotency_key
            SET created_at = statement_timestamp() - interval '48 hours',
                expires_at = statement_timestamp() - interval '24 hours'
          WHERE organization_id = $1 AND principal_id = $2
            AND operation = $3 AND key_hmac = decode($4, 'hex')`,
        [SYNTHETIC.organizationId, SYNTHETIC.principalId, key.operation, key.keyHash],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    const second = await service.create(principal, input, {
      requestId: `req_${runId}_second`,
      idempotency: key,
    });
    assert.equal(second.replayed, false);
    assert.notEqual(second.order.id, first.order.id);

    const evidence = await readEvidence(pool, second.order.id, [key.keyHash]);
    assert.equal(evidence.idempotency.length, 1);
    assert.equal(evidence.idempotency[0].resource_id, second.order.id);
  } finally {
    await pool.end();
  }
});
