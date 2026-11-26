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
7. `0007_role_work_center.sql`
8. `0008_live_transport_simulation.sql`
9. `0009_customer_booking_portal.sql`

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

Migration `0008_live_transport_simulation.sql` keeps a seven-day rolling schedule
for passenger trips and dispatch work in `Asia/Ho_Chi_Minh`. Its refresh function
derives trip, dispatch, and fleet states from the current time and Supabase Cron
runs that function every five minutes when `pg_cron` is available. The relational
seed also invokes the function, so local and managed databases start in a current
state even when Cron is unavailable.

Migration `0009_customer_booking_portal.sql` adds Supabase Auth profiles, passenger
booking orders, and order items for the KumhoGo website. New Google identities are
created as `customer`; email/password accounts become administrators only after the
migration owner runs `SELECT public.promote_user_to_admin('admin@example.com');`.
The application also requires `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Configure Google in Supabase Auth and allow
`/auth/customer/callback` for the deployed site URL before accepting bookings.

## Role Work Center

Migration `0007_role_work_center.sql` adds the shared work queue used by all eight
operating roles. `public.work_items` stores ownership, priority, due time, linked
business resources, and optimistic-concurrency versioning. Comments, status events,
and role notifications are stored in separate append-oriented tables with cascading
foreign keys. All four tables have forced RLS and no direct `PUBLIC`, `anon`, or
`authenticated` privileges; access is expected to flow through reviewed server APIs.

After applying migrations and initializing the relational operating data, populate
the role queues with:

```powershell
npm run db:seed:work-center
```

The command reads `DATABASE_URL` from `.env.local` when needed, inserts exactly three
initial work items for each role, and is safe to run again because work items, events,
and notifications use conflict guards. `npm run db:setup:supabase` now runs migrations,
the relational seed, and the Work Center seed in that order.

## Operational notes

- Run migrations with a dedicated migration identity and advisory locking in the deployment pipeline.
- Provision separate application, migration, reporting, and break-glass database roles through infrastructure code. The migrations do not create provider-specific login roles.
- Grant the application only the required schema/table privileges after migrations. `audit.audit_event` and `cargo.cargo_order_event` are additionally protected by immutable-row triggers.
- Assignment overlap is a hard database invariant. Eligibility, maintenance blocks, document validity, capacity, and driver rest policy are checked by the dispatch application service while locking resources in a deterministic order.
- Cleanup of expired idempotency rows and published outbox rows is a bounded scheduled job with retention approved by the data owner.
