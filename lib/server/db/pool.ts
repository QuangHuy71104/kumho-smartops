import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { Pool, type PoolClient } from "pg";
import { requirePilotConfig } from "../config.ts";

let databasePool: Pool | undefined;

/**
 * Creates one pool per warm server instance. Construction is lazy so demo builds
 * and static imports never require credentials or initiate a database connection.
 */
export function getDatabasePool(): Pool {
  if (databasePool) return databasePool;

  const config = requirePilotConfig();
  const createdPool = new Pool({
    connectionString: config.databaseUrl,
    application_name: "ksops-web",
    // Keep the per-instance budget deliberately small; production must use
    // the managed provider's pooled URL before horizontal scaling is enabled.
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 5_000,
    maxLifetimeSeconds: 300,
    query_timeout: 12_000,
    statement_timeout: 10_000,
    idle_in_transaction_session_timeout: 10_000,
  });

  if (process.env.VERCEL === "1") attachDatabasePool(createdPool);
  databasePool = createdPool;
  return databasePool;
}

export async function withDatabaseClient<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDatabasePool().connect();
  try {
    return await work(client);
  } finally {
    client.release();
  }
}

export async function withDatabaseTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  return withDatabaseClient(async (client) => {
    await client.query("BEGIN");
    try {
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original domain/database failure for the caller.
      }
      throw error;
    }
  });
}

export async function closeDatabasePool(): Promise<void> {
  const pool = databasePool;
  databasePool = undefined;
  if (pool) await pool.end();
}
