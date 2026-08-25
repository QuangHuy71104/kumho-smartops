import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CargoReferenceService } from "../modules/cargo/application/cargo-reference-service.ts";
import { PostgresCargoReferenceRepository } from "../modules/cargo/infrastructure/postgres-cargo-reference-repository.ts";
import {
  decodePilotOrdersEnvelope,
  decodePilotPrincipalEnvelope,
  decodePilotReferenceEnvelope,
  formatPilotMoney,
  pilotIdempotencyKey,
  pilotTransitionTargets,
} from "../app/don-hang/_lib/pilot-orders.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const IDS = Object.freeze({
  organization: "0191a000-0000-7000-8000-000000000001",
  principal: "0191a000-0000-7000-8000-000000000301",
  branch: "0191a000-0000-7000-8000-000000000101",
  origin: "0191a000-0000-7000-8000-000000000201",
  destination: "0191a000-0000-7000-8000-000000000202",
  order: "0191a000-0000-7000-8000-000000000801",
});

const principal = Object.freeze({
  id: IDS.principal,
  organizationId: IDS.organization,
  permissions: ["cargo-order:read", "cargo-order:create", "cargo-order:transition"],
  permissionScopes: {
    "cargo-order:read": [IDS.branch],
    "cargo-order:create": [IDS.branch],
    "cargo-order:transition": [IDS.branch],
  },
  authenticationMethod: "test",
});

const referenceData = Object.freeze({
  branches: [{ id: IDS.branch, code: "BRANCH_A", name: "Chi nhánh A", kind: "branch", timezone: "Asia/Ho_Chi_Minh" }],
  locations: [
    { id: IDS.origin, branchId: IDS.branch, publicCode: "ORIGIN_A", kind: "warehouse", displayName: "Kho A" },
    { id: IDS.destination, branchId: IDS.branch, publicCode: "DESTINATION_B", kind: "warehouse", displayName: "Kho B" },
  ],
});

const presentedOrder = Object.freeze({
  id: IDS.order,
  publicCode: "CGO-20260821-SYNTHETIC",
  owningBranchId: IDS.branch,
  serviceLevel: "express",
  status: "draft",
  originLocationId: IDS.origin,
  destinationLocationId: IDS.destination,
  packageCount: 2,
  totalWeightGrams: 12_500,
  declaredValueMinor: null,
  currency: "VND",
  slaDueAt: "2026-08-22T10:00:00.000Z",
  version: 1,
  createdAt: "2026-08-21T01:00:00.000Z",
  updatedAt: "2026-08-21T01:00:00.000Z",
});

test("cargo reference service derives branch scope from cargo-order:read", async () => {
  let receivedQuery;
  const service = new CargoReferenceService({
    async listActiveForPrincipal(query) {
      receivedQuery = query;
      return referenceData;
    },
  });

  const result = await service.list(principal);
  assert.equal(result, referenceData);
  assert.deepEqual(receivedQuery, {
    organizationId: IDS.organization,
    principalId: IDS.principal,
    branchIds: [IDS.branch],
  });

  await assert.rejects(
    service.list({
      ...principal,
      permissions: ["cargo-order:create"],
      permissionScopes: { "cargo-order:create": [IDS.branch] },
    }),
    { code: "FORBIDDEN", status: 403 },
  );
});

test("pilot client decoders accept only bounded production envelopes", () => {
  const decodedPrincipal = decodePilotPrincipalEnvelope({
    data: {
      ...principal,
      authenticationMethod: "oidc",
    },
  });
  assert.deepEqual(decodedPrincipal.permissionScopes["cargo-order:read"], [IDS.branch]);

  const decodedReferences = decodePilotReferenceEnvelope({ data: referenceData });
  assert.equal(decodedReferences.branches[0].id, IDS.branch);
  assert.equal(decodedReferences.locations.length, 2);
  assert.throws(
    () => decodePilotReferenceEnvelope({
      data: {
        ...referenceData,
        locations: [{ ...referenceData.locations[0], branchId: IDS.destination }],
      },
    }),
    /INVALID_REFERENCE_PAYLOAD/,
  );

  const decodedOrders = decodePilotOrdersEnvelope({ data: [presentedOrder] });
  assert.equal(decodedOrders[0].publicCode, presentedOrder.publicCode);
  assert.equal(decodedOrders[0].version, 1);
  assert.throws(
    () => decodePilotOrdersEnvelope({ data: [{ ...presentedOrder, declaredValueMinor: undefined }] }),
    /INVALID_ORDER_PAYLOAD/,
  );
  assert.throws(
    () => decodePilotPrincipalEnvelope({
      data: { ...principal, permissionScopes: {}, authenticationMethod: "oidc" },
    }),
    /INVALID_PRINCIPAL_PAYLOAD/,
  );

  assert.deepEqual(pilotTransitionTargets("draft"), ["quoted", "confirmed", "cancelled"]);
  const firstKey = pilotIdempotencyKey("create");
  const secondKey = pilotIdempotencyKey("create");
  assert.match(firstKey, /^ksops-ui:create:[0-9a-f-]{36}$/i);
  assert.notEqual(firstKey, secondKey);
  assert.match(formatPilotMoney(12_345, "VND"), /12\.345/u);
  assert.match(formatPilotMoney(12_345, "USD"), /123,45/u);
});

test("cargo reference scopes stay fail-closed for wildcard, empty, and returned branches", async () => {
  const captured = [];
  const wildcardService = new CargoReferenceService({
    async listActiveForPrincipal(query) {
      captured.push(query.branchIds);
      return { branches: [], locations: [] };
    },
  });
  await wildcardService.list({
    ...principal,
    permissionScopes: { ...principal.permissionScopes, "cargo-order:read": "*" },
  });
  await wildcardService.list({
    ...principal,
    permissionScopes: { ...principal.permissionScopes, "cargo-order:read": [] },
  });
  assert.deepEqual(captured, ["*", []]);

  const queries = [];
  let released = false;
  const client = {
    async query(sql, parameters) {
      queries.push({ sql, parameters });
      if (/FROM org\.branch/u.test(sql)) return { rows: [referenceData.branches[0]] };
      if (/FROM org\.location/u.test(sql)) return {
        rows: [{
          id: IDS.origin,
          branch_id: IDS.branch,
          public_code: "ORIGIN_A",
          kind: "warehouse",
          display_name: "Kho A",
        }],
      };
      return { rows: [] };
    },
    release() { released = true; },
  };
  const repository = new PostgresCargoReferenceRepository({
    async connect() { return client; },
  });
  const result = await repository.listActiveForPrincipal({
    organizationId: IDS.organization,
    principalId: IDS.principal,
    branchIds: "*",
  });
  const branchQuery = queries.find(({ sql }) => /FROM org\.branch/u.test(sql));
  const locationQuery = queries.find(({ sql }) => /FROM org\.location/u.test(sql));
  assert.deepEqual(branchQuery.parameters, [IDS.organization, null, 501]);
  assert.deepEqual(locationQuery.parameters, [IDS.organization, [IDS.branch], 2001]);
  assert.match(locationQuery.sql, /location\.branch_id = ANY\(\$2::uuid\[\]\)/u);
  assert.equal(result.locations[0].branchId, IDS.branch);
  assert.equal(released, true);
});

test("reference route authenticates and repository applies active RLS branch scope", async () => {
  const [route, service, repository] = await Promise.all([
    read("app/api/v1/reference-data/route.ts"),
    read("modules/cargo/application/cargo-reference-service.ts"),
    read("modules/cargo/infrastructure/postgres-cargo-reference-repository.ts"),
  ]);

  assert.match(route, /requireServerPrincipal\(request\)/);
  assert.match(route, /getCargoReferenceService\(\)\.list\(principal\)/);
  assert.match(route, /"cache-control": "no-store"/);
  assert.match(route, /vary: "Cookie"/);
  assert.doesNotMatch(route, /\bSELECT\b|\bFROM\b|\bJOIN\b/);

  assert.match(service, /scopeForPermission\(principal, "cargo-order:read"\)/);
  assert.match(repository, /BEGIN READ ONLY/);
  assert.match(repository, /set_config\('app\.organization_id', \$1, true\)/);
  assert.match(repository, /set_config\('app\.principal_id', \$2, true\)/);
  assert.match(repository, /status = 'active'/);
  assert.match(repository, /ANY\(\$2::uuid\[\]\)/);
  assert.match(repository, /JOIN org\.branch/);
  assert.doesNotMatch(repository, /iam_private|cargo_private|fleet_private|workforce_private/);
});

test("pilot page is explicit and the demo workspace remains the default", async () => {
  const [page, demoWorkspace] = await Promise.all([
    read("app/don-hang/page.tsx"),
    read("app/don-hang/_components/OrderWorkspace.tsx"),
  ]);

  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /value === "pilot" \? "pilot" as const : "demo" as const/);
  assert.match(page, /mode === "pilot" \? \(/);
  assert.match(page, /<PilotOrderWorkspace \/>/);
  assert.match(page, /<OrderWorkspace \/>/);
  assert.match(demoWorkspace, /useWorkspaceState/);
  assert.match(demoWorkspace, /Tạo đơn/);
});

test("pilot workspace uses server identity, safe references and guarded mutations", async () => {
  const workspace = await read("app/don-hang/_components/PilotOrderWorkspace.tsx");

  for (const endpoint of [
    '"/api/v1/me"',
    '"/api/v1/reference-data"',
    '"/api/v1/cargo-orders?limit=100"',
    '"/api/v1/cargo-orders"',
    "/api/v1/cargo-orders/${encodeURIComponent(selectedOrder.id)}/transitions",
  ]) {
    assert.ok(workspace.includes(endpoint), `missing pilot request ${endpoint}`);
  }
  assert.match(workspace, /credentials: "same-origin"/);
  assert.match(workspace, /"content-type": "application\/json"/);
  assert.match(workspace, /"idempotency-key": pendingKey\.value/);
  assert.match(workspace, /"if-match": `"cargo-order-v\$\{selectedOrder\.version\}"`/);
  assert.match(workspace, /apiError\.status === 412/);
  assert.match(workspace, /await refreshOrders\(\)/);
  assert.match(workspace, /VERSION_REFRESH_FAILED/);
  assert.match(workspace, /setInterval\(\(\) => setCurrentTime\(Date\.now\(\)\), 30_000\)/);
  assert.match(workspace, /apiError\.status === 401/);
  assert.match(workspace, /\/auth\/login\?returnTo=%2Fdon-hang/);
  assert.match(workspace, /principal\?\.permissions\.includes\("cargo-order:create"\)/);
  assert.match(workspace, /permissionScopes\["cargo-order:read"\]/);
  assert.match(workspace, /permissions\.includes\("cargo-order:transition"\)/);
  assert.match(workspace, /max=\{maximumSla\}/);
  assert.doesNotMatch(workspace, /localStorage|useLocalStorageState|useDemoAccess|DEMO_ROLE/);
  assert.doesNotMatch(workspace, /["']origin["']\s*:/i);
});

test("pilot shell is honest and removes demo role gates from the pilot branch", async () => {
  const [shell, navigation, styles] = await Promise.all([
    read("app/_components/PortalShell.tsx"),
    read("app/_components/access/PilotNavigation.tsx"),
    read("app/_components/PortalShell.module.css"),
  ]);

  assert.match(shell, /process\.env\.KSOPS_MODE === "pilot"/);
  assert.match(shell, /pilotMode\s*\? <PilotNavigation/);
  assert.match(shell, /pilotMode\s*\? children\s*: <DemoRouteBoundary/);
  assert.match(shell, /\/auth\/login\?returnTo=/);
  assert.match(shell, /\/auth\/logout\?returnTo=/);
  assert.match(shell, /Phân hệ Đơn hàng đang sử dụng SSO và PostgreSQL/);
  assert.match(shell, /Dữ liệu của phân hệ được đồng bộ theo phạm vi truy cập hiện tại/);
  assert.match(navigation, /isCargoPilot \? "SSO \+ DB" : "Workspace"/);
  assert.doesNotMatch(navigation, /useDemoAccess|demoRoleCan|viewPermission/);
  assert.match(styles, /\.pilotSessionControls/);
  assert.match(styles, /@media \(max-width: 620px\)/);
});
