import type {
  InternalPrincipalRecord,
  PermissionScopeGrant,
  Principal,
  PrincipalScope,
  SubjectLookupKey,
  VerifiedAuth0Identity,
} from "./contracts.ts";
import type { ServerPrincipal } from "../../../modules/identity/domain/principal.ts";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const PERMISSION_PATTERN = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/u;

export class PrincipalMappingError extends Error {
  readonly code = "PRINCIPAL_MAPPING_FAILED";

  constructor() {
    super("Verified identity could not be mapped to an active internal principal");
    this.name = "PrincipalMappingError";
  }
}

function boundedClaim(value: unknown, maximum: number): string | null {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maximum
    && Array.from(value).every((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 32 && codePoint !== 127;
    })
    ? value
    : null;
}

function normalizeIssuer(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    url.pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Accept only claims already verified by the server-side Auth0 SDK. This helper
 * intentionally ignores any role/permission fields carried in external claims.
 */
export function mapVerifiedAuth0Claims(
  claims: Readonly<Record<string, unknown>>,
  expectedIssuer: string,
): VerifiedAuth0Identity {
  const expected = normalizeIssuer(expectedIssuer);
  const actual = boundedClaim(claims.iss, 2048);
  const subject = boundedClaim(claims.sub, 255);
  if (!expected || !actual || normalizeIssuer(actual) !== expected || !subject) {
    throw new PrincipalMappingError();
  }

  const auth0OrganizationId = claims.org_id === undefined
    ? null
    : boundedClaim(claims.org_id, 255);
  const sessionId = claims.sid === undefined ? null : boundedClaim(claims.sid, 255);
  const authenticatedAt = claims.auth_time === undefined
    ? null
    : typeof claims.auth_time === "number" && Number.isSafeInteger(claims.auth_time) && claims.auth_time >= 0
      ? claims.auth_time
      : null;
  if ((claims.org_id !== undefined && !auth0OrganizationId)
    || (claims.sid !== undefined && !sessionId)
    || (claims.auth_time !== undefined && authenticatedAt === null)) {
    throw new PrincipalMappingError();
  }

  return Object.freeze({
    issuer: expected,
    subject,
    auth0OrganizationId,
    sessionId,
    authenticatedAt,
  });
}

function uniqueSorted(values: readonly string[], validator: (value: string) => boolean) {
  if (!values.every((value) => validator(value))) throw new PrincipalMappingError();
  return Object.freeze([...new Set(values)].sort());
}

function normalizeScopes(scopes: readonly PrincipalScope[]) {
  const normalized = scopes.map((scope) => {
    if (!["organization", "branch", "depot", "self"].includes(scope.kind)) {
      throw new PrincipalMappingError();
    }
    return Object.freeze({
      kind: scope.kind,
      ids: uniqueSorted(scope.ids, (id) => IDENTIFIER_PATTERN.test(id)),
    });
  });
  return Object.freeze([...new Map(normalized.map((scope) => [
    `${scope.kind}:${scope.ids.join(",")}`,
    scope,
  ])).values()].sort((left, right) => (
    `${left.kind}:${left.ids.join(",")}`.localeCompare(`${right.kind}:${right.ids.join(",")}`)
  )));
}

function normalizePermissionScopes(grants: readonly PermissionScopeGrant[]) {
  const normalized = grants.map((grant) => {
    if (!PERMISSION_PATTERN.test(grant.permission)
      || (grant.kind !== "organization" && grant.kind !== "branch")) {
      throw new PrincipalMappingError();
    }
    return Object.freeze({
      permission: grant.permission,
      kind: grant.kind,
      ids: uniqueSorted(grant.ids, (id) => IDENTIFIER_PATTERN.test(id)),
    });
  });
  return Object.freeze([...new Map(normalized.map((grant) => [
    `${grant.permission}:${grant.kind}:${grant.ids.join(",")}`,
    grant,
  ])).values()].sort((left, right) => (
    `${left.permission}:${left.kind}:${left.ids.join(",")}`.localeCompare(
      `${right.permission}:${right.kind}:${right.ids.join(",")}`,
    )
  )));
}

export function mapInternalPrincipal(
  identity: VerifiedAuth0Identity,
  lookupKey: SubjectLookupKey,
  record: InternalPrincipalRecord,
): Principal {
  if (record.status !== "active"
    || record.organizationId !== lookupKey.organizationId
    || record.auth0Issuer !== identity.issuer
    || record.auth0Issuer !== lookupKey.issuer
    || record.auth0SubjectHash !== lookupKey.subjectHash
    || !IDENTIFIER_PATTERN.test(record.actorId)) {
    throw new PrincipalMappingError();
  }

  const permissionScopes = normalizePermissionScopes(record.permissionScopes);
  const permissions = uniqueSorted(
    permissionScopes.map((grant) => grant.permission),
    (permission) => PERMISSION_PATTERN.test(permission),
  );
  const scopes = normalizeScopes(permissionScopes.map((grant) => ({
    kind: grant.kind,
    ids: grant.ids,
  })));
  const declaredPermissions = uniqueSorted(
    record.permissions,
    (permission) => PERMISSION_PATTERN.test(permission),
  );
  const declaredScopes = normalizeScopes(record.scopes);
  if (JSON.stringify(declaredPermissions) !== JSON.stringify(permissions)
    || JSON.stringify(declaredScopes) !== JSON.stringify(scopes)) {
    throw new PrincipalMappingError();
  }

  return Object.freeze({
    actorId: record.actorId,
    organizationId: record.organizationId,
    identityProvider: "auth0",
    roleIds: uniqueSorted(record.roleIds, (role) => IDENTIFIER_PATTERN.test(role)),
    permissions,
    scopes,
    permissionScopes,
    sessionId: identity.sessionId,
    authenticatedAt: identity.authenticatedAt,
  });
}

/** Adapts the identity boundary to the principal consumed by application services. */
export function toServerPrincipal(principal: Principal): ServerPrincipal {
  const permissionScopes: Record<string, "*" | readonly string[]> = {};
  for (const grant of principal.permissionScopes) {
    if (!principal.permissions.includes(grant.permission)) continue;
    if (grant.kind === "organization" && grant.ids.includes(principal.organizationId)) {
      permissionScopes[grant.permission] = "*";
      continue;
    }
    if (grant.kind !== "branch" || permissionScopes[grant.permission] === "*") continue;
    const current = permissionScopes[grant.permission] ?? [];
    permissionScopes[grant.permission] = Object.freeze([
      ...new Set([...current, ...grant.ids]),
    ].sort());
  }
  const permissions = Object.freeze(Object.keys(permissionScopes).sort());

  return Object.freeze({
    id: principal.actorId,
    organizationId: principal.organizationId,
    permissions,
    permissionScopes: Object.freeze(permissionScopes),
    authenticationMethod: "oidc",
  });
}
