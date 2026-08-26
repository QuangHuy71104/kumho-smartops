import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  DEFAULT_DEMO_ROLE,
  DEMO_ROLE_IDS,
  DEMO_ROLES,
  PERMISSIONS,
  PORTAL_ROUTES,
  PORTAL_SECTIONS,
  accessiblePortalRoutes,
  decodeDemoRole,
  demoRoleCan,
  firstAccessiblePortalPath,
  portalRouteFor,
} from "../lib/access-control.ts";

const root = process.cwd();

const expectedPaths = [
  "/",
  "/cong-viec",
  "/don-hang",
  "/dieu-phoi",
  "/doi-xe",
  "/tai-xe",
  "/ve-xe",
  "/hop-dong",
  "/khach-hang",
  "/bao-duong",
  "/tai-chinh",
  "/bao-cao",
];

test("portal registry is complete, unique and permission-backed", () => {
  assert.equal(PORTAL_ROUTES.length, 12);
  assert.deepEqual(PORTAL_ROUTES.map((route) => route.path), expectedPaths);
  assert.equal(new Set(PORTAL_ROUTES.map((route) => route.path)).size, PORTAL_ROUTES.length);
  assert.equal(new Set(PORTAL_SECTIONS.map((section) => section.id)).size, PORTAL_SECTIONS.length);

  const permissionSet = new Set(PERMISSIONS);
  const sectionSet = new Set(PORTAL_SECTIONS.map((section) => section.id));
  for (const route of PORTAL_ROUTES) {
    assert.ok(permissionSet.has(route.viewPermission), `${route.path} has a known view permission`);
    assert.ok(sectionSet.has(route.section), `${route.path} has a known section`);
    if ("primaryActionPermission" in route) {
      assert.ok(permissionSet.has(route.primaryActionPermission));
    }
    assert.equal(portalRouteFor(route.path), route);
  }
});

test("all eight demo roles reference explicit known permissions", () => {
  assert.equal(DEMO_ROLE_IDS.length, 8);
  assert.equal(new Set(DEMO_ROLE_IDS).size, DEMO_ROLE_IDS.length);
  const permissionSet = new Set(PERMISSIONS);

  for (const roleId of DEMO_ROLE_IDS) {
    const role = DEMO_ROLES[roleId];
    assert.equal(role.id, roleId);
    assert.ok(role.label.length > 0);
    assert.ok(role.department.length > 0);
    assert.equal(new Set(role.permissions).size, role.permissions.length);
    for (const permission of role.permissions) {
      assert.ok(permissionSet.has(permission), `${roleId} references ${permission}`);
      assert.doesNotMatch(permission, /\*/);
    }
  }
});

test("role decoder is an allowlist and falls back safely at the provider boundary", () => {
  assert.equal(DEFAULT_DEMO_ROLE, "dispatcher");
  for (const roleId of DEMO_ROLE_IDS) assert.equal(decodeDemoRole(roleId), roleId);

  for (const invalid of [null, undefined, 0, true, {}, [], "admin", "__proto__", " dispatcher "]) {
    assert.equal(decodeDemoRole(invalid), null);
  }
});

test("role navigation matches the operating model", () => {
  const expectedByRole = {
    dispatcher: ["/", "/cong-viec", "/don-hang", "/dieu-phoi", "/doi-xe", "/tai-xe", "/ve-xe", "/hop-dong", "/bao-duong"],
    "cargo-agent": ["/", "/cong-viec", "/don-hang", "/dieu-phoi", "/khach-hang"],
    "ticket-agent": ["/", "/cong-viec", "/ve-xe", "/khach-hang"],
    "contract-sales": ["/", "/cong-viec", "/dieu-phoi", "/doi-xe", "/hop-dong", "/khach-hang"],
    "maintenance-technician": ["/", "/cong-viec", "/dieu-phoi", "/doi-xe", "/bao-duong"],
    "finance-officer": ["/", "/cong-viec", "/tai-chinh", "/bao-cao"],
    "operations-manager": expectedPaths,
    auditor: expectedPaths,
  };

  for (const roleId of DEMO_ROLE_IDS) {
    assert.deepEqual(
      accessiblePortalRoutes(roleId).map((route) => route.path),
      expectedByRole[roleId],
      `unexpected navigation for ${roleId}`,
    );
    assert.equal(firstAccessiblePortalPath(roleId), "/");
  }
});

test("separation of duties denies high-impact actions by default", () => {
  assert.equal(demoRoleCan("dispatcher", "dispatch:assign"), true);
  assert.equal(demoRoleCan("dispatcher", "invoice:record-payment"), false);
  assert.equal(demoRoleCan("finance-officer", "invoice:record-payment"), true);
  assert.equal(demoRoleCan("finance-officer", "dispatch:assign"), false);
  assert.equal(demoRoleCan("ticket-agent", "booking:create"), true);
  assert.equal(demoRoleCan("ticket-agent", "contract:create"), false);
  assert.equal(demoRoleCan("maintenance-technician", "maintenance:update-checklist"), true);
  assert.equal(demoRoleCan("maintenance-technician", "cargo-order:transition"), false);
  assert.equal(demoRoleCan("operations-manager", "work-item:approve"), true);
  assert.equal(demoRoleCan("auditor", "work-item:audit"), true);
  assert.equal(demoRoleCan("auditor", "work-item:update"), false);

  const auditorMutationPermissions = [
    "cargo-order:create",
    "cargo-order:transition",
    "dispatch:assign",
    "booking:create",
    "booking:cancel",
    "contract:create",
    "contract:transition",
    "maintenance:update-checklist",
    "invoice:record-payment",
  ];
  for (const permission of auditorMutationPermissions) {
    assert.equal(demoRoleCan("auditor", permission), false, `auditor must not have ${permission}`);
  }
});

test("every portal route is visible to at least one role", () => {
  for (const route of PORTAL_ROUTES) {
    assert.ok(
      DEMO_ROLE_IDS.some((roleId) => demoRoleCan(roleId, route.viewPermission)),
      `${route.path} has no role with view access`,
    );
  }
});

test("business mutation clients enforce demo permissions in handlers and controls", async () => {
  const clients = [
    ["app/don-hang/_components/OrderWorkspace.tsx", ["cargo-order:create", "cargo-order:transition", "cargo-order:resolve-exception"]],
    ["app/dieu-phoi/_components/DispatchBoard.tsx", ["dispatch:assign", "dispatch:auto-assign"]],
    ["app/ve-xe/_components/TicketBookingClient.tsx", ["booking:create", "booking:cancel"]],
    ["app/hop-dong/_components/ContractPipelineClient.tsx", ["contract:create", "contract:transition"]],
    ["app/bao-duong/_components/MaintenanceDashboard.tsx", ["maintenance:update-checklist"]],
    ["app/tai-chinh/FinanceDashboard.tsx", ["invoice:record-payment"]],
    ["app/bao-cao/ReportsDashboard.tsx", ["report:export"]],
  ];

  for (const [path, permissions] of clients) {
    const source = await readFile(join(root, path), "utf8");
    assert.match(source, /useDemoAccess\(\)/, `${path} must consume the access context`);
    assert.match(source, /if\s*\(!can/, `${path} must guard its mutation handler`);
    assert.match(source, /disabled=\{[^}]*!can/, `${path} must disable unauthorized mutation controls`);
    for (const permission of permissions) {
      assert.ok(source.includes(`"${permission}"`), `${path} must enforce ${permission}`);
    }
  }
});
