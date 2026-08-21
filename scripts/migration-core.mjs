import { createHash } from "node:crypto";

export const migrationFilenamePattern = /^\d{4}_[a-z0-9_]+\.sql$/u;

export function checksumMigration(source) {
  return createHash("sha256").update(source).digest("hex");
}

export function stripTransactionEnvelope(source, filename) {
  const withoutBegin = source.replace(/^([\s\S]*?\n)BEGIN;\s*/u, "$1");
  const withoutCommit = withoutBegin.replace(/\s*COMMIT;\s*$/u, "\n");
  if (withoutBegin === source || withoutCommit === withoutBegin) {
    throw new Error(`${filename} must contain the reviewed BEGIN/COMMIT envelope.`);
  }
  return withoutCommit;
}
