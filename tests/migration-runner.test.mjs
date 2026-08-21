import assert from "node:assert/strict";
import test from "node:test";
import {
  checksumMigration,
  migrationFilenamePattern,
  stripTransactionEnvelope,
} from "../scripts/migration-core.mjs";

test("migration runner accepts only deterministic numbered SQL filenames", () => {
  assert.equal(migrationFilenamePattern.test("0001_foundation.sql"), true);
  assert.equal(migrationFilenamePattern.test("1_foundation.sql"), false);
  assert.equal(migrationFilenamePattern.test("0002-foundation.sql"), false);
  assert.equal(migrationFilenamePattern.test("0003_foundation.SQL"), false);
});

test("migration runner strips exactly one reviewed transaction envelope", () => {
  const source = "-- KSOps migration 0001: test\n\nBEGIN;\nSELECT 1;\nCOMMIT;\n";
  assert.equal(
    stripTransactionEnvelope(source, "0001_test.sql"),
    "-- KSOps migration 0001: test\n\nSELECT 1;\n",
  );
  assert.throws(
    () => stripTransactionEnvelope("SELECT 1;", "0001_test.sql"),
    /reviewed BEGIN\/COMMIT envelope/u,
  );
});

test("migration checksum detects any source drift", () => {
  assert.match(checksumMigration("SELECT 1;"), /^[a-f0-9]{64}$/u);
  assert.notEqual(checksumMigration("SELECT 1;"), checksumMigration("SELECT 2;"));
});
