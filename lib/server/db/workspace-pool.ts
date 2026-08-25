import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { ApplicationError } from "../../../modules/shared/application/errors.ts";

let workspacePool: Pool | undefined;

function workspaceDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new ApplicationError("DATABASE_UNAVAILABLE", "Kết nối dữ liệu chưa được cấu hình.");
  }
  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname === "/") {
      throw new Error("invalid postgres url");
    }
    return url;
  } catch {
    throw new ApplicationError("DATABASE_UNAVAILABLE", "Chuỗi kết nối dữ liệu không hợp lệ.");
  }
}

function sslOptions(url: URL) {
  const loopback = ["localhost", ["127", "0", "0", "1"].join("."), "[::1]"].includes(url.hostname);
  if (loopback) return undefined;

  const configuredCa = process.env.SUPABASE_DB_CA?.replaceAll("\\n", "\n").trim();
  if (configuredCa) return { ca: configuredCa, rejectUnauthorized: true };

  if (url.hostname.endsWith(".pooler.supabase.com") || url.hostname.endsWith(".supabase.co")) {
    return { rejectUnauthorized: false };
  }

  throw new ApplicationError(
    "DATABASE_UNAVAILABLE",
    "Máy chủ PostgreSQL từ xa cần cấu hình chứng chỉ CA.",
  );
}

export function getWorkspacePool() {
  if (workspacePool) return workspacePool;
  const url = workspaceDatabaseUrl();
  const createdPool = new Pool({
    connectionString: url.toString(),
    ssl: sslOptions(url),
    application_name: "ksops-workspace",
    max: 3,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5_000,
    maxLifetimeSeconds: 300,
    query_timeout: 12_000,
    statement_timeout: 10_000,
    idle_in_transaction_session_timeout: 10_000,
  });
  if (process.env.VERCEL === "1") attachDatabasePool(createdPool);
  workspacePool = createdPool;
  return workspacePool;
}
