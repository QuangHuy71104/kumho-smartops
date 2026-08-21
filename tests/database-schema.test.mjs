import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  auditEvents,
  cargoOrderContacts,
  cargoOrderEvents,
  cargoOrders,
  cargoPackages,
  drivers,
  idempotencyKeys,
  locations,
  organizations,
  outboxMessages,
  principals,
  vehicles,
} from "../db/schema.ts";

const root = process.cwd();
const migrationRoot = join(root, "db", "migrations");
const seedPath = join(root, "db", "seeds", "dev", "001_synthetic_pilot.sql");
const runtimeGrantPath = join(root, "db", "admin", "grant_runtime_role.sql");

const expectedMigrations = [
  "0001_extensions_org_iam.sql",
  "0002_fleet_workforce.sql",
  "0003_cargo_dispatch.sql",
  "0004_platform_audit_reporting_rls.sql",
];

async function readMigration(name) {
  return readFile(join(migrationRoot, name), "utf8");
}

test("database migrations have a deterministic PostgreSQL transaction order", async () => {
  const migrations = (await readdir(migrationRoot)).filter((file) => file.endsWith(".sql")).sort();
  assert.deepEqual(migrations, expectedMigrations);

  for (const migration of migrations) {
    const sql = await readMigration(migration);
    assert.match(sql, /^-- KSOps migration \d{4}:/);
    assert.match(sql, /\bBEGIN;/);
    assert.match(sql, /\bCOMMIT;\s*$/);
    assert.doesNotMatch(sql, /DROP\s+(TABLE|SCHEMA|DATABASE)/i);
  }
});

test("organization and IAM tables enforce tenant-safe role scopes", async () => {
  const sql = await readMigration(expectedMigrations[0]);

  for (const schema of ["org", "iam", "iam_private"]) {
    assert.match(sql, new RegExp(`CREATE SCHEMA IF NOT EXISTS ${schema.replace("_", "_")}`));
  }

  assert.match(sql, /CREATE TABLE org\.organization/);
  assert.match(sql, /CREATE TABLE org\.branch/);
  assert.match(sql, /CREATE TABLE iam\.principal/);
  assert.match(sql, /CREATE TABLE iam\.role_permission/);
  assert.match(sql, /CREATE TABLE iam\.access_scope/);
  assert.match(sql, /CREATE TABLE iam\.principal_role_scope/);
  assert.match(sql, /UNIQUE \(organization_id, id\)/);
  assert.match(sql, /FOREIGN KEY \(organization_id, parent_branch_id\)[\s\S]*REFERENCES org\.branch\(organization_id, id\)/);
  assert.match(sql, /principal_role_scope_no_overlap[\s\S]*EXCLUDE USING gist[\s\S]*valid_during WITH &&/);
  assert.match(sql, /subject_hmac bytea NOT NULL CHECK \(octet_length\(subject_hmac\) = 32\)/);
  assert.doesNotMatch(sql, /\b(password|access_token|refresh_token)\b/i);
});

test("fleet, driver, cargo, and dispatch references cannot cross organizations", async () => {
  const [fleetSql, domainSql] = await Promise.all([
    readMigration(expectedMigrations[1]),
    readMigration(expectedMigrations[2]),
  ]);

  assert.match(fleetSql, /CREATE TABLE fleet\.vehicle/);
  assert.match(fleetSql, /CREATE TABLE workforce\.driver/);
  assert.match(fleetSql, /registration_ciphertext bytea NOT NULL/);
  assert.match(fleetSql, /license_number_ciphertext bytea NOT NULL/);
  assert.match(fleetSql, /FOREIGN KEY \(organization_id, home_branch_id\)[\s\S]*REFERENCES org\.branch\(organization_id, id\)/);

  assert.match(domainSql, /CREATE TABLE cargo\.cargo_order/);
  assert.match(domainSql, /CREATE TABLE cargo\.cargo_package/);
  assert.match(domainSql, /CREATE TABLE cargo\.cargo_order_event/);
  assert.match(domainSql, /FOREIGN KEY \(organization_id, cargo_order_id\)[\s\S]*REFERENCES cargo\.cargo_order\(organization_id, id\)/);
  assert.match(domainSql, /version bigint NOT NULL DEFAULT 1 CHECK \(version > 0\)/);
  assert.match(domainSql, /UNIQUE \(organization_id, cargo_order_id, aggregate_version\)/);
  assert.match(domainSql, /sender_contact_ciphertext bytea NOT NULL/);
  assert.match(domainSql, /receiver_contact_ciphertext bytea NOT NULL/);
});

test("dispatch has database-enforced vehicle and driver overlap protection", async () => {
  const [foundationSql, sql] = await Promise.all([
    readMigration(expectedMigrations[0]),
    readMigration(expectedMigrations[2]),
  ]);

  assert.match(foundationSql, /CREATE EXTENSION IF NOT EXISTS btree_gist/);
  assert.match(sql, /CONSTRAINT assignment_vehicle_no_overlap[\s\S]*vehicle_id WITH =[\s\S]*duty_period WITH &&/);
  assert.match(sql, /CONSTRAINT assignment_driver_no_overlap[\s\S]*driver_id WITH =[\s\S]*duty_period WITH &&/);
  assert.match(sql, /WHERE \(status IN \('proposed', 'confirmed', 'in_progress'\)\)/);
  assert.match(sql, /dispatch_assignment_one_active_task_idx/);
  assert.match(sql, /lower_inc\(duty_period\) AND NOT upper_inc\(duty_period\)/);
  assert.match(sql, /enforce_assignment_task_bounds/);
  assert.match(sql, /NEW\.duty_period <@ task_period/);
  assert.match(sql, /enforce_task_assignment_bounds/);
});

test("audit, idempotency, outbox, projections, and RLS include safety guards", async () => {
  const sql = await readMigration(expectedMigrations[3]);

  assert.match(sql, /UNIQUE \(organization_id, principal_id, operation, key_hmac\)/);
  assert.match(sql, /request_hash bytea NOT NULL CHECK \(octet_length\(request_hash\) = 32\)/);
  assert.match(sql, /safe_response IS NULL OR octet_length\(safe_response::text\) <= 32768/);
  assert.match(sql, /CREATE TABLE platform\.outbox_message/);
  assert.match(sql, /aggregate_version,[\s\S]*event_type[\s\S]*\),/);
  assert.match(sql, /CREATE TRIGGER audit_event_immutable[\s\S]*BEFORE UPDATE OR DELETE/);
  assert.match(sql, /CREATE TRIGGER cargo_order_event_immutable[\s\S]*BEFORE UPDATE OR DELETE/);
  assert.match(sql, /REVOKE UPDATE, DELETE ON audit\.audit_event FROM PUBLIC/);

  assert.match(sql, /CREATE TABLE reporting\.ops_work_item/);
  assert.match(sql, /source_version bigint NOT NULL CHECK \(source_version > 0\)/);
  assert.match(sql, /projected_at timestamptz NOT NULL DEFAULT now\(\)/);
  assert.doesNotMatch(
    sql.slice(sql.indexOf("CREATE TABLE reporting.ops_work_item"), sql.indexOf("CREATE TABLE reporting.ops_metric_bucket")),
    /ciphertext|phone|email|address/i,
  );

  assert.match(sql, /current_setting\('app\.organization_id', true\)/);
  assert.match(sql, /current_setting\('app\.principal_id', true\)/);
  assert.match(sql, /ALTER TABLE org\.organization FORCE ROW LEVEL SECURITY/);
  assert.match(sql, /CREATE POLICY tenant_isolation ON org\.organization/);
  assert.match(sql, /FOREACH target_table IN ARRAY/);
  for (const table of [
    "'cargo.cargo_order'::regclass",
    "'dispatch.dispatch_assignment'::regclass",
    "'audit.audit_event'::regclass",
    "'cargo_private.order_contact'::regclass",
  ]) {
    assert.ok(sql.includes(table), `RLS closed list is missing ${table}`);
  }
});

test("Drizzle runtime mappings retain migration schema and table names", () => {
  const expectedTables = new Map([
    [organizations, ["org", "organization"]],
    [locations, ["org", "location"]],
    [principals, ["iam", "principal"]],
    [vehicles, ["fleet", "vehicle"]],
    [drivers, ["workforce", "driver"]],
    [cargoOrders, ["cargo", "cargo_order"]],
    [cargoPackages, ["cargo", "cargo_package"]],
    [cargoOrderContacts, ["cargo_private", "order_contact"]],
    [cargoOrderEvents, ["cargo", "cargo_order_event"]],
    [auditEvents, ["audit", "audit_event"]],
    [idempotencyKeys, ["platform", "idempotency_key"]],
    [outboxMessages, ["platform", "outbox_message"]],
  ]);

  for (const [table, [schema, name]] of expectedTables) {
    const config = getTableConfig(table);
    assert.equal(config.schema, schema);
    assert.equal(config.name, name);
    if (name !== "organization") {
      assert.ok(config.columns.some((column) => column.name === "organization_id"));
    }
  }

  const cargoConfig = getTableConfig(cargoOrders);
  for (const column of ["public_code", "status", "version", "sla_due_at"]) {
    assert.ok(cargoConfig.columns.some((candidate) => candidate.name === column));
  }
});

test("development seed is deterministic, synthetic-only, and dual guarded", async () => {
  const seed = await readFile(seedPath, "utf8");

  assert.match(seed, /SYNTHETIC DEVELOPMENT DATA ONLY/);
  assert.match(seed, /current_setting\('ksops\.environment', true\) IS DISTINCT FROM 'development'/);
  assert.match(seed, /current_setting\('ksops\.allow_synthetic_seed', true\) IS DISTINCT FROM 'yes'/);
  assert.match(seed, /RAISE EXCEPTION 'synthetic seed refused/);
  assert.match(seed, /SELECT set_config\('app\.organization_id'/);
  assert.match(seed, /SELECT set_config\('app\.principal_id'/);
  assert.ok((seed.match(/ON CONFLICT DO NOTHING/g) ?? []).length >= 15);
  assert.doesNotMatch(seed, /\b(?:0?\d{9,10})\b/);
  assert.doesNotMatch(seed, /\b(?:password|secret|access[_-]?token|refresh[_-]?token)\b/i);
  assert.doesNotMatch(seed, /(?:\d{1,3}\.){3}\d{1,3}/);
});

test("runtime database role is granted only the pilot's reviewed privileges", async () => {
  const grants = await readFile(runtimeGrantPath, "utf8");

  assert.match(grants, /REVOKE ALL PRIVILEGES ON ALL TABLES/u);
  assert.match(grants, /GRANT SELECT ON TABLE public\.ksops_schema_migration/u);
  assert.match(grants, /GRANT INSERT, UPDATE ON TABLE cargo\.cargo_order/u);
  assert.match(grants, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE platform\.idempotency_key/u);
  assert.match(grants, /GRANT INSERT ON TABLE audit\.audit_event/u);
  assert.doesNotMatch(grants, /GRANT ALL|CREATEDB|CREATEROLE|SUPERUSER|PASSWORD/u);
});
