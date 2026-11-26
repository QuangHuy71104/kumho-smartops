-- KSOps migration 0008: rolling daily trips and live transport simulation.

BEGIN;

ALTER TABLE public.dispatch_tasks
  DROP CONSTRAINT IF EXISTS dispatch_tasks_status_check;
ALTER TABLE public.dispatch_tasks
  ADD CONSTRAINT dispatch_tasks_status_check CHECK (
    status IN ('Chờ điều phối', 'Sẵn sàng', 'Đang chạy', 'Hoàn tất', 'Có xung đột')
  );

ALTER TABLE public.ticket_bookings
  ADD COLUMN IF NOT EXISTS customer_name varchar(100) NOT NULL DEFAULT 'Khách tại quầy',
  ADD COLUMN IF NOT EXISTS customer_phone varchar(32) NOT NULL DEFAULT 'Chưa cập nhật',
  ADD COLUMN IF NOT EXISTS booking_channel varchar(24) NOT NULL DEFAULT 'Tại quầy',
  ADD COLUMN IF NOT EXISTS payment_status varchar(24) NOT NULL DEFAULT 'Chưa thanh toán',
  ADD COLUMN IF NOT EXISTS payment_method varchar(24) NOT NULL DEFAULT 'Chưa chọn';

ALTER TABLE public.ticket_bookings
  DROP CONSTRAINT IF EXISTS ticket_bookings_booking_channel_check,
  DROP CONSTRAINT IF EXISTS ticket_bookings_payment_status_check,
  DROP CONSTRAINT IF EXISTS ticket_bookings_payment_method_check;
ALTER TABLE public.ticket_bookings
  ADD CONSTRAINT ticket_bookings_booking_channel_check CHECK (
    booking_channel IN ('Tại quầy', 'Website', 'Điện thoại', 'Đại lý')
  ),
  ADD CONSTRAINT ticket_bookings_payment_status_check CHECK (
    payment_status IN ('Đã thanh toán', 'Chưa thanh toán')
  ),
  ADD CONSTRAINT ticket_bookings_payment_method_check CHECK (
    payment_method IN ('Tiền mặt', 'Chuyển khoản', 'Thẻ ngân hàng', 'Ví điện tử', 'Chưa chọn')
  );

CREATE OR REPLACE FUNCTION public.refresh_live_transport_operations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  local_day date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  local_clock time := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;
  target_day date;
  trip_template_day date;
  task_template_day date;
  template_trip record;
  template_task record;
  new_trip_id varchar(24);
  new_task_id varchar(32);
  template_index integer;
BEGIN
  SELECT min(service_date) INTO trip_template_day
  FROM public.ticket_trips
  WHERE service_date >= local_day;

  IF trip_template_day IS NOT NULL THEN
    FOR target_day IN
      SELECT generate_series(local_day, local_day + 6, interval '1 day')::date
    LOOP
      template_index := 0;
      FOR template_trip IN
        SELECT * FROM public.ticket_trips
        WHERE service_date = trip_template_day
        ORDER BY route_id, departure_time
      LOOP
        template_index := template_index + 1;
        new_trip_id := format('TRP-%s-%s', to_char(target_day, 'YYMMDD'), lpad(template_index::text, 2, '0'));
        INSERT INTO public.ticket_trips
          (id, route_id, service_date, departure_time, arrival_time, vehicle_display,
           service_class, pickup_point, dropoff_point, seat_capacity, ticket_price, status)
        VALUES
          (new_trip_id, template_trip.route_id, target_day, template_trip.departure_time,
           template_trip.arrival_time, template_trip.vehicle_display, template_trip.service_class,
           template_trip.pickup_point, template_trip.dropoff_point, template_trip.seat_capacity,
           template_trip.ticket_price, 'scheduled')
        ON CONFLICT (route_id, service_date, departure_time) DO NOTHING;

        SELECT id INTO new_trip_id
        FROM public.ticket_trips
        WHERE route_id = template_trip.route_id
          AND service_date = target_day
          AND departure_time = template_trip.departure_time;

        INSERT INTO public.trip_reserved_seats (trip_id, seat_code, reservation_type)
        SELECT new_trip_id, seat_code, reservation_type
        FROM public.trip_reserved_seats
        WHERE trip_id = template_trip.id AND reservation_type = 'operational'
        ON CONFLICT (trip_id, seat_code) DO NOTHING;
      END LOOP;
    END LOOP;
  END IF;

  SELECT min(service_date) INTO task_template_day
  FROM public.dispatch_tasks
  WHERE service_date >= local_day;

  IF task_template_day IS NOT NULL THEN
    FOR target_day IN
      SELECT generate_series(local_day, local_day + 6, interval '1 day')::date
    LOOP
      template_index := 0;
      FOR template_task IN
        SELECT * FROM public.dispatch_tasks
        WHERE service_date = task_template_day
        ORDER BY shift, time_range, route_code
      LOOP
        template_index := template_index + 1;
        IF NOT EXISTS (
          SELECT 1 FROM public.dispatch_tasks
          WHERE service_date = target_day
            AND route_code = template_task.route_code
            AND time_range = template_task.time_range
        ) THEN
          new_task_id := format('DP-%s-%s', to_char(target_day, 'YYMMDD'), lpad(template_index::text, 2, '0'));
          INSERT INTO public.dispatch_tasks
            (id, organization_id, service_date, shift, time_range, dispatch_type, route_code,
             origin, destination, vehicle_id, driver_id, vehicle_display, driver_display,
             capacity_label, used_capacity, total_capacity, capacity_unit, status,
             risk_level, warnings, note)
          VALUES
            (new_task_id, template_task.organization_id, target_day, template_task.shift,
             template_task.time_range, template_task.dispatch_type, template_task.route_code,
             template_task.origin, template_task.destination, template_task.vehicle_id,
             template_task.driver_id, template_task.vehicle_display, template_task.driver_display,
             template_task.capacity_label, template_task.used_capacity, template_task.total_capacity,
             template_task.capacity_unit,
             CASE WHEN template_task.vehicle_id IS NULL OR template_task.driver_id IS NULL
               THEN 'Chờ điều phối' ELSE 'Sẵn sàng' END,
             template_task.risk_level, template_task.warnings, template_task.note);
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  UPDATE public.ticket_trips
  SET status = CASE
      WHEN service_date < local_day THEN 'completed'
      WHEN service_date > local_day THEN 'scheduled'
      WHEN arrival_time > departure_time AND local_clock >= arrival_time THEN 'completed'
      WHEN local_clock >= departure_time THEN 'departed'
      WHEN local_clock >= (departure_time - interval '30 minutes')::time THEN 'boarding'
      ELSE 'scheduled'
    END,
    updated_at = now()
  WHERE status <> 'cancelled';

  UPDATE public.dispatch_tasks
  SET status = CASE
      WHEN vehicle_id IS NULL OR driver_id IS NULL THEN
        CASE WHEN service_date < local_day OR (
          service_date = local_day AND local_clock > split_part(time_range, '–', 2)::time
        ) THEN 'Có xung đột' ELSE 'Chờ điều phối' END
      WHEN service_date < local_day THEN 'Hoàn tất'
      WHEN service_date > local_day THEN 'Sẵn sàng'
      WHEN local_clock < split_part(time_range, '–', 1)::time THEN 'Sẵn sàng'
      WHEN local_clock <= split_part(time_range, '–', 2)::time THEN 'Đang chạy'
      ELSE 'Hoàn tất'
    END,
    risk_level = CASE
      WHEN (vehicle_id IS NULL OR driver_id IS NULL)
        AND (service_date < local_day OR (
          service_date = local_day AND local_clock > split_part(time_range, '–', 2)::time
        )) THEN 'Cao'
      ELSE risk_level
    END,
    updated_at = now()
  WHERE status <> 'Có xung đột' OR vehicle_id IS NULL OR driver_id IS NULL;

  UPDATE public.vehicles AS vehicle
  SET operational_status = CASE
      WHEN vehicle.operational_status = 'Bảo dưỡng' THEN 'Bảo dưỡng'
      WHEN EXISTS (
        SELECT 1 FROM public.dispatch_tasks AS task
        WHERE task.vehicle_id = vehicle.id
          AND task.service_date = local_day
          AND task.status = 'Đang chạy'
      ) THEN 'Đang chạy'
      ELSE 'Sẵn sàng'
    END,
    current_assignment = COALESCE((
      SELECT task.route_code FROM public.dispatch_tasks AS task
      WHERE task.vehicle_id = vehicle.id
        AND task.service_date = local_day
        AND task.status = 'Đang chạy'
      ORDER BY task.time_range
      LIMIT 1
    ), CASE WHEN vehicle.operational_status = 'Bảo dưỡng'
      THEN vehicle.current_assignment ELSE 'Chờ lượt điều phối tiếp theo' END),
    next_milestone = CASE
      WHEN vehicle.operational_status = 'Bảo dưỡng' THEN vehicle.next_milestone
      WHEN EXISTS (
        SELECT 1 FROM public.dispatch_tasks AS task
        WHERE task.vehicle_id = vehicle.id
          AND task.service_date = local_day
          AND task.status = 'Đang chạy'
      ) THEN 'Đang cập nhật vị trí theo hành trình'
      ELSE 'Sẵn sàng nhận chuyến mới'
    END,
    updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_live_transport_operations() FROM PUBLIC;

DO $cron_setup$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog';
    PERFORM cron.schedule(
      'ksops-live-transport-refresh',
      '*/5 * * * *',
      'SELECT public.refresh_live_transport_operations()'
    );
  END IF;
EXCEPTION
  WHEN insufficient_privilege OR undefined_function OR invalid_schema_name THEN
    RAISE NOTICE 'Supabase Cron is unavailable; refresh function remains callable by the migration owner.';
END;
$cron_setup$;

COMMENT ON FUNCTION public.refresh_live_transport_operations() IS
  'Keeps a seven-day rolling trip plan and derives live trip, dispatch, and vehicle states in Vietnam time.';

COMMIT;
