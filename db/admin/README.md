# Database administration templates

These files are owner-controlled templates, not application-runtime scripts.
Run them only from an approved migration workstation with a separately audited
owner/migrator connection. Never place a password in this directory or commit a
rendered connection URL.

After the four schema migrations have been applied, grant the minimum cargo
pilot privileges to an existing `NOINHERIT LOGIN` runtime role:

```bash
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -v runtime_role=ksops_runtime \
  -v database_name=ksops \
  -f db/admin/grant_runtime_role.sql
```

The production `DATABASE_URL` must use that runtime role and the provider's
pooled endpoint with full certificate/hostname verification. It must never use
the owner or migrator role. `/api/v1/health/ready` verifies the reviewed
migration checksums, these grants, tenant context, and protected reads before
declaring the pilot ready.
