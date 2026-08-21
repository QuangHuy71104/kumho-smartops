import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  parseServerConfig,
  ServerConfigurationError,
} from "../lib/server/config-schema.ts";
import {
  canonicalJson,
  CanonicalJsonError,
  equalHexDigest,
  hashCanonicalRequest,
  hashIdempotencyKey,
  IdempotencyKeyError,
} from "../lib/server/idempotency-core.ts";
import {
  createProblemDetails,
  errorProblemResponse,
  HttpProblem,
  problemResponse,
} from "../lib/server/http/problem.ts";
import {
  isValidRequestId,
  resolveRequestId,
} from "../lib/server/http/request-id.ts";
import {
  mapInternalPrincipal,
  mapVerifiedAuth0Claims,
  PrincipalMappingError,
} from "../lib/server/auth/mapping.ts";
import { createSubjectLookupKey } from "../lib/server/auth/subject-key-core.ts";

const root = process.cwd();
const read = (path) => readFile(join(root, path), "utf8");
const pilotEnvironment = {
  KSOPS_MODE: "pilot",
  DATABASE_URL: "postgresql://pilot:local-only@localhost:5432/ksops",
  AUTH0_DOMAIN: "tenant.example.auth0.com",
  AUTH0_CLIENT_ID: "client_demo",
  AUTH0_CLIENT_SECRET: "client-secret-demo-only",
  AUTH0_SECRET: "a".repeat(64),
  APP_BASE_URL: "http://localhost:3000",
  KSOPS_IDEMPOTENCY_SECRET: "idempotency-secret-material-32-bytes-minimum",
  KSOPS_ORGANIZATION_ID: "018f3a7c-4b20-7b1a-8c4d-9e6f12345678",
  KSOPS_IDENTITY_LOOKUP_SECRET: "identity-lookup-secret-material-32-bytes",
};

test("server config defaults safely to demo without credentials", () => {
  assert.deepEqual(parseServerConfig({}), { mode: "demo" });
  assert.deepEqual(parseServerConfig({ KSOPS_MODE: "demo" }), { mode: "demo" });
});

test("pilot config fails closed and never includes secret values in errors", () => {
  assert.throws(
    () => parseServerConfig({ KSOPS_MODE: "pilot" }),
    (error) => {
      assert.ok(error instanceof ServerConfigurationError);
      assert.deepEqual(error.variables, [
        "APP_BASE_URL",
        "AUTH0_CLIENT_ID",
        "AUTH0_CLIENT_SECRET",
        "AUTH0_DOMAIN",
        "AUTH0_SECRET",
        "DATABASE_URL",
        "KSOPS_IDEMPOTENCY_SECRET",
        "KSOPS_IDENTITY_LOOKUP_SECRET",
        "KSOPS_ORGANIZATION_ID",
      ]);
      return true;
    },
  );

  const exposed = "not-a-secret-but-must-not-leak";
  assert.throws(
    () => parseServerConfig({ ...pilotEnvironment, AUTH0_SECRET: exposed }),
    (error) => error instanceof ServerConfigurationError && !error.message.includes(exposed),
  );
});

test("validated pilot config normalizes the fixed organization and issuer", () => {
  const config = parseServerConfig(pilotEnvironment);
  assert.equal(config.mode, "pilot");
  assert.equal(config.organizationId, pilotEnvironment.KSOPS_ORGANIZATION_ID);
  assert.equal(config.appBaseUrl, "http://localhost:3000");
  assert.equal(config.auth0.issuer, "https://tenant.example.auth0.com/");

  assert.throws(() => parseServerConfig({ ...pilotEnvironment, KSOPS_ORGANIZATION_ID: "org_any" }));
  assert.throws(() => parseServerConfig({ ...pilotEnvironment, APP_BASE_URL: "https://example.com/callback" }));
  assert.throws(() => parseServerConfig({ ...pilotEnvironment, DATABASE_URL: "file:local.db" }));
});

test("pilot database transport permits local development but requires verified TLS remotely", () => {
  for (const unsafe of [
    "postgresql://runtime:secret@db.example.test/ksops",
    "postgresql://runtime:secret@db.example.test/ksops?sslmode=disable",
    "postgresql://runtime:secret@db.example.test/ksops?sslmode=require",
    "postgresql://runtime:secret@db.example.test/ksops?sslmode=verify-full&ssl=false",
  ]) {
    assert.throws(
      () => parseServerConfig({ ...pilotEnvironment, DATABASE_URL: unsafe }),
      (error) => error instanceof ServerConfigurationError
        && error.variables.includes("DATABASE_URL")
        && !error.message.includes("secret"),
    );
  }

  const secure = parseServerConfig({
    ...pilotEnvironment,
    DATABASE_URL: "postgresql://runtime:secret@db.example.test/ksops?sslmode=verify-full",
  });
  assert.equal(secure.mode, "pilot");
});

test("request IDs accept a bounded allowlist and replace untrusted input", () => {
  assert.equal(isValidRequestId("req_upstream-01:abc"), true);
  assert.equal(isValidRequestId(" bad"), false);
  assert.equal(isValidRequestId("x\r\nx-injected: yes"), false);
  assert.equal(resolveRequestId("bad request id", () => "req_generated_01"), "req_generated_01");
  assert.throws(() => resolveRequestId(null, () => "also invalid"));
});

test("problem helpers emit RFC7807 JSON and hide unknown failures", async () => {
  const response = problemResponse({
    status: 422,
    code: "VALIDATION_FAILED",
    detail: "Dữ liệu không hợp lệ.",
    instance: "/api/v1/cargo-orders",
    errors: [{ field: "weightKg", code: "OUT_OF_RANGE" }],
  }, "req_contract_01");
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.match(response.headers.get("content-type"), /^application\/problem\+json/u);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-request-id"), "req_contract_01");
  assert.equal(body.type, "urn:ksops:problem:validation-failed");
  assert.equal(body.errors[0].field, "weightKg");

  const secret = "postgresql://user:password@private/database";
  const hidden = await (errorProblemResponse(new Error(secret), "req_hidden_01")).json();
  assert.equal(hidden.code, "INTERNAL_ERROR");
  assert.doesNotMatch(JSON.stringify(hidden), /password|private/u);

  const publicFailure = new HttpProblem({ status: 409, code: "VERSION_CONFLICT", detail: "Phiên bản cũ." });
  assert.equal((await errorProblemResponse(publicFailure, "req_public_01").json()).code, "VERSION_CONFLICT");
  assert.throws(() => createProblemDetails({ status: 200, code: "NOT_AN_ERROR" }));
});

test("canonical request hashes are stable and reject non-JSON ambiguity", () => {
  const first = { z: [3, 2, 1], nested: { b: true, a: "á" }, negativeZero: -0 };
  const second = { negativeZero: 0, nested: { a: "á", b: true }, z: [3, 2, 1] };
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(hashCanonicalRequest(first), hashCanonicalRequest(second));
  assert.equal(hashCanonicalRequest([1, 2]), hashCanonicalRequest([1, 2]));
  assert.notEqual(hashCanonicalRequest([1, 2]), hashCanonicalRequest([2, 1]));
  assert.throws(() => canonicalJson(Number.NaN), CanonicalJsonError);
  assert.throws(() => canonicalJson({ missing: undefined }), CanonicalJsonError);
  const circular = {};
  circular.self = circular;
  assert.throws(() => canonicalJson(circular), CanonicalJsonError);
});

test("idempotency and identity lookup keys are irreversibly HMAC-scoped", () => {
  const rawKey = "idem-client-retry-0001";
  const first = hashIdempotencyKey(rawKey, pilotEnvironment.KSOPS_IDEMPOTENCY_SECRET);
  const second = hashIdempotencyKey(rawKey, `${pilotEnvironment.KSOPS_IDEMPOTENCY_SECRET}-rotated`);
  assert.match(first, /^[a-f0-9]{64}$/u);
  assert.doesNotMatch(first, /idem-client/u);
  assert.notEqual(first, second);
  assert.equal(equalHexDigest(first, first), true);
  assert.equal(equalHexDigest(first, second), false);
  assert.throws(() => hashIdempotencyKey("bad key", pilotEnvironment.KSOPS_IDEMPOTENCY_SECRET), IdempotencyKeyError);

  const identity = mapVerifiedAuth0Claims({
    iss: "https://tenant.example.auth0.com/",
    sub: "auth0|immutable-subject",
  }, "https://tenant.example.auth0.com/");
  const lookup = createSubjectLookupKey(
    identity,
    pilotEnvironment.KSOPS_ORGANIZATION_ID,
    pilotEnvironment.KSOPS_IDENTITY_LOOKUP_SECRET,
  );
  const otherTenant = createSubjectLookupKey(
    identity,
    "018f3a7c-4b20-7b1a-8c4d-9e6f12345679",
    pilotEnvironment.KSOPS_IDENTITY_LOOKUP_SECRET,
  );
  assert.match(lookup.subjectHash, /^[a-f0-9]{64}$/u);
  assert.doesNotMatch(lookup.subjectHash, /immutable/u);
  assert.notEqual(lookup.subjectHash, otherTenant.subjectHash);
});

test("Auth0 claims never grant roles without an active internal mapping", () => {
  const identity = mapVerifiedAuth0Claims({
    iss: "https://tenant.example.auth0.com",
    sub: "auth0|immutable-subject",
    sid: "session_01",
    auth_time: 1_787_275_200,
    roles: ["platform-admin"],
    permissions: ["access:grant"],
  }, "https://tenant.example.auth0.com/");
  const lookup = createSubjectLookupKey(
    identity,
    pilotEnvironment.KSOPS_ORGANIZATION_ID,
    pilotEnvironment.KSOPS_IDENTITY_LOOKUP_SECRET,
  );
  const principal = mapInternalPrincipal(identity, lookup, {
    actorId: "usr_internal_01",
    organizationId: lookup.organizationId,
    auth0Issuer: lookup.issuer,
    auth0SubjectHash: lookup.subjectHash,
    status: "active",
    roleIds: ["cargo-agent", "cargo-agent"],
    permissions: ["cargo-order:read", "cargo-order:create"],
    scopes: [{ kind: "branch", ids: ["branch_02", "branch_01"] }],
    permissionScopes: [
      { permission: "cargo-order:read", kind: "branch", ids: ["branch_02", "branch_01"] },
      { permission: "cargo-order:create", kind: "branch", ids: ["branch_02", "branch_01"] },
    ],
  });

  assert.deepEqual(principal.roleIds, ["cargo-agent"]);
  assert.deepEqual(principal.permissions, ["cargo-order:create", "cargo-order:read"]);
  assert.equal(principal.organizationId, pilotEnvironment.KSOPS_ORGANIZATION_ID);
  assert.equal("subject" in principal, false);

  assert.throws(() => mapInternalPrincipal(identity, lookup, {
    actorId: "usr_internal_01",
    organizationId: lookup.organizationId,
    auth0Issuer: lookup.issuer,
    auth0SubjectHash: lookup.subjectHash,
    status: "suspended",
    roleIds: [],
    permissions: [],
    scopes: [],
    permissionScopes: [],
  }), PrincipalMappingError);
  assert.throws(() => mapVerifiedAuth0Claims({ iss: "https://evil.example/", sub: "auth0|x" }, lookup.issuer), PrincipalMappingError);
});

test("credential-bearing entry points are server-only and lazy", async () => {
  const [config, pool, idempotency, subjectKey, resolver] = await Promise.all([
    read("lib/server/config.ts"),
    read("lib/server/db/pool.ts"),
    read("lib/server/idempotency.ts"),
    read("lib/server/auth/subject-key.ts"),
    read("lib/server/auth/resolve-principal.ts"),
  ]);

  for (const source of [config, pool, idempotency, subjectKey, resolver]) {
    assert.match(source, /import "server-only"/u);
  }
  assert.match(pool, /if \(databasePool\) return databasePool/u);
  assert.match(pool, /if \(process\.env\.VERCEL === "1"\) attachDatabasePool\(createdPool\)/u);
  assert.ok(pool.indexOf("requirePilotConfig()") < pool.indexOf("new Pool("));
  assert.doesNotMatch([config, pool, idempotency, subjectKey, resolver].join("\n"), /console\.(?:log|error|warn)/u);
});
