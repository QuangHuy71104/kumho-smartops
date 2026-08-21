import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  EXPECTED_DATABASE_MIGRATIONS,
  verifyPilotDatabaseReadiness,
} from "../lib/server/db/readiness-core.ts";

function harness(overrides = {}) {
  const calls = [];
  let released = false;
  let rolledBack = false;
  const client = {
    async query(text, values = []) {
      calls.push({ text, values });
      if (text === "ROLLBACK") rolledBack = true;
      if (text.includes("FROM public.ksops_schema_migration")) {
        return {
          rows: overrides.migrations ?? EXPECTED_DATABASE_MIGRATIONS.map((migration) => ({
            filename: migration.filename,
            checksum: migration.checksum,
          })),
        };
      }
      if (text.includes("current_user AS runtime_role")) {
        return {
          rows: [{
            runtime_role: "ksops_runtime",
            iam_schema_usage: true,
            org_schema_usage: true,
            cargo_schema_usage: true,
            platform_schema_usage: true,
            audit_schema_usage: true,
            principal_read: true,
            grant_read: true,
            role_read: true,
            role_permission_read: true,
            access_scope_read: true,
            branch_read: true,
            location_read: true,
            order_access: overrides.orderAccess ?? true,
            event_access: true,
            idempotency_access: true,
            outbox_write: true,
            audit_write: true,
          }],
        };
      }
      if (text.includes("current_setting('app.organization_id'")) {
        return { rows: [{ organization_context: true, principal_context: true }] };
      }
      return { rows: [] };
    },
    release() { released = true; },
  };
  return {
    calls,
    pool: { async connect() { return client; } },
    get released() { return released; },
    get rolledBack() { return rolledBack; },
  };
}

const organizationId = "20000000-0000-7000-8000-000000000001";

test("readiness fingerprints exactly match the reviewed migration sources", async () => {
  for (const migration of EXPECTED_DATABASE_MIGRATIONS) {
    const source = await readFile(join(process.cwd(), "db", "migrations", migration.filename));
    assert.equal(createHash("sha256").update(source).digest("hex"), migration.checksum);
  }
});

test("pilot readiness verifies migrations, grants, tenant context and protected reads", async () => {
  const ready = harness();
  await verifyPilotDatabaseReadiness(ready.pool, organizationId);

  assert.equal(ready.released, true);
  assert.equal(ready.rolledBack, false);
  assert.match(ready.calls[0].text, /BEGIN READ ONLY/u);
  assert.ok(ready.calls.some((call) => /has_table_privilege/u.test(call.text)));
  assert.ok(ready.calls.some((call) => /set_config\('app\.organization_id'/u.test(call.text)));
  assert.ok(ready.calls.some((call) => /FROM iam\.principal/u.test(call.text)));
  assert.ok(ready.calls.some((call) => /FROM cargo\.cargo_order/u.test(call.text)));
  assert.equal(ready.calls.at(-1).text, "COMMIT");
});

test("pilot readiness fails closed for migration drift", async () => {
  const drifted = harness({ migrations: EXPECTED_DATABASE_MIGRATIONS.slice(0, -1) });
  await assert.rejects(
    verifyPilotDatabaseReadiness(drifted.pool, organizationId),
    /migration set mismatch/u,
  );
  assert.equal(drifted.rolledBack, true);
  assert.equal(drifted.released, true);
});

test("pilot readiness fails closed when runtime privileges are incomplete", async () => {
  const underPrivileged = harness({ orderAccess: false });
  await assert.rejects(
    verifyPilotDatabaseReadiness(underPrivileged.pool, organizationId),
    /grants incomplete/u,
  );
  assert.equal(underPrivileged.rolledBack, true);
});
