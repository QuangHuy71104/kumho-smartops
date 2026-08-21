import "server-only";

import { ApplicationError } from "../../../modules/shared/application/errors.ts";
import type { ServerPrincipal } from "../../../modules/identity/domain/principal.ts";
import { requirePilotConfig } from "../config.ts";
import type { Auth0SessionVerifier, InternalPrincipalDirectory, Principal } from "./contracts.ts";
import { getAuth0SessionVerifier } from "./auth0-session-verifier.ts";
import { mapInternalPrincipal, mapVerifiedAuth0Claims, toServerPrincipal } from "./mapping.ts";
import { getInternalPrincipalDirectory } from "./postgres-directory.ts";
import { createSubjectLookupKey } from "./subject-key.ts";

export type PrincipalBoundaryDependencies = Readonly<{
  verifier: Auth0SessionVerifier;
  directory: InternalPrincipalDirectory;
}>;

/**
 * Resolves a cryptographically verified Auth0 identity through the internal,
 * organization-scoped directory. Unknown, suspended and unlinked identities
 * fail closed and are never auto-provisioned from browser/token role claims.
 */
export async function resolvePrincipal(
  request: Request,
  dependencies: PrincipalBoundaryDependencies,
): Promise<Principal | null> {
  const config = requirePilotConfig();
  const claims = await dependencies.verifier.getVerifiedClaims(request);
  if (!claims) return null;

  const identity = mapVerifiedAuth0Claims(claims, config.auth0.issuer);
  const lookupKey = createSubjectLookupKey(
    identity,
    config.organizationId,
    config.identityLookupSecret,
  );
  const record = await dependencies.directory.findActiveByAuth0Subject(lookupKey);
  if (!record) return null;
  return mapInternalPrincipal(identity, lookupKey, record);
}

/**
 * Route-facing authentication boundary. It accepts only the SDK-verified Auth0
 * session and the active internal authorization mapping; browser/demo roles are
 * never consulted.
 */
export async function requireServerPrincipal(request: Request): Promise<ServerPrincipal> {
  const principal = await resolvePrincipal(request, {
    verifier: getAuth0SessionVerifier(),
    directory: getInternalPrincipalDirectory(),
  });
  if (!principal) {
    throw new ApplicationError(
      "AUTHENTICATION_REQUIRED",
      "Bạn cần đăng nhập để tiếp tục.",
    );
  }
  return toServerPrincipal(principal);
}
