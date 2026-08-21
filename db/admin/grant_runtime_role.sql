\set ON_ERROR_STOP on

\if :{?runtime_role}
\else
  \echo 'runtime_role is required (existing PostgreSQL role; no password is accepted by this script).'
  \quit
\endif

\if :{?database_name}
\else
  \echo 'database_name is required.'
  \quit
\endif

BEGIN;

-- Reset only the application schemas so rerunning this reviewed grant set is
-- deterministic. Ownership and migration privileges stay with the separate
-- migrator role.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA iam, org, cargo, platform, audit
  FROM :"runtime_role";
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA iam, org, cargo, platform, audit
  FROM :"runtime_role";

GRANT CONNECT ON DATABASE :"database_name" TO :"runtime_role";
GRANT USAGE ON SCHEMA iam, org, cargo, platform, audit TO :"runtime_role";
GRANT SELECT ON TABLE public.ksops_schema_migration TO :"runtime_role";

-- Server-side identity directory. External token claims never grant access.
GRANT SELECT ON TABLE
  iam.principal,
  iam.principal_role_scope,
  iam.role,
  iam.role_permission,
  iam.access_scope
TO :"runtime_role";

-- Cargo pilot read models and validated reference data.
GRANT SELECT ON TABLE
  org.branch,
  org.location,
  cargo.cargo_order,
  cargo.cargo_order_event
TO :"runtime_role";

-- All writes pass through the application service and tenant RLS policies.
GRANT INSERT, UPDATE ON TABLE cargo.cargo_order TO :"runtime_role";
GRANT INSERT ON TABLE cargo.cargo_order_event TO :"runtime_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE platform.idempotency_key TO :"runtime_role";
GRANT INSERT ON TABLE platform.outbox_message TO :"runtime_role";
GRANT INSERT ON TABLE audit.audit_event TO :"runtime_role";

GRANT EXECUTE ON FUNCTION iam.current_organization_id() TO :"runtime_role";
GRANT EXECUTE ON FUNCTION iam.current_principal_id() TO :"runtime_role";

ALTER ROLE :"runtime_role" SET statement_timeout = '10s';
ALTER ROLE :"runtime_role" SET idle_in_transaction_session_timeout = '10s';

COMMIT;
