import process from "node:process";
import pg from "pg";
import { demoOrders } from "../app/don-hang/_lib/orders.ts";
import { demoDispatchTasks } from "../app/dieu-phoi/_lib/dispatch.ts";
import { vehicles } from "../app/doi-xe/_lib/fleet.ts";
import { drivers } from "../app/tai-xe/_lib/drivers.ts";
import { ticketRoutes, ticketTrips } from "../app/ve-xe/_lib/ticket-data.ts";
import { contractRequests } from "../app/hop-dong/_lib/contract-data.ts";
import { customerRecords } from "../app/khach-hang/_lib/customer-data.ts";
import { maintenanceSchedule, mileageAlerts, workOrders } from "../app/bao-duong/_lib/maintenance.ts";
import { cashFlow, expenseBreakdown, invoices } from "../app/tai-chinh/_lib/finance.ts";
import { routePerformance, servicePerformance, snapshots } from "../app/bao-cao/_lib/reports.ts";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL is required.");

const url = new URL(connectionString);
const loopback = ["localhost", ["127", "0", "0", "1"].join("."), "[::1]"].includes(url.hostname);
const configuredCa = process.env.SUPABASE_DB_CA?.replaceAll("\\n", "\n").trim();
const ssl = loopback
  ? undefined
  : configuredCa
    ? { ca: configuredCa, rejectUnauthorized: true }
    : url.hostname.endsWith(".pooler.supabase.com") || url.hostname.endsWith(".supabase.co")
      ? { rejectUnauthorized: false }
      : (() => { throw new Error("Remote seed requires SUPABASE_DB_CA for verified TLS."); })();

const documents = new Map([
  ["orders", demoOrders],
  ["dispatch", demoDispatchTasks],
  ["fleet", vehicles],
  ["drivers", drivers],
  ["ticket-catalog", { routes: ticketRoutes, trips: ticketTrips }],
  ["bookings", []],
  ["contract-catalog", contractRequests],
  ["contracts", []],
  ["customers", customerRecords],
  ["maintenance", { workOrders, mileageAlerts, schedule: maintenanceSchedule }],
  ["maintenance-checklists", {}],
  ["finance", { invoices, cashFlow, expenseBreakdown }],
  ["paid-invoices", []],
  ["reports", { snapshots, servicePerformance, routePerformance }],
]);

const pool = new pg.Pool({
  connectionString,
  ssl,
  max: 1,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
  application_name: "ksops-workspace-seed",
});

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let inserted = 0;
    for (const [key, payload] of documents) {
      const result = await client.query(
        `INSERT INTO platform.workspace_state (state_key, payload)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (state_key) DO NOTHING`,
        [key, JSON.stringify(payload)],
      );
      inserted += result.rowCount ?? 0;
    }
    await client.query("COMMIT");
    process.stdout.write(`initialized ${inserted} of ${documents.size} workspace documents\n`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
