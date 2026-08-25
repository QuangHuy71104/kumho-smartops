-- KSOps migration 0005: durable workspace documents for the connected operations UI.

BEGIN;

CREATE TABLE platform.workspace_state (
  state_key varchar(80) PRIMARY KEY,
  payload jsonb NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (state_key IN (
    'orders',
    'dispatch',
    'fleet',
    'drivers',
    'ticket-catalog',
    'bookings',
    'contract-catalog',
    'contracts',
    'customers',
    'maintenance',
    'maintenance-checklists',
    'finance',
    'paid-invoices',
    'reports'
  )),
  CHECK (octet_length(payload::text) <= 524288)
);

ALTER TABLE platform.workspace_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.workspace_state FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE platform.workspace_state FROM PUBLIC;

COMMIT;
