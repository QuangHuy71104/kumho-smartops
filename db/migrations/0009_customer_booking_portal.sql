-- KSOps migration 0009: customer identity, shopping cart checkout, and admin accounts.

BEGIN;

CREATE TABLE public.app_user_profiles (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email varchar(320) NOT NULL,
  display_name varchar(160) NOT NULL,
  phone varchar(32),
  role varchar(16) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  identity_provider varchar(24) NOT NULL DEFAULT 'google',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.passenger_booking_orders (
  id varchar(32) PRIMARY KEY,
  auth_user_id uuid NOT NULL REFERENCES public.app_user_profiles(auth_user_id),
  customer_name varchar(100) NOT NULL,
  customer_phone varchar(32) NOT NULL,
  customer_email varchar(320) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'Chờ thanh toán'
    CHECK (status IN ('Chờ thanh toán', 'Đã xác nhận', 'Đã hủy')),
  payment_method varchar(24) NOT NULL DEFAULT 'Chưa chọn'
    CHECK (payment_method IN ('Tiền mặt', 'Chuyển khoản', 'Thẻ ngân hàng', 'Ví điện tử', 'Chưa chọn')),
  total_amount bigint NOT NULL CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.passenger_booking_order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id varchar(32) NOT NULL REFERENCES public.passenger_booking_orders(id) ON DELETE CASCADE,
  trip_id varchar(24) NOT NULL REFERENCES public.ticket_trips(id),
  route_label varchar(360) NOT NULL,
  service_date date NOT NULL,
  departure_time time NOT NULL,
  seat_codes varchar(8)[] NOT NULL,
  unit_price bigint NOT NULL CHECK (unit_price >= 0),
  line_total bigint NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(seat_codes) BETWEEN 1 AND 10)
);

ALTER TABLE public.ticket_bookings
  ADD COLUMN IF NOT EXISTS customer_auth_user_id uuid REFERENCES public.app_user_profiles(auth_user_id),
  ADD COLUMN IF NOT EXISTS customer_order_id varchar(32) REFERENCES public.passenger_booking_orders(id);

CREATE INDEX passenger_booking_orders_user_created_idx
  ON public.passenger_booking_orders (auth_user_id, created_at DESC);
CREATE INDEX passenger_booking_order_items_order_idx
  ON public.passenger_booking_order_items (order_id);
CREATE INDEX ticket_bookings_customer_user_idx
  ON public.ticket_bookings (customer_auth_user_id, created_at DESC)
  WHERE customer_auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_app_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.app_user_profiles
    (auth_user_id, email, display_name, role, identity_provider)
  VALUES
    (NEW.id, COALESCE(NEW.email, ''),
     COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), NULLIF(NEW.raw_user_meta_data ->> 'name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'Khách hàng'),
     'customer', COALESCE(NULLIF(NEW.raw_app_meta_data ->> 'provider', ''), 'email'))
  ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    identity_provider = EXCLUDED.identity_provider,
    updated_at = now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE OF email, raw_user_meta_data, raw_app_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_app_user();

INSERT INTO public.app_user_profiles
  (auth_user_id, email, display_name, role, identity_provider)
SELECT id, COALESCE(email, ''),
  COALESCE(NULLIF(raw_user_meta_data ->> 'full_name', ''), NULLIF(raw_user_meta_data ->> 'name', ''), split_part(COALESCE(email, ''), '@', 1), 'Khách hàng'),
  'customer', COALESCE(NULLIF(raw_app_meta_data ->> 'provider', ''), 'email')
FROM auth.users
ON CONFLICT (auth_user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.app_user_profiles
  SET role = 'admin', updated_at = now()
  WHERE lower(email) = lower(target_email);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No Supabase Auth user exists for the supplied email';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_app_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_user_to_admin(text) FROM PUBLIC;

ALTER TABLE public.app_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_booking_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_booking_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_booking_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_booking_order_items FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.app_user_profiles, public.passenger_booking_orders, public.passenger_booking_order_items FROM PUBLIC;
DO $roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.app_user_profiles, public.passenger_booking_orders, public.passenger_booking_order_items FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.app_user_profiles, public.passenger_booking_orders, public.passenger_booking_order_items FROM authenticated;
  END IF;
END;
$roles$;

COMMENT ON TABLE public.app_user_profiles IS
  'Application-owned role mapping for Google customers and explicitly promoted admin accounts.';
COMMENT ON FUNCTION public.promote_user_to_admin(text) IS
  'Migration-owner helper used after an admin account is created through Supabase Auth.';

COMMIT;
