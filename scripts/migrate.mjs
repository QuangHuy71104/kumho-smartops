import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import pg from "pg";
import {
  checksumMigration,
  migrationFilenamePattern,
  stripTransactionEnvelope,
} from "./migration-core.mjs";

const { Pool } = pg;
const migrationDirectory = resolve(process.cwd(), "db", "migrations");
const connectionString = process.env.MIGRATION_DATABASE_URL?.trim();
const statusOnly = process.argv.includes("--status");

if (!connectionString) {
  throw new Error("MIGRATION_DATABASE_URL is required; the runtime DATABASE_URL is intentionally refused.");
}

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 60_000,
  application_name: "ksops-migrator",
});
const client = await pool.connect();

try {
  await client.query("SELECT pg_advisory_lock(hashtext('ksops-schema-migrations'))");
  if (!statusOnly) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.ksops_schema_migration (
        filename text PRIMARY KEY,
        checksum_sha256 char(64) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  const filenames = (await readdir(migrationDirectory))
    .filter((filename) => migrationFilenamePattern.test(filename))
    .sort();
  const trackingTable = await client.query(
    "SELECT to_regclass('public.ksops_schema_migration')::text AS name",
  );
  const appliedResult = trackingTable.rows[0]?.name
    ? await client.query(
      "SELECT filename, checksum_sha256 FROM public.ksops_schema_migration ORDER BY filename",
    )
    : { rows: [] };
  const applied = new Map(appliedResult.rows.map((row) => [row.filename, row.checksum_sha256.trim()]));

  for (const filename of filenames) {
    const source = await readFile(resolve(migrationDirectory, filename), "utf8");
    const checksum = checksumMigration(source);
    const recordedChecksum = applied.get(filename);
    if (recordedChecksum && recordedChecksum !== checksum) {
      throw new Error(`Checksum mismatch for already-applied migration ${filename}.`);
    }
    if (recordedChecksum) {
      process.stdout.write(`applied  ${filename}\n`);
      continue;
    }
    if (statusOnly) {
      process.stdout.write(`pending  ${filename}\n`);
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(stripTransactionEnvelope(source, filename));
      await client.query(
        "INSERT INTO public.ksops_schema_migration (filename, checksum_sha256) VALUES ($1, $2)",
        [filename, checksum],
      );
      await client.query("COMMIT");
      process.stdout.write(`migrated ${filename}\n`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('ksops-schema-migrations'))").catch(() => undefined);
  client.release();
  await pool.end();
}
