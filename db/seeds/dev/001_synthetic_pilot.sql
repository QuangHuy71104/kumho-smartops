-- SYNTHETIC DEVELOPMENT DATA ONLY.
-- This script intentionally contains no real organization, person, registration,
-- contact, address, credential, or operational schedule.

BEGIN;

DO $seed_guard$
BEGIN
  IF current_setting('ksops.environment', true) IS DISTINCT FROM 'development' THEN
    RAISE EXCEPTION 'synthetic seed refused: ksops.environment must equal development';
  END IF;

  IF current_setting('ksops.allow_synthetic_seed', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'synthetic seed refused: ksops.allow_synthetic_seed must equal yes';
  END IF;
END;
$seed_guard$;

-- Fixed UUIDs make the seed idempotent and make cross-module tests reproducible.
SELECT set_config('app.organization_id', '0191a000-0000-7000-8000-000000000001', true);
SELECT set_config('app.principal_id', '0191a000-0000-7000-8000-000000000301', true);

INSERT INTO org.organization (
  id, code, legal_name, default_timezone, status, created_at, updated_at
) VALUES (
  '0191a000-0000-7000-8000-000000000001',
  'SYNTHETIC_TRANSPORT',
  'Doanh nghiệp vận tải mô phỏng',
  'Asia/Ho_Chi_Minh',
  'active',
  '2026-08-21T00:00:00Z',
  '2026-08-21T00:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO org.branch (
  id, organization_id, code, name, kind, timezone, status, created_at, updated_at
) VALUES
  (
    '0191a000-0000-7000-8000-000000000101',
    '0191a000-0000-7000-8000-000000000001',
    'BRANCH_DEMO_A',
    'Chi nhánh mô phỏng A',
    'branch',
    'Asia/Ho_Chi_Minh',
    'active',
    '2026-08-21T00:00:00Z',
    '2026-08-21T00:00:00Z'
  ),
  (
    '0191a000-0000-7000-8000-000000000102',
    '0191a000-0000-7000-8000-000000000001',
    'BRANCH_DEMO_B',
    'Chi nhánh mô phỏng B',
    'branch',
    'Asia/Ho_Chi_Minh',
    'active',
    '2026-08-21T00:00:00Z',
    '2026-08-21T00:00:00Z'
  )
ON CONFLICT DO NOTHING;

INSERT INTO org.location (
  id, organization_id, branch_id, public_code, kind, display_name,
  status, created_at, updated_at
) VALUES
  (
    '0191a000-0000-7000-8000-000000000201',
    '0191a000-0000-7000-8000-000000000001',
    '0191a000-0000-7000-8000-000000000101',
    'LOCATION_DEMO_A',
    'warehouse',
    'Điểm trung chuyển mô phỏng A',
    'active',
    '2026-08-21T00:00:00Z',
    '2026-08-21T00:00:00Z'
  ),
  (
    '0191a000-0000-7000-8000-000000000202',
    '0191a000-0000-7000-8000-000000000001',
    '0191a000-0000-7000-8000-000000000102',
    'LOCATION_DEMO_B',
    'warehouse',
    'Điểm trung chuyển mô phỏng B',
    'active',
    '2026-08-21T00:00:00Z',
    '2026-08-21T00:00:00Z'
  )
ON CONFLICT DO NOTHING;

INSERT INTO iam.principal (
  id, organization_id, kind, identity_provider, subject_hmac, display_alias,
  status, created_at, updated_at
) VALUES (
  '0191a000-0000-7000-8000-000000000301',
  '0191a000-0000-7000-8000-000000000001',
  'human',
  'synthetic-oidc-provider.invalid',
  decode(repeat('11', 32), 'hex'),
  'Điều phối viên mô phỏng',
  'active',
  '2026-08-21T00:00:00Z',
  '2026-08-21T00:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO iam.role (
  id, organization_id, code, name, description, status, created_at, updated_at
) VALUES (
  '0191a000-0000-7000-8000-000000000401',
  '0191a000-0000-7000-8000-000000000001',
  'DISPATCHER_DEMO',
  'Vai trò điều phối mô phỏng',
  'Chỉ dùng để kiểm thử phát triển bằng dữ liệu giả lập.',
  'active',
  '2026-08-21T00:00:00Z',
  '2026-08-21T00:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO iam.role_permission (organization_id, role_id, permission_key) VALUES
  ('0191a000-0000-7000-8000-000000000001', '0191a000-0000-7000-8000-000000000401', 'dashboard:read'),
  ('0191a000-0000-7000-8000-000000000001', '0191a000-0000-7000-8000-000000000401', 'cargo-order:read'),
  ('0191a000-0000-7000-8000-000000000001', '0191a000-0000-7000-8000-000000000401', 'cargo-order:create'),
  ('0191a000-0000-7000-8000-000000000001', '0191a000-0000-7000-8000-000000000401', 'cargo-order:transition'),
  ('0191a000-0000-7000-8000-000000000001', '0191a000-0000-7000-8000-000000000401', 'cargo-order:resolve-exception'),
  ('0191a000-0000-7000-8000-000000000001', '0191a000-0000-7000-8000-000000000401', 'dispatch:read'),
  ('0191a000-0000-7000-8000-000000000001', '0191a000-0000-7000-8000-000000000401', 'dispatch:assign')
ON CONFLICT DO NOTHING;

INSERT INTO iam.access_scope (
  id, organization_id, kind, branch_id, parent_scope_id, label, created_at
) VALUES (
  '0191a000-0000-7000-8000-000000000501',
  '0191a000-0000-7000-8000-000000000001',
  'organization',
  NULL,
  NULL,
  'Toàn doanh nghiệp mô phỏng',
  '2026-08-21T00:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO iam.access_scope (
  id, organization_id, kind, branch_id, parent_scope_id, label, created_at
) VALUES (
  '0191a000-0000-7000-8000-000000000502',
  '0191a000-0000-7000-8000-000000000001',
  'branch',
  '0191a000-0000-7000-8000-000000000101',
  '0191a000-0000-7000-8000-000000000501',
  'Chi nhánh mô phỏng A',
  '2026-08-21T00:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO iam.principal_role_scope (
  id, organization_id, principal_id, role_id, scope_id, valid_during,
  granted_by_principal_id, grant_reason, created_at
) VALUES (
  '0191a000-0000-7000-8000-000000000511',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000301',
  '0191a000-0000-7000-8000-000000000401',
  '0191a000-0000-7000-8000-000000000502',
  tstzrange('2026-01-01T00:00:00Z', NULL, '[)'),
  '0191a000-0000-7000-8000-000000000301',
  'Khởi tạo kịch bản mô phỏng có kiểm soát',
  '2026-08-21T00:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO fleet.vehicle (
  id, organization_id, home_branch_id, public_code, vehicle_type,
  seat_capacity, cargo_capacity_grams, operational_status, created_at, updated_at
) VALUES (
  '0191a000-0000-7000-8000-000000000601',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000101',
  'VEHICLE-DEMO-01',
  'cargo_medium',
  2,
  4000000,
  'available',
  '2026-08-21T00:00:00Z',
  '2026-08-21T00:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO workforce.driver (
  id, organization_id, home_branch_id, public_code, display_alias,
  operational_status, created_at, updated_at
) VALUES (
  '0191a000-0000-7000-8000-000000000701',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000101',
  'DRIVER-DEMO-01',
  'Tài xế mô phỏng 01',
  'available',
  '2026-08-21T00:00:00Z',
  '2026-08-21T00:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO workforce.driver_qualification (
  id, organization_id, driver_id, qualification_type, valid_during,
  verification_status, verified_by_principal_id, verified_at,
  evidence_reference, created_at, updated_at
) VALUES (
  '0191a000-0000-7000-8000-000000000711',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000701',
  'CARGO_MEDIUM_DEMO',
  daterange('2026-01-01', '2027-01-01', '[)'),
  'verified',
  '0191a000-0000-7000-8000-000000000301',
  '2026-08-21T00:00:00Z',
  'synthetic-evidence-reference',
  '2026-08-21T00:00:00Z',
  '2026-08-21T00:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO cargo.cargo_order (
  id, organization_id, owning_branch_id, assigned_branch_id, public_code,
  service_level, status, origin_location_id, destination_location_id,
  package_count, total_weight_grams, declared_value_minor, currency,
  sla_due_at, created_by_principal_id, created_at, updated_at
) VALUES (
  '0191a000-0000-7000-8000-000000000801',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000101',
  '0191a000-0000-7000-8000-000000000102',
  'CARGO-DEMO-0001',
  'standard',
  'confirmed',
  '0191a000-0000-7000-8000-000000000201',
  '0191a000-0000-7000-8000-000000000202',
  2,
  50000,
  1000000,
  'VND',
  '2026-08-22T10:00:00Z',
  '0191a000-0000-7000-8000-000000000301',
  '2026-08-21T01:00:00Z',
  '2026-08-21T01:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO cargo.cargo_package (
  id, organization_id, cargo_order_id, public_code, category_code,
  quantity, unit_weight_grams, fragile, created_at
) VALUES (
  '0191a000-0000-7000-8000-000000000811',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000801',
  'PACKAGE-DEMO-0001',
  'SYNTHETIC_GENERAL',
  2,
  25000,
  false,
  '2026-08-21T01:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO cargo.cargo_order_event (
  id, organization_id, cargo_order_id, aggregate_version, from_status,
  to_status, reason_code, actor_principal_id, occurred_at, recorded_at, safe_metadata
) VALUES (
  '0191a000-0000-7000-8000-000000000821',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000801',
  1,
  NULL,
  'confirmed',
  'SYNTHETIC_SEED',
  '0191a000-0000-7000-8000-000000000301',
  '2026-08-21T01:00:00Z',
  '2026-08-21T01:00:00Z',
  '{"synthetic":true}'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO dispatch.dispatch_task (
  id, organization_id, owning_branch_id, public_code, task_type,
  service_period, origin_location_id, destination_location_id, status,
  required_seats, required_weight_grams, created_by_principal_id,
  created_at, updated_at
) VALUES (
  '0191a000-0000-7000-8000-000000000901',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000101',
  'DISPATCH-DEMO-0001',
  'cargo',
  tstzrange('2026-08-22T01:00:00Z', '2026-08-22T05:00:00Z', '[)'),
  '0191a000-0000-7000-8000-000000000201',
  '0191a000-0000-7000-8000-000000000202',
  'planned',
  0,
  50000,
  '0191a000-0000-7000-8000-000000000301',
  '2026-08-21T01:10:00Z',
  '2026-08-21T01:10:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO dispatch.dispatch_task_cargo (
  organization_id, dispatch_task_id, cargo_order_id, segment_sequence, status, created_at
) VALUES (
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000901',
  '0191a000-0000-7000-8000-000000000801',
  1,
  'planned',
  '2026-08-21T01:10:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO dispatch.dispatch_assignment (
  id, organization_id, dispatch_task_id, vehicle_id, driver_id, duty_period,
  status, reason_code, policy_version, policy_snapshot_hash,
  created_by_principal_id, created_at, updated_at
) VALUES (
  '0191a000-0000-7000-8000-000000000a01',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000901',
  '0191a000-0000-7000-8000-000000000601',
  '0191a000-0000-7000-8000-000000000701',
  tstzrange('2026-08-22T01:00:00Z', '2026-08-22T05:00:00Z', '[)'),
  'confirmed',
  'SYNTHETIC_POLICY_PASS',
  'dispatch-policy-demo-v1',
  decode(repeat('22', 32), 'hex'),
  '0191a000-0000-7000-8000-000000000301',
  '2026-08-21T01:15:00Z',
  '2026-08-21T01:15:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO platform.idempotency_key (
  id, organization_id, principal_id, operation, key_hmac, request_hash,
  state, http_status, safe_response, resource_type, resource_id,
  created_at, completed_at, expires_at
) VALUES (
  '0191a000-0000-7000-8000-000000000b01',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000301',
  'POST:/api/v1/cargo-orders',
  decode(repeat('33', 32), 'hex'),
  decode(repeat('44', 32), 'hex'),
  'completed',
  201,
  '{"resourceCode":"CARGO-DEMO-0001","synthetic":true}'::jsonb,
  'cargo_order',
  '0191a000-0000-7000-8000-000000000801',
  '2026-08-21T01:00:00Z',
  '2026-08-21T01:00:01Z',
  '2026-08-23T01:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO platform.outbox_message (
  id, organization_id, aggregate_type, aggregate_id, aggregate_version,
  event_type, payload, occurred_at, available_at, created_at
) VALUES (
  '0191a000-0000-7000-8000-000000000c01',
  '0191a000-0000-7000-8000-000000000001',
  'cargo_order',
  '0191a000-0000-7000-8000-000000000801',
  1,
  'cargo.order-confirmed.v1',
  '{"cargoOrderId":"0191a000-0000-7000-8000-000000000801","synthetic":true}'::jsonb,
  '2026-08-21T01:00:00Z',
  '2026-08-21T01:00:00Z',
  '2026-08-21T01:00:00Z'
) ON CONFLICT DO NOTHING;

INSERT INTO audit.audit_event (
  id, organization_id, occurred_at, recorded_at, actor_principal_id,
  action, resource_type, resource_id, outcome, request_id, reason_code,
  redacted_changes, content_hash
) VALUES (
  '0191a000-0000-7000-8000-000000000d01',
  '0191a000-0000-7000-8000-000000000001',
  '2026-08-21T01:00:00Z',
  '2026-08-21T01:00:00Z',
  '0191a000-0000-7000-8000-000000000301',
  'cargo.order.created',
  'cargo_order',
  '0191a000-0000-7000-8000-000000000801',
  'success',
  'request-synthetic-0001',
  'SYNTHETIC_SEED',
  '[{"field":"status","to":"confirmed"}]'::jsonb,
  decode(repeat('55', 32), 'hex')
) ON CONFLICT DO NOTHING;

INSERT INTO reporting.ops_work_item (
  id, organization_id, branch_id, resource_type, resource_id, public_code,
  status, service_type, planned_at, due_at, risk_code, vehicle_id, driver_id,
  source_version, projected_at, search_document
) VALUES (
  '0191a000-0000-7000-8000-000000000e01',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000101',
  'cargo_order',
  '0191a000-0000-7000-8000-000000000801',
  'CARGO-DEMO-0001',
  'confirmed',
  'standard',
  '2026-08-22T01:00:00Z',
  '2026-08-22T10:00:00Z',
  'low',
  '0191a000-0000-7000-8000-000000000601',
  '0191a000-0000-7000-8000-000000000701',
  1,
  '2026-08-21T01:00:00Z',
  to_tsvector('simple', 'CARGO-DEMO-0001 confirmed standard')
) ON CONFLICT DO NOTHING;

INSERT INTO reporting.ops_metric_bucket (
  id, organization_id, branch_id, bucket_start, bucket_end, metric_key,
  metric_value, unit, definition_version, safe_dimensions, computed_at
) VALUES (
  '0191a000-0000-7000-8000-000000000f01',
  '0191a000-0000-7000-8000-000000000001',
  '0191a000-0000-7000-8000-000000000101',
  '2026-08-21T01:00:00Z',
  '2026-08-21T01:05:00Z',
  'cargo.active_count',
  1,
  'orders',
  'ops-metrics-demo-v1',
  '{"synthetic":true}'::jsonb,
  '2026-08-21T01:05:00Z'
) ON CONFLICT DO NOTHING;

COMMIT;
