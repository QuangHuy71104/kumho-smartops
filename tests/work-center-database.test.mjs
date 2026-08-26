import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "db/migrations/0007_role_work_center.sql";
const seedPath = "scripts/seed-work-center.mjs";
const roleIds = [
  "dispatcher",
  "cargo-agent",
  "ticket-agent",
  "contract-sales",
  "maintenance-technician",
  "finance-officer",
  "operations-manager",
  "auditor",
];

test("work center migration creates guarded role queues and timelines", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /^-- KSOps migration 0007:/);
  assert.match(sql, /\bBEGIN;/);
  assert.match(sql, /\bCOMMIT;\s*$/);
  for (const table of [
    "work_items",
    "work_item_comments",
    "work_item_events",
    "role_notifications",
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE public\\.${table}`));
    assert.match(sql, new RegExp(`'public\\.${table}'::regclass`));
  }

  assert.match(sql, /organization_id varchar\(24\) NOT NULL REFERENCES public\.organizations\(id\)/);
  assert.match(sql, /work_item_id varchar\(32\) NOT NULL REFERENCES public\.work_items\(id\) ON DELETE CASCADE/g);
  assert.match(sql, /version bigint NOT NULL DEFAULT 1 CHECK \(version > 0\)/);
  assert.match(sql, /octet_length\(description\) <= 4000/);
  assert.match(sql, /octet_length\(body\) <= 4000/);
  assert.match(sql, /GENERATED ALWAYS AS IDENTITY PRIMARY KEY/g);

  for (const value of [
    "cargo", "dispatch", "passenger", "contract", "maintenance", "billing", "reporting", "audit",
    "standard", "approval", "low", "normal", "high", "urgent",
    "new", "claimed", "in_progress", "waiting_approval", "waiting_evidence", "completed", "rejected",
    ...roleIds,
  ]) {
    assert.ok(sql.includes(`'${value}'`), `migration is missing ${value}`);
  }

  assert.match(sql, /work_items_role_queue_idx/);
  assert.match(sql, /work_items_resource_idx/);
  assert.match(sql, /work_item_events_timeline_idx/);
  assert.match(sql, /role_notifications_unread_idx/);
  assert.match(sql, /ALTER TABLE %s ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /ALTER TABLE %s FORCE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON TABLE %s FROM PUBLIC/);
  assert.match(sql, /rolname = 'anon'/);
  assert.match(sql, /rolname = 'authenticated'/);
  assert.doesNotMatch(sql, /CREATE POLICY[\s\S]+USING \(true\)/i);
});

test("work center permissions extend the IAM vocabulary without granting a role", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const permission of [
    "work-item:read",
    "work-item:update",
    "work-item:approve",
    "work-item:audit",
  ]) {
    assert.ok(sql.includes(`'${permission}'`), `migration is missing ${permission}`);
  }
  assert.match(sql, /INSERT INTO iam\.permission \(key, module, description\)/);
  assert.match(sql, /ON CONFLICT \(key\) DO UPDATE SET/);
  assert.doesNotMatch(sql, /INSERT INTO iam\.role_permission/);
});

test("work center seed provides three realistic work items for every role", async () => {
  const seed = await readFile(seedPath, "utf8");

  const itemIds = seed.match(/id: "WI-[A-Z]{3}-\d{3}"/g) ?? [];
  assert.equal(itemIds.length, 24);
  assert.equal(new Set(itemIds).size, 24);
  for (const role of roleIds) {
    const count = (seed.match(new RegExp(`assignedRole: "${role}"`, "g")) ?? []).length;
    assert.equal(count, 3, `${role} must own exactly three work items`);
  }

  for (const route of [
    "/don-hang", "/dieu-phoi", "/ve-xe", "/hop-dong",
    "/bao-duong", "/tai-chinh", "/bao-cao",
  ]) {
    assert.ok(seed.includes(`routePath: "${route}"`), `seed is missing ${route}`);
  }
  for (const resource of [
    "DH-260823-2408", "DP-HH-118", "TRP-D2301", "HĐ-26-1034",
    "BD-2608-034", "INV-2608-017", "30 ngày",
  ]) {
    assert.ok(seed.includes(resource), `seed is missing linked resource ${resource}`);
  }

  assert.doesNotMatch(seed, /\b(?:demo|synthetic)\b|mô phỏng/iu);
  assert.match(seed, /existsSync\("\.env\.local"\)/);
  assert.match(seed, /process\.loadEnvFile\("\.env\.local"\)/);
  assert.match(seed, /process\.env\.SUPABASE_DB_CA/);
  assert.match(seed, /ON CONFLICT \(id\) DO NOTHING/);
  assert.ok((seed.match(/ON CONFLICT DO NOTHING/g) ?? []).length >= 2);
  assert.match(seed, /const initialEvents = \[/);
  assert.match(seed, /const initialNotifications = \[/);
});
