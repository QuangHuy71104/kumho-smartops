# KSOps database foundation

This directory contains the first production-oriented PostgreSQL schema slice for KSOps. It targets PostgreSQL 16+ and managed PostgreSQL providers such as Supabase and Neon.

## Migration order

Apply every file in `migrations/` in lexical order with `ON_ERROR_STOP` enabled:

1. `0001_extensions_org_iam.sql`
2. `0002_fleet_workforce.sql`
3. `0003_cargo_dispatch.sql`
4. `0004_platform_audit_reporting_rls.sql`
5. `0005_workspace_state.sql`
6. `0006_relational_operations.sql`

The application must create UUIDv7 identifiers. Database columns deliberately have no random UUID default so identity generation remains explicit and testable. All timestamps use UTC-capable `timestamptz`; the UI is responsible for rendering a branch timezone.

Mutable aggregate roots use a `version` column. A write must include the expected version and atomically execute `SET version = version + 1`; zero updated rows maps to HTTP `412 Precondition Failed`. Domain data, its audit event, and its outbox message must commit in one transaction.

RLS expects these transaction-local settings after the server has verified the OIDC session:

```sql
select set_config('app.organization_id', '<organization uuid>', true);
select set_config('app.principal_id', '<principal uuid>', true);
```

Never use session-level settings with a connection pool. Missing or malformed tenant context is denied. Branch/fleet/route scope remains an application authorization decision backed by `iam.principal_role_scope`; organization RLS is the database isolation backstop.

PII lives only in the `iam_private`, `fleet_private`, `workforce_private`, and `cargo_private` schemas. Ciphertext must be produced with envelope encryption and a managed KMS. Lookup hashes are keyed HMAC values, not unsalted hashes. Application roles should not receive direct access to private schemas; expose narrowly authorized application services instead.

## Synthetic development seed

`seeds/dev/001_synthetic_pilot.sql` is optional, deterministic, and contains only fictional records. It has two independent guards and refuses to run unless both custom settings are present:

```powershell
$env:PGOPTIONS = "-c ksops.environment=development -c ksops.allow_synthetic_seed=yes"
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f db/seeds/dev/001_synthetic_pilot.sql
```

Do not enable those settings in production. Production onboarding must use an audited bootstrap command; it must not run the development seed. Never copy production rows into preview or development databases.

`npm run db:seed:relational` initializes the normalized `public` operating tables.
The seed is idempotent, preserves interactive records, migrates compatible legacy
documents once, and contains only the repository's fictional operating data.
The application reads and writes orders, dispatch, bookings, contracts, maintenance,
and invoices through those relational tables; `platform.legacy_workspace_state` is
retained as an empty compatibility marker after its records are migrated.

## Operational notes

- Run migrations with a dedicated migration identity and advisory locking in the deployment pipeline.
- Provision separate application, migration, reporting, and break-glass database roles through infrastructure code. The migrations do not create provider-specific login roles.
- Grant the application only the required schema/table privileges after migrations. `audit.audit_event` and `cargo.cargo_order_event` are additionally protected by immutable-row triggers.
- Assignment overlap is a hard database invariant. Eligibility, maintenance blocks, document validity, capacity, and driver rest policy are checked by the dispatch application service while locking resources in a deterministic order.
- Cleanup of expired idempotency rows and published outbox rows is a bounded scheduled job with retention approved by the data owner.
