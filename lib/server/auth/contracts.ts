export type VerifiedAuth0Identity = Readonly<{
  issuer: string;
  subject: string;
  auth0OrganizationId: string | null;
  sessionId: string | null;
  authenticatedAt: number | null;
}>;

export type SubjectLookupKey = Readonly<{
  organizationId: string;
  issuer: string;
  subjectHash: string;
}>;

export type PrincipalScope = Readonly<{
  kind: "organization" | "branch" | "depot" | "self";
  ids: readonly string[];
}>;

/**
 * A scope is granted through a role, so it must stay paired with the
 * permission inherited from that same role. Flattening these two dimensions
 * independently can accidentally widen a branch-scoped permission.
 */
export type PermissionScopeGrant = Readonly<{
  permission: string;
  kind: "organization" | "branch";
  ids: readonly string[];
}>;

export type InternalPrincipalRecord = Readonly<{
  actorId: string;
  organizationId: string;
  auth0Issuer: string;
  auth0SubjectHash: string;
  status: "active" | "suspended" | "disabled";
  roleIds: readonly string[];
  permissions: readonly string[];
  scopes: readonly PrincipalScope[];
  permissionScopes: readonly PermissionScopeGrant[];
}>;

export type Principal = Readonly<{
  actorId: string;
  organizationId: string;
  identityProvider: "auth0";
  roleIds: readonly string[];
  permissions: readonly string[];
  scopes: readonly PrincipalScope[];
  permissionScopes: readonly PermissionScopeGrant[];
  sessionId: string | null;
  authenticatedAt: number | null;
}>;

/** Must cryptographically verify signature, issuer, audience, expiry and session. */
export interface Auth0SessionVerifier {
  getVerifiedClaims(request: Request): Promise<Readonly<Record<string, unknown>> | null>;
}

/** Implementations must always query by all three fields, including organizationId. */
export interface InternalPrincipalDirectory {
  findActiveByAuth0Subject(key: SubjectLookupKey): Promise<InternalPrincipalRecord | null>;
}
