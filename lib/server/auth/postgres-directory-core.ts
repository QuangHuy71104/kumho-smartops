import type {
  InternalPrincipalDirectory,
  InternalPrincipalRecord,
  PermissionScopeGrant,
  PrincipalScope,
  SubjectLookupKey,
} from "./contracts.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SUBJECT_HASH_PATTERN = /^[a-f0-9]{64}$/u;
const PERMISSION_PATTERN = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/u;
const BOOTSTRAP_PRINCIPAL_ID = "00000000-0000-0000-0000-000000000000";

export interface PrincipalQueryClient {
  query(
    text: string,
    values: readonly unknown[],
  ): Promise<Readonly<{ rows: readonly Record<string, unknown>[] }>>;
}

export interface PrincipalTransactionRunner {
  run<T>(work: (client: PrincipalQueryClient) => Promise<T>): Promise<T>;
}

export type PostgresPrincipalDirectoryOptions = Readonly<{
  organizationId: string;
  identityProvider: string;
  issuer: string;
  transactions: PrincipalTransactionRunner;
}>;

export class PrincipalDirectoryDataError extends Error {
  readonly code = "PRINCIPAL_DIRECTORY_DATA_INVALID";

  constructor() {
    super("Internal principal directory returned invalid data");
    this.name = "PrincipalDirectoryDataError";
  }
}

const SET_BOOTSTRAP_CONTEXT_SQL = `
  SELECT
    set_config('app.organization_id', $1, true),
    set_config('app.principal_id', $2, true)
`;

const FIND_ACTIVE_PRINCIPAL_SQL = `
  SELECT
    p.id::text AS actor_id,
    p.organization_id::text AS organization_id,
    COALESCE(
      array_agg(DISTINCT r.id::text ORDER BY r.id::text)
        FILTER (WHERE r.id IS NOT NULL),
      ARRAY[]::text[]
    ) AS role_ids,
    COALESCE(
      jsonb_agg(DISTINCT CASE
        WHEN scope.kind = 'organization' THEN jsonb_build_object(
          'permission', rp.permission_key,
          'kind', 'organization',
          'ids', jsonb_build_array(p.organization_id::text)
        )
        WHEN scope.kind = 'branch' THEN jsonb_build_object(
          'permission', rp.permission_key,
          'kind', 'branch',
          'ids', jsonb_build_array(scope.branch_id::text)
        )
      END) FILTER (WHERE scope.id IS NOT NULL AND rp.permission_key IS NOT NULL),
      '[]'::jsonb
    ) AS permission_scopes
  FROM iam.principal AS p
  LEFT JOIN iam.principal_role_scope AS grant_scope
    ON grant_scope.organization_id = p.organization_id
   AND grant_scope.principal_id = p.id
   AND grant_scope.revoked_at IS NULL
   AND grant_scope.valid_during @> statement_timestamp()
  LEFT JOIN iam.role AS r
    ON r.organization_id = p.organization_id
   AND r.id = grant_scope.role_id
   AND r.status = 'active'
  LEFT JOIN iam.access_scope AS scope
    ON scope.organization_id = p.organization_id
   AND scope.id = grant_scope.scope_id
   AND r.id IS NOT NULL
  LEFT JOIN iam.role_permission AS rp
    ON rp.organization_id = p.organization_id
   AND rp.role_id = r.id
  WHERE p.organization_id = $1::uuid
    AND p.identity_provider = $2
    AND p.subject_hmac = $3::bytea
    AND p.kind = 'human'
    AND p.status = 'active'
  GROUP BY p.id, p.organization_id
  LIMIT 1
`;

function stringArray(
  value: unknown,
  validator: (item: string) => boolean,
): readonly string[] {
  if (!Array.isArray(value)
    || !value.every((item): item is string => typeof item === "string" && validator(item))) {
    throw new PrincipalDirectoryDataError();
  }
  return Object.freeze([...new Set(value)].sort());
}

function permissionScopesFrom(value: unknown): readonly PermissionScopeGrant[] {
  if (!Array.isArray(value)) throw new PrincipalDirectoryDataError();

  const grants = value.map((candidate): PermissionScopeGrant => {
    if (!candidate || typeof candidate !== "object") throw new PrincipalDirectoryDataError();
    const grant = candidate as Record<string, unknown>;
    if (typeof grant.permission !== "string"
      || !PERMISSION_PATTERN.test(grant.permission)
      || (grant.kind !== "organization" && grant.kind !== "branch")) {
      throw new PrincipalDirectoryDataError();
    }
    const ids = stringArray(grant.ids, (id) => UUID_PATTERN.test(id));
    if (ids.length !== 1) throw new PrincipalDirectoryDataError();
    return Object.freeze({ permission: grant.permission, kind: grant.kind, ids });
  });

  const uniqueGrants = new Map(
    grants.map((grant) => [
      `${grant.permission}:${grant.kind}:${grant.ids.join(",")}`,
      grant,
    ]),
  );
  return Object.freeze([...uniqueGrants.values()].sort((left, right) => (
    `${left.permission}:${left.kind}:${left.ids.join(",")}`.localeCompare(
      `${right.permission}:${right.kind}:${right.ids.join(",")}`,
    )
  )));
}

function scopesFromGrants(grants: readonly PermissionScopeGrant[]): readonly PrincipalScope[] {
  const uniqueScopes = new Map<string, PrincipalScope>();
  for (const grant of grants) {
    const scope = Object.freeze({ kind: grant.kind, ids: grant.ids });
    uniqueScopes.set(`${scope.kind}:${scope.ids.join(",")}`, scope);
  }
  return Object.freeze([...uniqueScopes.values()].sort((left, right) => (
    `${left.kind}:${left.ids.join(",")}`.localeCompare(`${right.kind}:${right.ids.join(",")}`)
  )));
}

function decodeRecord(
  row: Record<string, unknown>,
  organizationId: string,
  issuer: string,
  subjectHash: string,
): InternalPrincipalRecord {
  if (typeof row.actor_id !== "string"
    || !UUID_PATTERN.test(row.actor_id)
    || row.organization_id !== organizationId) {
    throw new PrincipalDirectoryDataError();
  }

  const permissionScopes = permissionScopesFrom(row.permission_scopes);
  return Object.freeze({
    actorId: row.actor_id,
    organizationId,
    auth0Issuer: issuer,
    auth0SubjectHash: subjectHash,
    status: "active",
    roleIds: stringArray(row.role_ids, (roleId) => UUID_PATTERN.test(roleId)),
    permissions: Object.freeze([...new Set(permissionScopes.map((grant) => grant.permission))].sort()),
    scopes: scopesFromGrants(permissionScopes),
    permissionScopes,
  });
}

/**
 * Tenant-pinned principal lookup. RLS is bootstrapped inside the same database
 * transaction before any tenant table is queried.
 */
export class PostgresInternalPrincipalDirectory implements InternalPrincipalDirectory {
  private readonly organizationId: string;
  private readonly identityProvider: string;
  private readonly issuer: string;
  private readonly transactions: PrincipalTransactionRunner;

  constructor(options: PostgresPrincipalDirectoryOptions) {
    if (!UUID_PATTERN.test(options.organizationId)
      || options.identityProvider.length < 1
      || options.identityProvider.length > 120
      || options.issuer.length < 1) {
      throw new PrincipalDirectoryDataError();
    }
    this.organizationId = options.organizationId.toLocaleLowerCase("en-US");
    this.identityProvider = options.identityProvider;
    this.issuer = options.issuer;
    this.transactions = options.transactions;
  }

  async findActiveByAuth0Subject(
    key: SubjectLookupKey,
  ): Promise<InternalPrincipalRecord | null> {
    if (key.organizationId !== this.organizationId
      || key.issuer !== this.issuer
      || !SUBJECT_HASH_PATTERN.test(key.subjectHash)) {
      return null;
    }

    return this.transactions.run(async (client) => {
      await client.query(SET_BOOTSTRAP_CONTEXT_SQL, [
        this.organizationId,
        BOOTSTRAP_PRINCIPAL_ID,
      ]);
      const result = await client.query(FIND_ACTIVE_PRINCIPAL_SQL, [
        this.organizationId,
        this.identityProvider,
        Buffer.from(key.subjectHash, "hex"),
      ]);
      const row = result.rows[0];
      return row
        ? decodeRecord(row, this.organizationId, this.issuer, key.subjectHash)
        : null;
    });
  }
}
