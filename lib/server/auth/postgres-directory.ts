import "server-only";

import { requirePilotConfig } from "../config.ts";
import { withDatabaseTransaction } from "../db/pool.ts";
import type { InternalPrincipalDirectory } from "./contracts.ts";
import {
  PostgresInternalPrincipalDirectory,
  type PrincipalQueryClient,
  type PrincipalTransactionRunner,
} from "./postgres-directory-core.ts";

const postgresTransactions: PrincipalTransactionRunner = {
  run: (work) => withDatabaseTransaction((client) => work({
    query: async (text, values) => {
      const result = await client.query<Record<string, unknown>>(text, [...values]);
      return { rows: result.rows };
    },
  } satisfies PrincipalQueryClient)),
};

let internalPrincipalDirectory: InternalPrincipalDirectory | undefined;

export function getInternalPrincipalDirectory(): InternalPrincipalDirectory {
  if (internalPrincipalDirectory) return internalPrincipalDirectory;

  const config = requirePilotConfig();
  internalPrincipalDirectory = new PostgresInternalPrincipalDirectory({
    organizationId: config.organizationId,
    identityProvider: "auth0",
    issuer: config.auth0.issuer,
    transactions: postgresTransactions,
  });
  return internalPrincipalDirectory;
}
