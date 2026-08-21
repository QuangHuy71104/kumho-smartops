import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function source(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function importTypeScript(relativePath) {
  const typescriptSource = await source(relativePath);
  const javascript = ts.transpileModule(typescriptSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: relativePath,
  }).outputText;

  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

test("loading fallback exposes an announced busy state", async () => {
  const loading = await source("app/loading.tsx");

  assert.match(loading, /role="status"/);
  assert.match(loading, /aria-live="polite"/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /id="loading-title"/);
  assert.match(loading, /Đang đồng bộ không gian điều hành/);
});

test("error fallback is client-side, recoverable, and does not expose diagnostics", async () => {
  const errorPage = await source("app/error.tsx");

  assert.match(errorPage, /^"use client";/);
  assert.match(errorPage, /retry: \(\) => void/);
  assert.match(errorPage, /onClick=\{handleReset\}/);
  assert.match(errorPage, /const handleReset = \(\) => retry\(\)/);
  assert.match(errorPage, /role="alert"/);
  assert.doesNotMatch(errorPage, /error\.(?:message|name|stack|cause)/);
  assert.doesNotMatch(errorPage, /\bdigest\b(?=[}\]])|console\.(?:error|log)|JSON\.stringify\(error/);
});

test("not-found fallback provides safe navigation", async () => {
  const notFound = await source("app/not-found.tsx");

  assert.match(notFound, /id="not-found-title"/);
  assert.match(notFound, /404 · KHÔNG TÌM THẤY/);
  assert.match(notFound, /href="\/"/);
  assert.match(notFound, /href="\/don-hang"/);
});

test("runtime mode resolver defaults closed and only accepts pilot explicitly", async () => {
  const capabilities = await importTypeScript("app/api/v1/system/capabilities/route.ts");

  for (const value of [undefined, null, "", "demo", "production", "true", 1]) {
    assert.equal(capabilities.resolveRuntimeMode(value), "demo");
  }

  assert.equal(capabilities.resolveRuntimeMode(" pilot "), "pilot");
  assert.equal(capabilities.resolveRuntimeMode("PILOT"), "pilot");
});

test("pilot label never promotes unverified enterprise capabilities", async () => {
  const capabilities = await importTypeScript("app/api/v1/system/capabilities/route.ts");
  const snapshot = capabilities.buildCapabilitySnapshot("pilot", "request-under-test");

  assert.deepEqual(snapshot, {
    mode: "pilot",
    durablePersistence: false,
    enterpriseIdentity: false,
    mutationApi: false,
    requestId: "request-under-test",
  });
});

test("capabilities route returns no-store, safe JSON with a fresh request id", async () => {
  const capabilities = await importTypeScript("app/api/v1/system/capabilities/route.ts");
  const previousMode = process.env.KSOPS_MODE;
  const previousRuntimeMode = process.env.APP_RUNTIME_MODE;

  delete process.env.KSOPS_MODE;
  delete process.env.APP_RUNTIME_MODE;
  try {
    const firstResponse = capabilities.GET();
    const first = await firstResponse.json();
    const second = await capabilities.GET().json();

    assert.equal(firstResponse.status, 200);
    assert.equal(firstResponse.headers.get("cache-control"), "no-store");
    assert.equal(firstResponse.headers.get("x-content-type-options"), "nosniff");
    assert.equal(first.mode, "demo");
    assert.equal(first.durablePersistence, false);
    assert.equal(first.enterpriseIdentity, false);
    assert.equal(first.mutationApi, false);
    assert.match(first.requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.notEqual(first.requestId, second.requestId);
    assert.deepEqual(Object.keys(first).sort(), [
      "durablePersistence",
      "enterpriseIdentity",
      "mode",
      "mutationApi",
      "requestId",
    ]);
  } finally {
    if (previousMode === undefined) {
      delete process.env.KSOPS_MODE;
    } else {
      process.env.KSOPS_MODE = previousMode;
    }

    if (previousRuntimeMode === undefined) {
      delete process.env.APP_RUNTIME_MODE;
    } else {
      process.env.APP_RUNTIME_MODE = previousRuntimeMode;
    }
  }
});

test("capabilities source never inspects credential-shaped environment values", async () => {
  const route = await source("app/api/v1/system/capabilities/route.ts");

  assert.doesNotMatch(
    route,
    /DATABASE_URL|POSTGRES_URL|AUTH0_SECRET|AUTH0_CLIENT_SECRET|CLIENT_SECRET|PASSWORD|TOKEN/,
  );
  assert.match(route, /verifiedCapabilities/);
  assert.match(route, /"Cache-Control": "no-store"/);
  assert.match(route, /globalThis\.crypto\.randomUUID\(\)/);
});
