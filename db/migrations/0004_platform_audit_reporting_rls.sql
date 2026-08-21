-- KSOps migration 0004: reliability primitives, audit, read models, and RLS.

BEGIN;

CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS reporting;

CREATE TABLE platform.idempotency_key (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  principal_id uuid NOT NULL,
  operation varchar(120) NOT NULL,
  key_hmac bytea NOT NULL CHECK (octet_length(key_hmac) = 32),
  request_hash bytea NOT NULL CHECK (octet_length(request_hash) = 32),
  state varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'completed', 'failed')),
  http_status smallint CHECK (http_status BETWEEN 100 AND 599),
  safe_response jsonb,
  resource_type varchar(60),
  resource_id uuid,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, principal_id, operation, key_hmac),
  FOREIGN KEY (organization_id, principal_id)
    REFERENCES iam.principal(organization_id, id),
  CHECK (expires_at > created_at),
  CHECK (locked_until IS NULL OR locked_until <= expires_at),
  CHECK (safe_response IS NULL OR octet_length(safe_response::text) <= 32768),
  CHECK (
    (state = 'pending' AND completed_at IS NULL)
    OR (state IN ('completed', 'failed') AND completed_at IS NOT NULL)
  ),
  CHECK (state <> 'completed' OR http_status IS NOT NULL)
);

CREATE INDEX idempotency_expiry_idx
  ON platform.idempotency_key (expires_at);

CREATE INDEX idempotency_pending_lease_idx
  ON platform.idempotency_key (organization_id, locked_until)
  WHERE state = 'pending';

CREATE TABLE platform.outbox_message (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  aggregate_type varchar(60) NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version bigint NOT NULL CHECK (aggregate_version > 0),
  event_type varchar(120) NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  available_at timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  locked_until timestamptz,
  published_at timestamptz,
  last_error_code varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (
    organization_id,
    aggregate_type,
    aggregate_id,
    aggregate_version,
    event_type
  ),
  CHECK (octet_length(payload::text) <= 65536),
  CHECK (available_at >= occurred_at - interval '30 days'),
  CHECK (published_at IS NULL OR published_at >= occurred_at)
);

CREATE INDEX outbox_ready_idx
  ON platform.outbox_message (available_at, id)
  WHERE published_at IS NULL;

CREATE INDEX outbox_aggregate_idx
  ON platform.outbox_message
    (organization_id, aggregate_type, aggregate_id, aggregate_version);

CREATE TABLE audit.audit_event (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  actor_principal_id uuid NOT NULL,
  action varchar(120) NOT NULL,
  resource_type varchar(60) NOT NULL,
  resource_id uuid NOT NULL,
  outcome varchar(16) NOT NULL CHECK (outcome IN ('success', 'denied', 'failure')),
  request_id varchar(64) NOT NULL,
  reason_code varchar(80),
  redacted_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_ip_hmac bytea
    CHECK (source_ip_hmac IS NULL OR octet_length(source_ip_hmac) = 32),
  content_hash bytea NOT NULL CHECK (octet_length(content_hash) = 32),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, actor_principal_id)
    REFERENCES iam.principal(organization_id, id),
  CHECK (octet_length(redacted_changes::text) <= 32768),
  CHECK (recorded_at >= occurred_at - interval '30 days')
);

CREATE INDEX audit_event_time_idx
  ON audit.audit_event (organization_id, occurred_at DESC, id);

CREATE INDEX audit_event_actor_idx
  ON audit.audit_event
    (organization_id, actor_principal_id, occurred_at DESC);

CREATE INDEX audit_event_resource_idx
  ON audit.audit_event
    (organization_id, resource_type, resource_id, occurred_at DESC);

CREATE INDEX audit_event_time_brin_idx
  ON audit.audit_event USING brin (occurred_at);

-- Reject mutation even if a table grant is accidentally broadened. Normal
-- corrections are represented by a new event referencing the affected resource.
CREATE FUNCTION audit.reject_row_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'append-only event rows cannot be updated or deleted'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER audit_event_immutable
BEFORE UPDATE OR DELETE ON audit.audit_event
FOR EACH ROW EXECUTE FUNCTION audit.reject_row_mutation();

CREATE TRIGGER cargo_order_event_immutable
BEFORE UPDATE OR DELETE ON cargo.cargo_order_event
FOR EACH ROW EXECUTE FUNCTION audit.reject_row_mutation();

REVOKE UPDATE, DELETE ON audit.audit_event FROM PUBLIC;
REVOKE UPDATE, DELETE ON cargo.cargo_order_event FROM PUBLIC;

-- Sanitized operational projection. It contains public identifiers and status
-- only; names, phone numbers, precise customer addresses, and documents are banned.
CREATE TABLE reporting.ops_work_item (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  branch_id uuid NOT NULL,
  resource_type varchar(40) NOT NULL
    CHECK (resource_type IN (
      'cargo_order', 'dispatch_task', 'vehicle', 'driver',
      'booking', 'contract', 'maintenance_order'
    )),
  resource_id uuid NOT NULL,
  public_code varchar(64) NOT NULL,
  status varchar(40) NOT NULL,
  service_type varchar(40),
  planned_at timestamptz,
  due_at timestamptz,
  risk_code varchar(16) NOT NULL DEFAULT 'low'
    CHECK (risk_code IN ('low', 'medium', 'high')),
  vehicle_id uuid,
  driver_id uuid,
  source_version bigint NOT NULL CHECK (source_version > 0),
  projected_at timestamptz NOT NULL DEFAULT now(),
  search_document tsvector NOT NULL DEFAULT ''::tsvector,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, resource_type, resource_id),
  FOREIGN KEY (organization_id, branch_id)
    REFERENCES org.branch(organization_id, id),
  FOREIGN KEY (organization_id, vehicle_id)
    REFERENCES fleet.vehicle(organization_id, id),
  FOREIGN KEY (organization_id, driver_id)
    REFERENCES workforce.driver(organization_id, id)
);

CREATE INDEX ops_work_item_queue_idx
  ON reporting.ops_work_item
    (organization_id, branch_id, status, due_at, resource_id);

CREATE INDEX ops_work_item_risk_idx
  ON reporting.ops_work_item
    (organization_id, branch_id, risk_code, due_at)
  WHERE risk_code IN ('medium', 'high');

CREATE INDEX ops_work_item_search_idx
  ON reporting.ops_work_item USING gin (search_document);

CREATE TABLE reporting.ops_metric_bucket (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  branch_id uuid,
  bucket_start timestamptz NOT NULL,
  bucket_end timestamptz NOT NULL,
  metric_key varchar(80) NOT NULL,
  metric_value numeric(20,4) NOT NULL,
  unit varchar(32) NOT NULL,
  definition_version varchar(40) NOT NULL,
  safe_dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE NULLS NOT DISTINCT (
    organization_id,
    branch_id,
    bucket_start,
    metric_key,
    definition_version
  ),
  FOREIGN KEY (organization_id, branch_id)
    REFERENCES org.branch(organization_id, id),
  CHECK (bucket_end > bucket_start),
  CHECK (octet_length(safe_dimensions::text) <= 8192)
);

CREATE INDEX ops_metric_query_idx
  ON reporting.ops_metric_bucket
    (organization_id, branch_id, metric_key, bucket_start DESC);

-- Invalid or absent GUC values return NULL, causing every tenant policy to deny.
CREATE FUNCTION iam.current_organization_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN nullif(current_setting('app.organization_id', true), '')::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE FUNCTION iam.current_principal_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN nullif(current_setting('app.principal_id', true), '')::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE FUNCTION iam.tenant_context_matches(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT target_organization_id = iam.current_organization_id()
     AND iam.current_principal_id() IS NOT NULL
$$;

ALTER TABLE org.organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE org.organization FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON org.organization
  FOR ALL
  USING (iam.tenant_context_matches(id))
  WITH CHECK (iam.tenant_context_matches(id));

-- Every table in this closed list has a non-null organization_id column. Keep
-- this list synchronized whenever a new tenant table is introduced.
DO $rls$
DECLARE
  target_table regclass;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'org.branch'::regclass,
    'org.location'::regclass,
    'iam.principal'::regclass,
    'iam_private.principal_profile'::regclass,
    'iam.role'::regclass,
    'iam.role_permission'::regclass,
    'iam.access_scope'::regclass,
    'iam.principal_role_scope'::regclass,
    'fleet.vehicle'::regclass,
    'fleet_private.vehicle_registration'::regclass,
    'workforce.driver'::regclass,
    'workforce.driver_qualification'::regclass,
    'workforce_private.driver_profile'::regclass,
    'workforce_private.driver_document'::regclass,
    'cargo.cargo_order'::regclass,
    'cargo.cargo_package'::regclass,
    'cargo_private.order_contact'::regclass,
    'cargo.cargo_order_event'::regclass,
    'dispatch.dispatch_task'::regclass,
    'dispatch.dispatch_task_cargo'::regclass,
    'dispatch.dispatch_assignment'::regclass,
    'platform.idempotency_key'::regclass,
    'platform.outbox_message'::regclass,
    'audit.audit_event'::regclass,
    'reporting.ops_work_item'::regclass,
    'reporting.ops_metric_bucket'::regclass
  ]
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target_table);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s FOR ALL '
      'USING (iam.tenant_context_matches(organization_id)) '
      'WITH CHECK (iam.tenant_context_matches(organization_id))',
      target_table
    );
  END LOOP;
END;
$rls$;

COMMENT ON TABLE platform.idempotency_key IS
  'Stores only HMAC/fingerprint and a bounded PII-safe replay response.';
COMMENT ON TABLE platform.outbox_message IS
  'Transactional outbox; consumers are at-least-once and must be idempotent.';
COMMENT ON TABLE audit.audit_event IS
  'Append-only, redacted audit evidence. No raw request payload, token, contact, or GPS data.';
COMMENT ON TABLE reporting.ops_work_item IS
  'Idempotent PII-free dashboard projection updated only when source_version advances.';

COMMIT;
