-- KSOps migration 0007: role work center queues, timelines, and notifications.

BEGIN;

CREATE TABLE public.work_items (
  id varchar(32) PRIMARY KEY,
  organization_id varchar(24) NOT NULL REFERENCES public.organizations(id),
  module varchar(24) NOT NULL CHECK (
    module IN ('cargo', 'dispatch', 'passenger', 'contract', 'maintenance', 'billing', 'reporting', 'audit')
  ),
  work_kind varchar(16) NOT NULL DEFAULT 'standard' CHECK (
    work_kind IN ('standard', 'approval', 'audit')
  ),
  title varchar(200) NOT NULL CHECK (length(btrim(title)) > 0),
  description text NOT NULL CHECK (
    length(btrim(description)) > 0 AND octet_length(description) <= 4000
  ),
  resource_type varchar(40) NOT NULL CHECK (length(btrim(resource_type)) > 0),
  resource_id varchar(64) CHECK (resource_id IS NULL OR length(btrim(resource_id)) > 0),
  route_path varchar(180) NOT NULL CHECK (route_path ~ '^/'),
  priority varchar(12) NOT NULL DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  ),
  status varchar(24) NOT NULL DEFAULT 'new' CHECK (
    status IN (
      'new', 'claimed', 'in_progress', 'waiting_approval',
      'waiting_evidence', 'completed', 'rejected'
    )
  ),
  assigned_role varchar(32) NOT NULL CHECK (
    assigned_role IN (
      'dispatcher', 'cargo-agent', 'ticket-agent', 'contract-sales',
      'maintenance-technician', 'finance-officer', 'operations-manager', 'auditor'
    )
  ),
  origin_role varchar(32) NOT NULL CHECK (
    origin_role IN (
      'dispatcher', 'cargo-agent', 'ticket-agent', 'contract-sales',
      'maintenance-technician', 'finance-officer', 'operations-manager', 'auditor'
    )
  ),
  assigned_to varchar(120) CHECK (assigned_to IS NULL OR length(btrim(assigned_to)) > 0),
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (updated_at >= created_at),
  CHECK (completed_at IS NULL OR status IN ('completed', 'rejected'))
);

CREATE TABLE public.work_item_comments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  work_item_id varchar(32) NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  author_role varchar(32) NOT NULL CHECK (
    author_role IN (
      'dispatcher', 'cargo-agent', 'ticket-agent', 'contract-sales',
      'maintenance-technician', 'finance-officer', 'operations-manager', 'auditor'
    )
  ),
  author_label varchar(120) NOT NULL CHECK (length(btrim(author_label)) > 0),
  body text NOT NULL CHECK (
    length(btrim(body)) > 0 AND octet_length(body) <= 4000
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.work_item_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  work_item_id varchar(32) NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  action varchar(48) NOT NULL CHECK (length(btrim(action)) > 0),
  from_status varchar(24) CHECK (
    from_status IS NULL OR from_status IN (
      'new', 'claimed', 'in_progress', 'waiting_approval',
      'waiting_evidence', 'completed', 'rejected'
    )
  ),
  to_status varchar(24) CHECK (
    to_status IS NULL OR to_status IN (
      'new', 'claimed', 'in_progress', 'waiting_approval',
      'waiting_evidence', 'completed', 'rejected'
    )
  ),
  actor_role varchar(32) NOT NULL CHECK (
    actor_role IN (
      'dispatcher', 'cargo-agent', 'ticket-agent', 'contract-sales',
      'maintenance-technician', 'finance-officer', 'operations-manager', 'auditor'
    )
  ),
  actor_label varchar(120) NOT NULL CHECK (length(btrim(actor_label)) > 0),
  note text NOT NULL DEFAULT '' CHECK (octet_length(note) <= 4000),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_status IS NOT NULL OR to_status IS NOT NULL)
);

CREATE TABLE public.role_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_role varchar(32) NOT NULL CHECK (
    recipient_role IN (
      'dispatcher', 'cargo-agent', 'ticket-agent', 'contract-sales',
      'maintenance-technician', 'finance-officer', 'operations-manager', 'auditor'
    )
  ),
  work_item_id varchar(32) NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL CHECK (length(btrim(title)) > 0),
  message varchar(1000) NOT NULL CHECK (length(btrim(message)) > 0),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (read_at IS NULL OR read_at >= created_at)
);

-- Global permission vocabulary only; organization roles still require explicit bindings.
INSERT INTO iam.permission (key, module, description) VALUES
  ('work-item:read', 'work-center', 'Read role work queues and linked operational timelines'),
  ('work-item:update', 'work-center', 'Claim and progress assigned operational work'),
  ('work-item:approve', 'work-center', 'Approve or reject work awaiting a management decision'),
  ('work-item:audit', 'work-center', 'Review evidence and record internal control findings')
ON CONFLICT (key) DO UPDATE SET
  module = EXCLUDED.module,
  description = EXCLUDED.description;

CREATE INDEX work_items_role_queue_idx
  ON public.work_items (organization_id, assigned_role, status, due_at);
CREATE INDEX work_items_module_status_idx
  ON public.work_items (organization_id, module, status, updated_at DESC);
CREATE INDEX work_items_resource_idx
  ON public.work_items (resource_type, resource_id)
  WHERE resource_id IS NOT NULL;
CREATE INDEX work_item_comments_timeline_idx
  ON public.work_item_comments (work_item_id, created_at, id);
CREATE INDEX work_item_events_timeline_idx
  ON public.work_item_events (work_item_id, occurred_at, id);
CREATE UNIQUE INDEX work_item_events_seed_guard_idx
  ON public.work_item_events (work_item_id, action, occurred_at);
CREATE INDEX role_notifications_inbox_idx
  ON public.role_notifications (recipient_role, created_at DESC, id DESC);
CREATE INDEX role_notifications_unread_idx
  ON public.role_notifications (recipient_role, created_at DESC)
  WHERE read_at IS NULL;
CREATE UNIQUE INDEX role_notifications_seed_guard_idx
  ON public.role_notifications (work_item_id, recipient_role, title, created_at);

DO $rls$
DECLARE
  target_table regclass;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'public.work_items'::regclass,
    'public.work_item_comments'::regclass,
    'public.work_item_events'::regclass,
    'public.role_notifications'::regclass
  ]
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target_table);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC', target_table);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE %s FROM anon', target_table);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE %s FROM authenticated', target_table);
    END IF;
  END LOOP;
END;
$rls$;

DO $sequence_privileges$
DECLARE
  target_sequence regclass;
BEGIN
  FOREACH target_sequence IN ARRAY ARRAY[
    'public.work_item_comments_id_seq'::regclass,
    'public.work_item_events_id_seq'::regclass,
    'public.role_notifications_id_seq'::regclass
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC', target_sequence);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM anon', target_sequence);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM authenticated', target_sequence);
    END IF;
  END LOOP;
END;
$sequence_privileges$;

COMMENT ON TABLE public.work_items IS
  'Role-owned operational queue items with optimistic concurrency and due-time tracking.';
COMMENT ON TABLE public.work_item_events IS
  'Append-oriented status and assignment timeline for role work items.';
COMMENT ON TABLE public.role_notifications IS
  'Role inbox notifications linked to actionable operational work.';

COMMIT;
