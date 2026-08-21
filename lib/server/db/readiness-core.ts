export const EXPECTED_DATABASE_MIGRATIONS = Object.freeze([
  Object.freeze({
    filename: "0001_extensions_org_iam.sql",
    checksum: "b92d823a19554ba16b351f8f62fe0c11287663781441b23ec868114b0f8fd457",
  }),
  Object.freeze({
    filename: "0002_fleet_workforce.sql",
    checksum: "3dc559ffac5ee4361367e1ccbc2c748159fadc20daff69c52ede09fb6c29369b",
  }),
  Object.freeze({
    filename: "0003_cargo_dispatch.sql",
    checksum: "153871bc1c871c42f25cf8a13798b71f214c7d03a7941a2aae46fdc21bb72be7",
  }),
  Object.freeze({
    filename: "0004_platform_audit_reporting_rls.sql",
    checksum: "b9f42fa56ab9c1866ed442c73d0aed4aa583cb958ff8f05bb872d84ecc7ea904",
  }),
]);

const BOOTSTRAP_PRINCIPAL_ID = "00000000-0000-0000-0000-000000000000";

type QueryResult = Readonly<{
  rows: readonly Record<string, unknown>[];
}>;

export interface ReadinessClient {
  query(text: string, values?: readonly unknown[]): Promise<QueryResult>;
  release(): void;
}

export interface ReadinessPool {
  connect(): Promise<ReadinessClient>;
}

function migrationsMatch(rows: readonly Record<string, unknown>[]) {
  if (rows.length !== EXPECTED_DATABASE_MIGRATIONS.length) return false;
  const actual = new Map(rows.map((row) => [
    row.filename,
    typeof row.checksum === "string" ? row.checksum.trim() : null,
  ]));
  return EXPECTED_DATABASE_MIGRATIONS.every((migration) => (
    actual.get(migration.filename) === migration.checksum
  ));
}

function allPrivilegesPresent(row: Record<string, unknown> | undefined) {
  if (!row) return false;
  return Object.entries(row).every(([key, value]) => key === "runtime_role" || value === true)
    && typeof row.runtime_role === "string"
    && row.runtime_role.length > 0;
}

/**
 * Readiness is deliberately stricter than liveness. It verifies the reviewed
 * migration set, runtime grants, tenant context and actual RLS-protected reads
 * using the same database role that will serve requests.
 */
export async function verifyPilotDatabaseReadiness(
  pool: ReadinessPool,
  organizationId: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const migrations = await client.query(
      `SELECT filename, trim(checksum_sha256) AS checksum
         FROM public.ksops_schema_migration
        WHERE filename = ANY($1::text[])
        ORDER BY filename`,
      [EXPECTED_DATABASE_MIGRATIONS.map((migration) => migration.filename)],
    );
    if (!migrationsMatch(migrations.rows)) throw new Error("database migration set mismatch");

    const privileges = await client.query(`
      SELECT
        current_user AS runtime_role,
        has_schema_privilege(current_user, 'iam', 'USAGE') AS iam_schema_usage,
        has_schema_privilege(current_user, 'org', 'USAGE') AS org_schema_usage,
        has_schema_privilege(current_user, 'cargo', 'USAGE') AS cargo_schema_usage,
        has_schema_privilege(current_user, 'platform', 'USAGE') AS platform_schema_usage,
        has_schema_privilege(current_user, 'audit', 'USAGE') AS audit_schema_usage,
        has_table_privilege(current_user, 'iam.principal', 'SELECT') AS principal_read,
        has_table_privilege(current_user, 'iam.principal_role_scope', 'SELECT') AS grant_read,
        has_table_privilege(current_user, 'iam.role', 'SELECT') AS role_read,
        has_table_privilege(current_user, 'iam.role_permission', 'SELECT') AS role_permission_read,
        has_table_privilege(current_user, 'iam.access_scope', 'SELECT') AS access_scope_read,
        has_table_privilege(current_user, 'org.branch', 'SELECT') AS branch_read,
        has_table_privilege(current_user, 'org.location', 'SELECT') AS location_read,
        has_table_privilege(current_user, 'cargo.cargo_order', 'SELECT, INSERT, UPDATE') AS order_access,
        has_table_privilege(current_user, 'cargo.cargo_order_event', 'SELECT, INSERT') AS event_access,
        has_table_privilege(current_user, 'platform.idempotency_key', 'SELECT, INSERT, UPDATE, DELETE') AS idempotency_access,
        has_table_privilege(current_user, 'platform.outbox_message', 'INSERT') AS outbox_write,
        has_table_privilege(current_user, 'audit.audit_event', 'INSERT') AS audit_write
    `);
    if (!allPrivilegesPresent(privileges.rows[0])) throw new Error("runtime database grants incomplete");

    await client.query(
      `SELECT
         set_config('app.organization_id', $1, true),
         set_config('app.principal_id', $2, true)`,
      [organizationId, BOOTSTRAP_PRINCIPAL_ID],
    );
    const context = await client.query(
      `SELECT
         current_setting('app.organization_id', true) = $1 AS organization_context,
         current_setting('app.principal_id', true) = $2 AS principal_context`,
      [organizationId, BOOTSTRAP_PRINCIPAL_ID],
    );
    if (context.rows[0]?.organization_context !== true
      || context.rows[0]?.principal_context !== true) {
      throw new Error("tenant context unavailable");
    }

    await client.query(
      "SELECT id FROM iam.principal WHERE organization_id = $1 LIMIT 1",
      [organizationId],
    );
    await client.query(
      "SELECT id FROM cargo.cargo_order WHERE organization_id = $1 LIMIT 1",
      [organizationId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
