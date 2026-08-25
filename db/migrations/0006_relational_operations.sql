-- KSOps migration 0006: presentation-ready relational operations model.

BEGIN;

CREATE TABLE public.organizations (
  id varchar(24) PRIMARY KEY,
  code varchar(32) NOT NULL UNIQUE,
  legal_name varchar(180) NOT NULL,
  timezone varchar(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.branches (
  id varchar(24) PRIMARY KEY,
  organization_id varchar(24) NOT NULL REFERENCES public.organizations(id),
  code varchar(32) NOT NULL,
  name varchar(160) NOT NULL,
  branch_type varchar(24) NOT NULL CHECK (branch_type IN ('office', 'station', 'depot', 'warehouse', 'workshop')),
  city varchar(100) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE public.locations (
  id varchar(32) PRIMARY KEY,
  organization_id varchar(24) NOT NULL REFERENCES public.organizations(id),
  branch_id varchar(24) REFERENCES public.branches(id),
  code varchar(40) NOT NULL,
  name varchar(180) NOT NULL,
  location_type varchar(24) NOT NULL CHECK (location_type IN ('station', 'depot', 'warehouse', 'workshop', 'service_area')),
  city varchar(100) NOT NULL,
  latitude numeric(9,6),
  longitude numeric(9,6),
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code),
  CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE TABLE public.customers (
  id varchar(24) PRIMARY KEY,
  organization_id varchar(24) NOT NULL REFERENCES public.organizations(id),
  display_name varchar(180) NOT NULL,
  customer_type varchar(20) NOT NULL CHECK (customer_type IN ('Cá nhân', 'Doanh nghiệp')),
  segment varchar(24) NOT NULL CHECK (segment IN ('Chiến lược', 'Thường xuyên', 'Tiềm năng', 'Mới')),
  risk_level varchar(20) NOT NULL CHECK (risk_level IN ('Thấp', 'Theo dõi', 'Cao')),
  satisfaction numeric(3,2) NOT NULL CHECK (satisfaction BETWEEN 0 AND 5),
  order_count integer NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  lifetime_value bigint NOT NULL DEFAULT 0 CHECK (lifetime_value >= 0),
  last_interaction varchar(180) NOT NULL,
  account_owner varchar(120) NOT NULL,
  service_preference varchar(180) NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_tags (
  customer_id varchar(24) NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag varchar(60) NOT NULL,
  PRIMARY KEY (customer_id, tag)
);

CREATE TABLE public.customer_orders (
  id varchar(32) PRIMARY KEY,
  customer_id varchar(24) NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  service_name varchar(100) NOT NULL,
  route_label varchar(180) NOT NULL,
  order_value bigint NOT NULL CHECK (order_value >= 0),
  status varchar(24) NOT NULL CHECK (status IN ('Hoàn tất', 'Đang phục vụ', 'Đã hủy')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicles (
  id varchar(20) PRIMARY KEY,
  organization_id varchar(24) NOT NULL REFERENCES public.organizations(id),
  name varchar(120) NOT NULL,
  vehicle_type varchar(32) NOT NULL CHECK (vehicle_type IN ('Xe 16 chỗ', 'Xe 29 chỗ', 'Xe 45 chỗ', 'Xe giường nằm', 'Xe hàng')),
  operational_status varchar(24) NOT NULL CHECK (operational_status IN ('Sẵn sàng', 'Đang chạy', 'Bảo dưỡng')),
  depot varchar(160) NOT NULL,
  current_driver_name varchar(120) NOT NULL,
  current_assignment varchar(80) NOT NULL,
  next_milestone varchar(180) NOT NULL,
  odometer_km integer NOT NULL CHECK (odometer_km >= 0),
  service_remaining_km integer NOT NULL,
  readiness_percent integer NOT NULL CHECK (readiness_percent BETWEEN 0 AND 100),
  capacity_label varchar(60) NOT NULL,
  last_inspection varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.drivers (
  id varchar(24) PRIMARY KEY,
  organization_id varchar(24) NOT NULL REFERENCES public.organizations(id),
  full_name varchar(120) NOT NULL,
  availability varchar(28) NOT NULL CHECK (availability IN ('Sẵn sàng', 'Đang làm việc', 'Nghỉ phép', 'Chờ xác minh')),
  shift varchar(20) NOT NULL CHECK (shift IN ('Ca sáng', 'Ca chiều', 'Ca đêm', 'Linh hoạt')),
  shift_window varchar(40) NOT NULL,
  license_class varchar(20) NOT NULL,
  license_expiry date NOT NULL,
  compliance_percent integer NOT NULL CHECK (compliance_percent BETWEEN 0 AND 100),
  hours_this_week numeric(5,2) NOT NULL CHECK (hours_this_week BETWEEN 0 AND 84),
  current_assignment varchar(180) NOT NULL,
  vehicle_id varchar(20) REFERENCES public.vehicles(id),
  home_base varchar(160) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.driver_documents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id varchar(24) NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_name varchar(100) NOT NULL,
  verification_state varchar(24) NOT NULL CHECK (verification_state IN ('Hợp lệ', 'Sắp hết hạn', 'Cần bổ sung')),
  note varchar(180) NOT NULL,
  sort_order smallint NOT NULL CHECK (sort_order > 0),
  UNIQUE (driver_id, document_name)
);

CREATE TABLE public.driver_schedules (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id varchar(24) NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  time_label varchar(30) NOT NULL,
  task varchar(180) NOT NULL,
  note varchar(120) NOT NULL,
  sort_order smallint NOT NULL CHECK (sort_order > 0)
);

CREATE TABLE public.transport_orders (
  id varchar(32) PRIMARY KEY,
  organization_id varchar(24) NOT NULL REFERENCES public.organizations(id),
  customer_id varchar(24) REFERENCES public.customers(id),
  customer_name varchar(180) NOT NULL,
  service_type varchar(40) NOT NULL CHECK (service_type IN ('Hàng ghép liên tỉnh', 'Nguyên chuyến', 'Last-mile')),
  cargo_type varchar(50) NOT NULL,
  origin varchar(160) NOT NULL,
  destination varchar(160) NOT NULL,
  distance_label varchar(50) NOT NULL,
  created_at timestamptz NOT NULL,
  pickup_window varchar(80) NOT NULL,
  sla_deadline timestamptz NOT NULL,
  sla_state varchar(24) NOT NULL CHECK (sla_state IN ('Trong SLA', 'Sắp đến hạn', 'Trễ SLA')),
  status varchar(28) NOT NULL CHECK (status IN ('Mới tiếp nhận', 'Đã xác nhận', 'Đang lấy hàng', 'Đang vận chuyển', 'Hoàn tất', 'Cần xử lý')),
  package_count integer NOT NULL CHECK (package_count > 0),
  weight_kg numeric(12,2) NOT NULL CHECK (weight_kg > 0),
  assignee varchar(120) NOT NULL,
  note text NOT NULL,
  record_source varchar(16) NOT NULL DEFAULT 'seed' CHECK (record_source IN ('seed', 'operator')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sla_deadline > created_at)
);

CREATE TABLE public.dispatch_tasks (
  id varchar(32) PRIMARY KEY,
  organization_id varchar(24) NOT NULL REFERENCES public.organizations(id),
  service_date date NOT NULL,
  shift varchar(20) NOT NULL CHECK (shift IN ('Ca sáng', 'Ca chiều', 'Ca tối')),
  time_range varchar(30) NOT NULL,
  dispatch_type varchar(24) NOT NULL CHECK (dispatch_type IN ('Chuyến cố định', 'Xe hợp đồng', 'Hàng hóa')),
  route_code varchar(48) NOT NULL,
  origin varchar(160) NOT NULL,
  destination varchar(160) NOT NULL,
  vehicle_id varchar(20) REFERENCES public.vehicles(id),
  driver_id varchar(24) REFERENCES public.drivers(id),
  vehicle_display varchar(120) NOT NULL,
  driver_display varchar(120) NOT NULL,
  capacity_label varchar(60) NOT NULL,
  used_capacity integer NOT NULL CHECK (used_capacity >= 0),
  total_capacity integer NOT NULL CHECK (total_capacity > 0),
  capacity_unit varchar(10) NOT NULL CHECK (capacity_unit IN ('ghế', 'kg')),
  status varchar(24) NOT NULL CHECK (status IN ('Chờ điều phối', 'Sẵn sàng', 'Đang chạy', 'Có xung đột')),
  risk_level varchar(20) NOT NULL CHECK (risk_level IN ('Ổn định', 'Theo dõi', 'Cao')),
  warnings text[] NOT NULL DEFAULT '{}',
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (used_capacity <= total_capacity)
);

CREATE TABLE public.ticket_routes (
  id varchar(24) PRIMARY KEY,
  origin varchar(180) NOT NULL,
  destination varchar(180) NOT NULL,
  duration_label varchar(40) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ticket_trips (
  id varchar(24) PRIMARY KEY,
  route_id varchar(24) NOT NULL REFERENCES public.ticket_routes(id),
  service_date date NOT NULL,
  departure_time time NOT NULL,
  arrival_time time NOT NULL,
  vehicle_display varchar(100) NOT NULL,
  service_class varchar(40) NOT NULL,
  pickup_point varchar(180) NOT NULL,
  dropoff_point varchar(180) NOT NULL,
  seat_capacity integer NOT NULL CHECK (seat_capacity > 0),
  ticket_price bigint NOT NULL CHECK (ticket_price >= 0),
  status varchar(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'boarding', 'departed', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, service_date, departure_time)
);

CREATE TABLE public.trip_reserved_seats (
  trip_id varchar(24) NOT NULL REFERENCES public.ticket_trips(id) ON DELETE CASCADE,
  seat_code varchar(8) NOT NULL,
  reservation_type varchar(20) NOT NULL DEFAULT 'operational' CHECK (reservation_type IN ('operational', 'booking')),
  PRIMARY KEY (trip_id, seat_code)
);

CREATE TABLE public.ticket_bookings (
  id varchar(32) PRIMARY KEY,
  trip_id varchar(24) NOT NULL REFERENCES public.ticket_trips(id),
  route_label varchar(360) NOT NULL,
  service_date date NOT NULL,
  departure_time time NOT NULL,
  total_amount bigint NOT NULL CHECK (total_amount >= 0),
  status varchar(24) NOT NULL CHECK (status IN ('Đã giữ chỗ', 'Đã hủy')),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_seats (
  booking_id varchar(32) NOT NULL REFERENCES public.ticket_bookings(id) ON DELETE CASCADE,
  seat_code varchar(8) NOT NULL,
  unit_price bigint NOT NULL CHECK (unit_price >= 0),
  PRIMARY KEY (booking_id, seat_code)
);

CREATE TABLE public.contract_requests (
  id varchar(32) PRIMARY KEY,
  title varchar(200) NOT NULL,
  customer_group_type varchar(24) NOT NULL CHECK (customer_group_type IN ('Đoàn thể', 'Doanh nghiệp', 'Nhóm khách')),
  passenger_count integer NOT NULL CHECK (passenger_count > 0),
  vehicle_type varchar(24) NOT NULL CHECK (vehicle_type IN ('Xe 16 chỗ', 'Xe 29 chỗ', 'Xe 45 chỗ')),
  vehicle_count integer NOT NULL CHECK (vehicle_count > 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  pickup_point varchar(180) NOT NULL,
  destination varchar(180) NOT NULL,
  status varchar(28) NOT NULL CHECK (status IN ('Mới tiếp nhận', 'Đang khảo sát', 'Chờ báo giá', 'Đã gửi báo giá', 'Đã xác nhận')),
  account_owner varchar(120) NOT NULL,
  estimated_value bigint NOT NULL CHECK (estimated_value >= 0),
  created_label varchar(60) NOT NULL,
  record_source varchar(16) NOT NULL CHECK (record_source IN ('catalog', 'operator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE public.maintenance_orders (
  id varchar(32) PRIMARY KEY,
  vehicle_id varchar(20) NOT NULL REFERENCES public.vehicles(id),
  vehicle_name varchar(120) NOT NULL,
  job_name varchar(180) NOT NULL,
  status varchar(28) NOT NULL CHECK (status IN ('Quá hạn', 'Sắp đến hạn', 'Đang thực hiện', 'Đã lên lịch', 'Hoàn tất')),
  priority varchar(20) NOT NULL CHECK (priority IN ('Khẩn', 'Cao', 'Trung bình', 'Thấp')),
  due_date date NOT NULL,
  due_odometer_km integer NOT NULL CHECK (due_odometer_km >= 0),
  current_odometer_km integer NOT NULL CHECK (current_odometer_km >= 0),
  daily_distance_km integer NOT NULL CHECK (daily_distance_km >= 0),
  remaining_km integer NOT NULL,
  technician_team varchar(120) NOT NULL,
  workshop_bay varchar(100) NOT NULL,
  duration_label varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.maintenance_checklist_items (
  maintenance_order_id varchar(32) NOT NULL REFERENCES public.maintenance_orders(id) ON DELETE CASCADE,
  item_code varchar(40) NOT NULL,
  item_label varchar(180) NOT NULL,
  default_completed boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  sort_order smallint NOT NULL CHECK (sort_order > 0),
  PRIMARY KEY (maintenance_order_id, item_code),
  CHECK ((is_completed AND completed_at IS NOT NULL) OR (NOT is_completed))
);

CREATE TABLE public.maintenance_schedule (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  schedule_date date NOT NULL,
  time_label varchar(20) NOT NULL,
  title varchar(180) NOT NULL,
  technician_team varchar(120) NOT NULL,
  sort_order smallint NOT NULL CHECK (sort_order > 0)
);

CREATE TABLE public.invoices (
  id varchar(32) PRIMARY KEY,
  customer_id varchar(24) REFERENCES public.customers(id),
  customer_name varchar(180) NOT NULL,
  reference_code varchar(40) NOT NULL,
  service_type varchar(24) NOT NULL CHECK (service_type IN ('Hàng hóa', 'Vé hành khách', 'Xe hợp đồng')),
  amount bigint NOT NULL CHECK (amount >= 0),
  due_date date NOT NULL,
  original_status varchar(24) NOT NULL CHECK (original_status IN ('Đã thanh toán', 'Chờ thanh toán', 'Quá hạn')),
  manually_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((manually_paid AND paid_at IS NOT NULL) OR (NOT manually_paid))
);

CREATE TABLE public.cash_flow_daily (
  business_date date PRIMARY KEY,
  income_million numeric(12,2) NOT NULL CHECK (income_million >= 0),
  expense_million numeric(12,2) NOT NULL CHECK (expense_million >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_categories (
  id varchar(32) PRIMARY KEY,
  label varchar(100) NOT NULL UNIQUE,
  percentage integer NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  amount_label varchar(60) NOT NULL,
  sort_order smallint NOT NULL CHECK (sort_order > 0)
);

CREATE TABLE public.report_snapshots (
  period varchar(24) PRIMARY KEY CHECK (period IN ('7 ngày', '30 ngày', 'Quý 3')),
  revenue_label varchar(40) NOT NULL,
  utilization_label varchar(24) NOT NULL,
  on_time_label varchar(24) NOT NULL,
  satisfaction_label varchar(24) NOT NULL,
  revenue_delta varchar(24) NOT NULL,
  utilization_delta varchar(24) NOT NULL,
  on_time_delta varchar(24) NOT NULL,
  satisfaction_delta varchar(24) NOT NULL,
  trend integer[] NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.service_performance (
  id varchar(24) PRIMARY KEY,
  service_name varchar(100) NOT NULL UNIQUE,
  order_volume_label varchar(40) NOT NULL,
  revenue_label varchar(40) NOT NULL,
  on_time_label varchar(24) NOT NULL,
  contribution_percent integer NOT NULL CHECK (contribution_percent BETWEEN 0 AND 100),
  sort_order smallint NOT NULL CHECK (sort_order > 0)
);

CREATE TABLE public.route_performance (
  id varchar(24) PRIMARY KEY,
  route_label varchar(180) NOT NULL UNIQUE,
  load_percent integer NOT NULL CHECK (load_percent BETWEEN 0 AND 100),
  score varchar(24) NOT NULL CHECK (score IN ('Tốt', 'Ổn định', 'Cần tối ưu')),
  note varchar(180) NOT NULL,
  sort_order smallint NOT NULL CHECK (sort_order > 0)
);

CREATE INDEX transport_orders_status_sla_idx ON public.transport_orders (status, sla_deadline);
CREATE INDEX dispatch_tasks_date_status_idx ON public.dispatch_tasks (service_date, status);
CREATE INDEX ticket_trips_route_date_idx ON public.ticket_trips (route_id, service_date, departure_time);
CREATE INDEX ticket_bookings_trip_status_idx ON public.ticket_bookings (trip_id, status);
CREATE INDEX contract_requests_status_date_idx ON public.contract_requests (status, start_date);
CREATE INDEX maintenance_orders_status_due_idx ON public.maintenance_orders (status, due_date);
CREATE INDEX invoices_status_due_idx ON public.invoices (original_status, due_date);

DO $rls$
DECLARE
  target_table regclass;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'public.organizations'::regclass,
    'public.branches'::regclass,
    'public.locations'::regclass,
    'public.customers'::regclass,
    'public.customer_tags'::regclass,
    'public.customer_orders'::regclass,
    'public.vehicles'::regclass,
    'public.drivers'::regclass,
    'public.driver_documents'::regclass,
    'public.driver_schedules'::regclass,
    'public.transport_orders'::regclass,
    'public.dispatch_tasks'::regclass,
    'public.ticket_routes'::regclass,
    'public.ticket_trips'::regclass,
    'public.trip_reserved_seats'::regclass,
    'public.ticket_bookings'::regclass,
    'public.booking_seats'::regclass,
    'public.contract_requests'::regclass,
    'public.maintenance_orders'::regclass,
    'public.maintenance_checklist_items'::regclass,
    'public.maintenance_schedule'::regclass,
    'public.invoices'::regclass,
    'public.cash_flow_daily'::regclass,
    'public.expense_categories'::regclass,
    'public.report_snapshots'::regclass,
    'public.service_performance'::regclass,
    'public.route_performance'::regclass
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

ALTER TABLE public.ksops_schema_migration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ksops_schema_migration FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ksops_schema_migration FROM PUBLIC;
DO $migration_roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.ksops_schema_migration FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.ksops_schema_migration FROM authenticated;
  END IF;
END;
$migration_roles$;

ALTER TABLE platform.workspace_state RENAME TO legacy_workspace_state;
COMMENT ON TABLE platform.legacy_workspace_state IS
  'Deprecated compatibility data retained after migration to normalized public tables.';

COMMIT;
