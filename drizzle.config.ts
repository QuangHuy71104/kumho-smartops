import { defineConfig } from "drizzle-kit";

const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL?.trim();
if (!migrationDatabaseUrl) {
  throw new Error("MIGRATION_DATABASE_URL is required for Drizzle tooling.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/generated",
  dbCredentials: {
    url: migrationDatabaseUrl,
  },
  strict: true,
  verbose: true,
});
