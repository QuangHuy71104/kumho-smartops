-- KSOps migration 0002: fleet and workforce operational aggregates.

BEGIN;

CREATE SCHEMA IF NOT EXISTS fleet;
CREATE SCHEMA IF NOT EXISTS fleet_private;
CREATE SCHEMA IF NOT EXISTS workforce;
CREATE SCHEMA IF NOT EXISTS workforce_private;

CREATE TABLE fleet.vehicle (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  home_branch_id uuid NOT NULL,
  public_code varchar(40) NOT NULL,
  vehicle_type varchar(32) NOT NULL
    CHECK (vehicle_type IN ('coach', 'minibus', 'cargo_light', 'cargo_medium', 'cargo_heavy')),
  seat_capacity integer NOT NULL DEFAULT 0 CHECK (seat_capacity >= 0),
  cargo_capacity_grams bigint NOT NULL DEFAULT 0 CHECK (cargo_capacity_grams >= 0),
  operational_status varchar(24) NOT NULL DEFAULT 'available'
    CHECK (operational_status IN (
      'available', 'assigned', 'in_service', 'maintenance', 'blocked', 'retired'
    )),
  blocked_reason_code varchar(50),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, public_code),
  FOREIGN KEY (organization_id, home_branch_id)
    REFERENCES org.branch(organization_id, id),
  CHECK (seat_capacity > 0 OR cargo_capacity_grams > 0),
  CHECK (
    (operational_status = 'blocked' AND blocked_reason_code IS NOT NULL)
    OR operational_status <> 'blocked'
  ),
  CHECK (updated_at >= created_at)
);

CREATE INDEX vehicle_branch_status_idx
  ON fleet.vehicle (organization_id, home_branch_id, operational_status);

CREATE INDEX vehicle_available_idx
  ON fleet.vehicle (organization_id, home_branch_id, vehicle_type)
  WHERE operational_status = 'available';

-- Registration identifiers stay behind a separate privilege boundary. The
-- ciphertext is envelope encrypted by the application; the HMAC supports exact
-- uniqueness checks without exposing the registration value.
CREATE TABLE fleet_private.vehicle_registration (
  vehicle_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  registration_ciphertext bytea NOT NULL,
  registration_lookup_hmac bytea NOT NULL
    CHECK (octet_length(registration_lookup_hmac) = 32),
  key_version smallint NOT NULL CHECK (key_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, vehicle_id),
  UNIQUE (organization_id, registration_lookup_hmac),
  FOREIGN KEY (organization_id, vehicle_id)
    REFERENCES fleet.vehicle(organization_id, id),
  CHECK (updated_at >= created_at)
);

CREATE TABLE workforce.driver (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  home_branch_id uuid NOT NULL,
  public_code varchar(40) NOT NULL,
  display_alias varchar(100) NOT NULL,
  operational_status varchar(28) NOT NULL DEFAULT 'verification_pending'
    CHECK (operational_status IN (
      'available', 'working', 'leave', 'verification_pending', 'blocked', 'retired'
    )),
  blocked_reason_code varchar(50),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, public_code),
  FOREIGN KEY (organization_id, home_branch_id)
    REFERENCES org.branch(organization_id, id),
  CHECK (
    (operational_status = 'blocked' AND blocked_reason_code IS NOT NULL)
    OR operational_status <> 'blocked'
  ),
  CHECK (updated_at >= created_at)
);

CREATE INDEX driver_branch_status_idx
  ON workforce.driver (organization_id, home_branch_id, operational_status);

CREATE INDEX driver_available_idx
  ON workforce.driver (organization_id, home_branch_id)
  WHERE operational_status = 'available';

CREATE TABLE workforce.driver_qualification (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES org.organization(id),
  driver_id uuid NOT NULL,
  qualification_type varchar(50) NOT NULL,
  valid_during daterange NOT NULL,
  verification_status varchar(20) NOT NULL
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
  verified_by_principal_id uuid,
  verified_at timestamptz,
  evidence_reference varchar(180),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, driver_id)
    REFERENCES workforce.driver(organization_id, id),
  FOREIGN KEY (organization_id, verified_by_principal_id)
    REFERENCES iam.principal(organization_id, id),
  CHECK (NOT isempty(valid_during)),
  CHECK (lower(valid_during) IS NOT NULL AND upper(valid_during) IS NOT NULL),
  CHECK (lower_inc(valid_during) AND NOT upper_inc(valid_during)),
  CHECK (
    (verification_status = 'verified' AND verified_by_principal_id IS NOT NULL AND verified_at IS NOT NULL)
    OR verification_status <> 'verified'
  ),
  CHECK (updated_at >= created_at)
);

CREATE INDEX driver_qualification_lookup_idx
  ON workforce.driver_qualification
    (organization_id, driver_id, qualification_type, verification_status);

CREATE INDEX driver_qualification_validity_idx
  ON workforce.driver_qualification USING gist
    (organization_id, driver_id, valid_during);

CREATE TABLE workforce_private.driver_profile (
  driver_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  full_name_ciphertext bytea NOT NULL,
  phone_ciphertext bytea,
  phone_lookup_hmac bytea
    CHECK (phone_lookup_hmac IS NULL OR octet_length(phone_lookup_hmac) = 32),
  license_number_ciphertext bytea NOT NULL,
  license_lookup_hmac bytea NOT NULL
    CHECK (octet_length(license_lookup_hmac) = 32),
  key_version smallint NOT NULL CHECK (key_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, driver_id),
  UNIQUE (organization_id, license_lookup_hmac),
  FOREIGN KEY (organization_id, driver_id)
    REFERENCES workforce.driver(organization_id, id),
  CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX driver_profile_phone_hmac_unique
  ON workforce_private.driver_profile (organization_id, phone_lookup_hmac)
  WHERE phone_lookup_hmac IS NOT NULL;

CREATE TABLE workforce_private.driver_document (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  document_type varchar(50) NOT NULL,
  object_reference_ciphertext bytea NOT NULL,
  content_hash bytea NOT NULL CHECK (octet_length(content_hash) = 32),
  key_version smallint NOT NULL CHECK (key_version > 0),
  retention_until date NOT NULL,
  malware_scan_status varchar(20) NOT NULL
    CHECK (malware_scan_status IN ('pending', 'clean', 'quarantined', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, driver_id)
    REFERENCES workforce.driver(organization_id, id)
);

COMMENT ON TABLE fleet.vehicle IS
  'Operational vehicle identity; operational_status alone is not proof of dispatch eligibility.';
COMMENT ON TABLE workforce.driver IS
  'PII-minimized driver operational record; use driver_profile only through an authorized service.';
COMMENT ON TABLE workforce.driver_qualification IS
  'Validity and verification metadata used by dispatch policy before assignment.';

COMMIT;
