import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { mapVerifiedAuth0Claims, toServerPrincipal } from "../lib/server/auth/mapping.ts";
import {
  PostgresInternalPrincipalDirectory,
} from "../lib/server/auth/postgres-directory-core.ts";
import { Auth0SdkSessionVerifier } from "../lib/server/auth/session-verifier-core.ts";

const root = process.cwd();
const read = (path) => readFile(join(root, path), "utf8");
const organizationId = "20000000-0000-7000-8000-000000000001";
const actorId = "10000000-0000-7000-8000-000000000001";
const branchId = "30000000-0000-7000-8000-000000000001";
const roleId = "40000000-0000-7000-8000-000000000001";
const issuer = "https://tenant.example.auth0.com/";
const subjectHash = "ab".repeat(32);

test("session verifier injects the configured issuer and discards external grants", async () => {
  const request = new Request("https://app.example.test/api/orders");
  let receivedRequest;
  const verifier = new Auth0SdkSessionVerifier({
    async readVerifiedSession(received) {
      receivedRequest = received;
      return {
        subject: "auth0|immutable-subject",
        auth0OrganizationId: "org_auth0_01",
        sessionId: "session_01",
        authenticatedAt: 1_787_275_200,
        issuer: "https://attacker.example/",
        roles: ["platform-admin"],
        permissions: ["access:grant"],
      };
    },
  }, issuer);

  const claims = await verifier.getVerifiedClaims(request);
  assert.equal(receivedRequest, request);
  assert.deepEqual(claims, {
    iss: issuer,
    sub: "auth0|immutable-subject",
    org_id: "org_auth0_01",
    sid: "session_01",
    auth_time: 1_787_275_200,
  });
  assert.equal("roles" in claims, false);
  assert.equal("permissions" in claims, false);
  assert.equal(mapVerifiedAuth0Claims(claims, issuer).issuer, issuer);

  const anonymous = new Auth0SdkSessionVerifier({
    async readVerifiedSession() { return null; },
  }, issuer);
  assert.equal(await anonymous.getVerifiedClaims(request), null);
});

function directoryHarness(rows) {
  const calls = [];
  let transactionCount = 0;
  const directory = new PostgresInternalPrincipalDirectory({
    organizationId,
    identityProvider: "auth0",
    issuer,
    transactions: {
      async run(work) {
        transactionCount += 1;
        return work({
          async query(text, values) {
            calls.push({ text, values });
            return { rows: calls.length === 1 ? [] : rows };
          },
        });
      },
    },
  });
  return { calls, directory, get transactionCount() { return transactionCount; } };
}

test("principal directory bootstraps tenant RLS and queries only active current grants", async () => {
  const harness = directoryHarness([{
    actor_id: actorId,
    organization_id: organizationId,
    role_ids: [roleId, roleId],
    permission_scopes: [
      { permission: "cargo-order:read", kind: "organization", ids: [organizationId] },
      { permission: "cargo-order:create", kind: "branch", ids: [branchId] },
      { permission: "cargo-order:read", kind: "organization", ids: [organizationId] },
    ],
  }]);

  const record = await harness.directory.findActiveByAuth0Subject({
    organizationId,
    issuer,
    subjectHash,
  });

  assert.equal(harness.transactionCount, 1);
  assert.equal(harness.calls.length, 2);
  assert.match(harness.calls[0].text, /set_config\('app\.organization_id', \$1, true\)/u);
  assert.match(harness.calls[0].text, /set_config\('app\.principal_id', \$2, true\)/u);
  assert.deepEqual(harness.calls[0].values, [
    organizationId,
    "00000000-0000-0000-0000-000000000000",
  ]);

  const lookup = harness.calls[1];
  assert.match(lookup.text, /p\.organization_id = \$1::uuid/u);
  assert.match(lookup.text, /p\.identity_provider = \$2/u);
  assert.match(lookup.text, /p\.subject_hmac = \$3::bytea/u);
  assert.match(lookup.text, /p\.status = 'active'/u);
  assert.match(lookup.text, /r\.status = 'active'/u);
  assert.match(lookup.text, /grant_scope\.revoked_at IS NULL/u);
  assert.match(lookup.text, /grant_scope\.valid_during @> statement_timestamp\(\)/u);
  assert.equal(lookup.values[0], organizationId);
  assert.equal(lookup.values[1], "auth0");
  assert.ok(Buffer.isBuffer(lookup.values[2]));
  assert.equal(lookup.values[2].toString("hex"), subjectHash);
  assert.doesNotMatch(JSON.stringify(harness.calls), /immutable-subject/u);

  assert.deepEqual(record, {
    actorId,
    organizationId,
    auth0Issuer: issuer,
    auth0SubjectHash: subjectHash,
    status: "active",
    roleIds: [roleId],
    permissions: ["cargo-order:create", "cargo-order:read"],
    scopes: [
      { kind: "branch", ids: [branchId] },
      { kind: "organization", ids: [organizationId] },
    ],
    permissionScopes: [
      { permission: "cargo-order:create", kind: "branch", ids: [branchId] },
      { permission: "cargo-order:read", kind: "organization", ids: [organizationId] },
    ],
  });
});

test("principal directory fails closed before SQL for another tenant or issuer", async () => {
  const harness = directoryHarness([]);

  assert.equal(await harness.directory.findActiveByAuth0Subject({
    organizationId: "20000000-0000-7000-8000-000000000002",
    issuer,
    subjectHash,
  }), null);
  assert.equal(await harness.directory.findActiveByAuth0Subject({
    organizationId,
    issuer: "https://other.example.auth0.com/",
    subjectHash,
  }), null);
  assert.equal(await harness.directory.findActiveByAuth0Subject({
    organizationId,
    issuer,
    subjectHash: "not-a-hash",
  }), null);
  assert.equal(harness.transactionCount, 0);
  assert.equal(harness.calls.length, 0);

  const unknown = directoryHarness([]);
  assert.equal(await unknown.directory.findActiveByAuth0Subject({
    organizationId,
    issuer,
    subjectHash,
  }), null);
});

test("application principal preserves permission-specific data scopes", () => {
  const base = {
    actorId,
    organizationId,
    identityProvider: "auth0",
    roleIds: [roleId],
    permissions: ["cargo-order:read"],
    scopes: [{ kind: "organization", ids: [organizationId] }],
    permissionScopes: [
      { permission: "cargo-order:read", kind: "organization", ids: [organizationId] },
    ],
    sessionId: "session_01",
    authenticatedAt: 1_787_275_200,
  };
  const organizationPrincipal = toServerPrincipal({
    ...base,
  });
  assert.deepEqual(organizationPrincipal, {
    id: actorId,
    organizationId,
    permissions: ["cargo-order:read"],
    permissionScopes: { "cargo-order:read": "*" },
    authenticationMethod: "oidc",
  });

  const branchPrincipal = toServerPrincipal({
    ...base,
    permissions: ["cargo-order:read", "dashboard:read"],
    scopes: [
      { kind: "branch", ids: [branchId] },
      { kind: "organization", ids: [organizationId] },
    ],
    permissionScopes: [
      { permission: "cargo-order:read", kind: "branch", ids: [branchId] },
      { permission: "dashboard:read", kind: "organization", ids: [organizationId] },
    ],
  });
  assert.deepEqual(branchPrincipal.permissionScopes, {
    "cargo-order:read": [branchId],
    "dashboard:read": "*",
  });
  assert.notEqual(branchPrincipal.permissionScopes["cargo-order:read"], "*");
});

test("production Auth0 adapters remain server-only, lazy and demo-safe", async () => {
  const [client, sdkVerifier, directory, resolver, proxy] = await Promise.all([
    read("lib/server/auth/auth0-client.ts"),
    read("lib/server/auth/auth0-session-verifier.ts"),
    read("lib/server/auth/postgres-directory.ts"),
    read("lib/server/auth/resolve-principal.ts"),
    read("proxy.ts"),
  ]);

  for (const source of [client, sdkVerifier, directory, resolver]) {
    assert.match(source, /import "server-only"/u);
  }
  assert.ok(client.indexOf("requirePilotConfig()") < client.indexOf("new Auth0Client("));
  assert.match(sdkVerifier, /getAuth0Client\(\)\.getSession/u);
  assert.match(sdkVerifier, /instanceof SessionDomainMismatchError/u);
  assert.match(sdkVerifier, /throw error/u);
  assert.doesNotMatch(sdkVerifier, /(?:headers\.get|x-role|permissions|roles)/iu);
  assert.match(proxy, /serverConfig\.mode === "demo"/u);
  assert.match(proxy, /NextResponse\.next\(\)/u);
  assert.match(proxy, /getAuth0Client\(\)\.middleware\(request\)/u);
  assert.match(resolver, /getAuth0SessionVerifier\(\)/u);
  assert.match(resolver, /getInternalPrincipalDirectory\(\)/u);
  assert.match(resolver, /"AUTHENTICATION_REQUIRED"/u);
  assert.doesNotMatch([client, sdkVerifier, directory, resolver, proxy].join("\n"), /console\.(?:log|warn|error)/u);
});
