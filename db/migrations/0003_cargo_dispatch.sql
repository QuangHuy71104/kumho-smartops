-- KSOps migration 0003: cargo order aggregate and conflict-safe dispatch.

BEGIN;

CREATE SCHEMA IF NOT EXISTS cargo;
CREATE SCHEMA IF NOT EXISTS cargo_private;
CREATE SCHEMA IF NOT EXISTS dispatch;

CREATE TABLE cargo.cargo_order (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  owning_branch_id uuid NOT NULL,
  assigned_branch_id uuid,
  public_code varchar(48) NOT NULL,
  service_level varchar(24) NOT NULL
    CHECK (service_level IN ('standard', 'same_day', 'express', 'full_trip')),
  status varchar(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'quoted', 'confirmed', 'received', 'loaded', 'in_transit',
      'arrived', 'delivered', 'reconciled', 'exception', 'cancelled'
    )),
  origin_location_id uuid NOT NULL,
  destination_location_id uuid NOT NULL,
  package_count integer NOT NULL CHECK (package_count > 0 AND package_count <= 10000),
  total_weight_grams bigint NOT NULL
    CHECK (total_weight_grams > 0 AND total_weight_grams <= 100000000),
  declared_value_minor bigint CHECK (declared_value_minor IS NULL OR declared_value_minor >= 0),
  currency char(3) NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
  sla_due_at timestamptz NOT NULL,
  created_by_principal_id uuid NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, public_code),
  FOREIGN KEY (organization_id, owning_branch_id)
    REFERENCES org.branch(organization_id, id),
  FOREIGN KEY (organization_id, assigned_branch_id)
    REFERENCES org.branch(organization_id, id),
  FOREIGN KEY (organization_id, origin_location_id)
    REFERENCES org.location(organization_id, id),
  FOREIGN KEY (organization_id, destination_location_id)
    REFERENCES org.location(organization_id, id),
  FOREIGN KEY (organization_id, created_by_principal_id)
    REFERENCES iam.principal(organization_id, id),
  CHECK (origin_location_id <> destination_location_id),
  CHECK (sla_due_at > created_at),
  CHECK (updated_at >= created_at)
);

CREATE INDEX cargo_order_branch_status_created_idx
  ON cargo.cargo_order
    (organization_id, owning_branch_id, status, created_at DESC, id);

CREATE INDEX cargo_order_active_sla_idx
  ON cargo.cargo_order (organization_id, sla_due_at, id)
  WHERE status IN ('confirmed', 'received', 'loaded', 'in_transit', 'arrived', 'exception');

CREATE TABLE cargo.cargo_package (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  cargo_order_id uuid NOT NULL,
  public_code varchar(64) NOT NULL,
  category_code varchar(50) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 10000),
  unit_weight_grams bigint NOT NULL
    CHECK (unit_weight_grams > 0 AND unit_weight_grams <= 100000000),
  length_mm integer CHECK (length_mm IS NULL OR length_mm > 0),
  width_mm integer CHECK (width_mm IS NULL OR width_mm > 0),
  height_mm integer CHECK (height_mm IS NULL OR height_mm > 0),
  fragile boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, cargo_order_id, public_code),
  FOREIGN KEY (organization_id, cargo_order_id)
    REFERENCES cargo.cargo_order(organization_id, id),
  CHECK (
    (length_mm IS NULL AND width_mm IS NULL AND height_mm IS NULL)
    OR (length_mm IS NOT NULL AND width_mm IS NOT NULL AND height_mm IS NOT NULL)
  )
);

CREATE INDEX cargo_package_order_idx
  ON cargo.cargo_package (organization_id, cargo_order_id);

-- Sender, receiver, and last-mile address payloads are encrypted as structured
-- envelopes. Only keyed HMAC columns may be used for exact operational lookup.
CREATE TABLE cargo_private.order_contact (
  cargo_order_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  sender_contact_ciphertext bytea NOT NULL,
  sender_phone_lookup_hmac bytea
    CHECK (sender_phone_lookup_hmac IS NULL OR octet_length(sender_phone_lookup_hmac) = 32),
  receiver_contact_ciphertext bytea NOT NULL,
  receiver_phone_lookup_hmac bytea
    CHECK (receiver_phone_lookup_hmac IS NULL OR octet_length(receiver_phone_lookup_hmac) = 32),
  origin_address_ciphertext bytea,
  destination_address_ciphertext bytea,
  key_version smallint NOT NULL CHECK (key_version > 0),
  retention_until date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, cargo_order_id),
  FOREIGN KEY (organization_id, cargo_order_id)
    REFERENCES cargo.cargo_order(organization_id, id),
  CHECK (updated_at >= created_at)
);

CREATE INDEX order_contact_sender_hmac_idx
  ON cargo_private.order_contact (organization_id, sender_phone_lookup_hmac)
  WHERE sender_phone_lookup_hmac IS NOT NULL;

CREATE INDEX order_contact_receiver_hmac_idx
  ON cargo_private.order_contact (organization_id, receiver_phone_lookup_hmac)
  WHERE receiver_phone_lookup_hmac IS NOT NULL;

CREATE TABLE cargo.cargo_order_event (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  cargo_order_id uuid NOT NULL,
  aggregate_version bigint NOT NULL CHECK (aggregate_version > 0),
  from_status varchar(24),
  to_status varchar(24) NOT NULL,
  reason_code varchar(60) NOT NULL,
  actor_principal_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, cargo_order_id, aggregate_version),
  FOREIGN KEY (organization_id, cargo_order_id)
    REFERENCES cargo.cargo_order(organization_id, id),
  FOREIGN KEY (organization_id, actor_principal_id)
    REFERENCES iam.principal(organization_id, id),
  CHECK (from_status IS NULL OR from_status IN (
    'draft', 'quoted', 'confirmed', 'received', 'loaded', 'in_transit',
    'arrived', 'delivered', 'reconciled', 'exception', 'cancelled'
  )),
  CHECK (to_status IN (
    'draft', 'quoted', 'confirmed', 'received', 'loaded', 'in_transit',
    'arrived', 'delivered', 'reconciled', 'exception', 'cancelled'
  )),
  CHECK (octet_length(safe_metadata::text) <= 16384),
  CHECK (recorded_at >= occurred_at - interval '30 days')
);

CREATE INDEX cargo_order_event_timeline_idx
  ON cargo.cargo_order_event
    (organization_id, cargo_order_id, aggregate_version DESC);

CREATE TABLE dispatch.dispatch_task (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  owning_branch_id uuid NOT NULL,
  public_code varchar(48) NOT NULL,
  task_type varchar(24) NOT NULL
    CHECK (task_type IN ('fixed_route', 'contract', 'cargo')),
  service_period tstzrange NOT NULL,
  origin_location_id uuid NOT NULL,
  destination_location_id uuid NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'waiting'
    CHECK (status IN (
      'waiting', 'planned', 'ready', 'in_progress', 'completed', 'cancelled', 'exception'
    )),
  required_seats integer NOT NULL DEFAULT 0 CHECK (required_seats >= 0),
  required_weight_grams bigint NOT NULL DEFAULT 0 CHECK (required_weight_grams >= 0),
  created_by_principal_id uuid NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, public_code),
  FOREIGN KEY (organization_id, owning_branch_id)
    REFERENCES org.branch(organization_id, id),
  FOREIGN KEY (organization_id, origin_location_id)
    REFERENCES org.location(organization_id, id),
  FOREIGN KEY (organization_id, destination_location_id)
    REFERENCES org.location(organization_id, id),
  FOREIGN KEY (organization_id, created_by_principal_id)
    REFERENCES iam.principal(organization_id, id),
  CHECK (NOT isempty(service_period)),
  CHECK (lower(service_period) IS NOT NULL AND upper(service_period) IS NOT NULL),
  CHECK (lower_inc(service_period) AND NOT upper_inc(service_period)),
  CHECK (origin_location_id <> destination_location_id),
  CHECK (required_seats > 0 OR required_weight_grams > 0),
  CHECK (updated_at >= created_at)
);

CREATE INDEX dispatch_task_branch_status_idx
  ON dispatch.dispatch_task
    (organization_id, owning_branch_id, status, lower(service_period), id);

CREATE INDEX dispatch_task_period_idx
  ON dispatch.dispatch_task USING gist
    (organization_id, service_period);

CREATE TABLE dispatch.dispatch_task_cargo (
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  dispatch_task_id uuid NOT NULL,
  cargo_order_id uuid NOT NULL,
  segment_sequence smallint NOT NULL CHECK (segment_sequence > 0),
  status varchar(20) NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'loaded', 'unloaded', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, dispatch_task_id, cargo_order_id, segment_sequence),
  FOREIGN KEY (organization_id, dispatch_task_id)
    REFERENCES dispatch.dispatch_task(organization_id, id),
  FOREIGN KEY (organization_id, cargo_order_id)
    REFERENCES cargo.cargo_order(organization_id, id)
);

CREATE INDEX dispatch_task_cargo_order_idx
  ON dispatch.dispatch_task_cargo
    (organization_id, cargo_order_id, segment_sequence);

CREATE TABLE dispatch.dispatch_assignment (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  dispatch_task_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  duty_period tstzrange NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'proposed'
    CHECK (status IN (
      'proposed', 'confirmed', 'in_progress', 'superseded', 'cancelled', 'completed'
    )),
  reason_code varchar(60) NOT NULL,
  policy_version varchar(40) NOT NULL,
  policy_snapshot_hash bytea NOT NULL CHECK (octet_length(policy_snapshot_hash) = 32),
  supersedes_assignment_id uuid,
  created_by_principal_id uuid NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, dispatch_task_id)
    REFERENCES dispatch.dispatch_task(organization_id, id),
  FOREIGN KEY (organization_id, vehicle_id)
    REFERENCES fleet.vehicle(organization_id, id),
  FOREIGN KEY (organization_id, driver_id)
    REFERENCES workforce.driver(organization_id, id),
  FOREIGN KEY (organization_id, supersedes_assignment_id)
    REFERENCES dispatch.dispatch_assignment(organization_id, id),
  FOREIGN KEY (organization_id, created_by_principal_id)
    REFERENCES iam.principal(organization_id, id),
  CHECK (supersedes_assignment_id IS NULL OR supersedes_assignment_id <> id),
  CHECK (NOT isempty(duty_period)),
  CHECK (lower(duty_period) IS NOT NULL AND upper(duty_period) IS NOT NULL),
  CHECK (lower_inc(duty_period) AND NOT upper_inc(duty_period)),
  CHECK (updated_at >= created_at),
  CONSTRAINT assignment_vehicle_no_overlap
    EXCLUDE USING gist (
      organization_id WITH =,
      vehicle_id WITH =,
      duty_period WITH &&
    ) WHERE (status IN ('proposed', 'confirmed', 'in_progress')),
  CONSTRAINT assignment_driver_no_overlap
    EXCLUDE USING gist (
      organization_id WITH =,
      driver_id WITH =,
      duty_period WITH &&
    ) WHERE (status IN ('proposed', 'confirmed', 'in_progress'))
);

CREATE UNIQUE INDEX dispatch_assignment_one_active_task_idx
  ON dispatch.dispatch_assignment (organization_id, dispatch_task_id)
  WHERE status IN ('proposed', 'confirmed', 'in_progress');

CREATE INDEX dispatch_assignment_vehicle_timeline_idx
  ON dispatch.dispatch_assignment
    (organization_id, vehicle_id, lower(duty_period));

CREATE INDEX dispatch_assignment_driver_timeline_idx
  ON dispatch.dispatch_assignment
    (organization_id, driver_id, lower(duty_period));

-- The assignment period is server-derived and must fit inside the task period.
CREATE FUNCTION dispatch.enforce_assignment_task_bounds()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  task_period tstzrange;
BEGIN
  SELECT service_period
    INTO task_period
    FROM dispatch.dispatch_task
   WHERE organization_id = NEW.organization_id
     AND id = NEW.dispatch_task_id;

  IF task_period IS NULL THEN
    RAISE EXCEPTION 'dispatch task does not exist in organization'
      USING ERRCODE = '23503';
  END IF;

  IF NOT (NEW.duty_period <@ task_period) THEN
    RAISE EXCEPTION 'assignment duty period must be contained by task service period'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER dispatch_assignment_task_bounds
BEFORE INSERT OR UPDATE OF organization_id, dispatch_task_id, duty_period
ON dispatch.dispatch_assignment
FOR EACH ROW EXECUTE FUNCTION dispatch.enforce_assignment_task_bounds();

-- Prevent a later task edit from invalidating an existing active assignment.
CREATE FUNCTION dispatch.enforce_task_assignment_bounds()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.service_period IS DISTINCT FROM OLD.service_period
     AND EXISTS (
       SELECT 1
         FROM dispatch.dispatch_assignment AS assignment
        WHERE assignment.organization_id = NEW.organization_id
          AND assignment.dispatch_task_id = NEW.id
          AND assignment.status IN ('proposed', 'confirmed', 'in_progress')
          AND NOT (assignment.duty_period <@ NEW.service_period)
     ) THEN
    RAISE EXCEPTION 'task service period cannot exclude an active assignment'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER dispatch_task_assignment_bounds
BEFORE UPDATE OF service_period
ON dispatch.dispatch_task
FOR EACH ROW EXECUTE FUNCTION dispatch.enforce_task_assignment_bounds();

COMMENT ON TABLE cargo.cargo_order IS
  'Cargo aggregate root. State changes require expected version and an immutable event.';
COMMENT ON TABLE cargo.cargo_order_event IS
  'Append-only business timeline with safe metadata; contact PII is prohibited.';
COMMENT ON TABLE dispatch.dispatch_assignment IS
  'Revisioned resource assignment protected from vehicle and driver time overlap.';

COMMIT;
