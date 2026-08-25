import { existsSync } from "node:fs";
import process from "node:process";

if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL is required in .env.local or the current environment.");

process.env.MIGRATION_DATABASE_URL = connectionString;
await import("./migrate.mjs");
await import("./seed-workspace-state.mjs");
