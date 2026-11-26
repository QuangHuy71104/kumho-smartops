import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspacePool } from "../../../../lib/server/db/workspace-pool.ts";
import { readBoundedJson } from "../../../../lib/server/http/json-body.ts";
import { requireSameOrigin } from "../../../../lib/server/http/origin.ts";
import { errorProblemResponse, problemResponse } from "../../../../lib/server/http/problem.ts";
import { getCurrentAppUser } from "../../../../lib/supabase/server.ts";
import { ApplicationError } from "../../../../modules/shared/application/errors.ts";

export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().min(7).max(32).refine((value) => (value.match(/\d/g)?.length ?? 0) >= 7),
  paymentMethod: z.enum(["Tiền mặt", "Chuyển khoản", "Thẻ ngân hàng", "Ví điện tử", "Chưa chọn"]),
  items: z.array(z.object({
    tripId: z.string().regex(/^TRP-[A-Z0-9-]{5,22}$/),
    seats: z.array(z.string().regex(/^[A-D]\d{2}$/)).min(1).max(10),
  })).min(1).max(5),
}).strict();

function orderId() {
  const stamp = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `KGO-${stamp}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return problemResponse({ status: 401, code: "AUTHENTICATION_REQUIRED" });
  const result = await getWorkspacePool().query(
    `SELECT orders.id, orders.customer_name, orders.customer_phone, orders.customer_email,
            orders.status, orders.payment_method, orders.total_amount, orders.created_at,
            COALESCE(json_agg(json_build_object(
              'tripId', items.trip_id, 'routeLabel', items.route_label,
              'date', items.service_date, 'departure', items.departure_time,
              'seats', items.seat_codes, 'lineTotal', items.line_total
            ) ORDER BY items.id) FILTER (WHERE items.id IS NOT NULL), '[]') AS items
       FROM public.passenger_booking_orders AS orders
       LEFT JOIN public.passenger_booking_order_items AS items ON items.order_id = orders.id
      WHERE orders.auth_user_id = $1
      GROUP BY orders.id
      ORDER BY orders.created_at DESC
      LIMIT 50`,
    [user.id],
  );
  return NextResponse.json({ orders: result.rows }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const user = await getCurrentAppUser();
    if (!user) throw new ApplicationError("AUTHENTICATION_REQUIRED", "Vui lòng đăng nhập Google trước khi đặt vé.");
    const parsed = checkoutSchema.safeParse(await readBoundedJson(request));
    if (!parsed.success) throw new ApplicationError("VALIDATION_FAILED", "Thông tin hành khách hoặc giỏ vé chưa hợp lệ.");

    const uniqueTripIds = [...new Set(parsed.data.items.map((item) => item.tripId))];
    if (uniqueTripIds.length !== parsed.data.items.length) {
      throw new ApplicationError("VALIDATION_FAILED", "Mỗi chuyến chỉ được xuất hiện một lần trong giỏ vé.");
    }

    const client = await getWorkspacePool().connect();
    try {
      await client.query("BEGIN");
      const tripResult = await client.query(
        `SELECT trips.id, trips.service_date::text AS service_date,
                to_char(trips.departure_time, 'HH24:MI') AS departure_time,
                trips.seat_capacity, trips.ticket_price, trips.status,
                routes.origin || ' → ' || routes.destination AS route_label
           FROM public.ticket_trips AS trips
           JOIN public.ticket_routes AS routes ON routes.id = trips.route_id
          WHERE trips.id = ANY($1::varchar[])
          FOR UPDATE OF trips`,
        [uniqueTripIds],
      );
      const trips = new Map(tripResult.rows.map((trip) => [String(trip.id), trip]));
      if (trips.size !== uniqueTripIds.length) throw new ApplicationError("NOT_FOUND", "Có chuyến xe không còn tồn tại.");

      let totalAmount = 0;
      const normalizedItems = parsed.data.items.map((item) => {
        const trip = trips.get(item.tripId);
        if (!trip || trip.status === "completed" || trip.status === "cancelled") {
          throw new ApplicationError("VALIDATION_FAILED", "Có chuyến xe đã kết thúc hoặc ngừng nhận khách.");
        }
        const seats = [...new Set(item.seats)];
        if (seats.length !== item.seats.length) throw new ApplicationError("VALIDATION_FAILED", "Giỏ vé có ghế bị trùng.");
        const capacity = Number(trip.seat_capacity);
        const validSeats = seats.every((seat) => {
          const position = seat.charCodeAt(0) - 65;
          const row = Number(seat.slice(1));
          const seatNumber = (row - 1) * 4 + position + 1;
          return row > 0 && seatNumber <= capacity;
        });
        if (!validSeats) throw new ApplicationError("VALIDATION_FAILED", "Mã ghế không thuộc sơ đồ của chuyến xe.");
        const unitPrice = Number(trip.ticket_price);
        const lineTotal = unitPrice * seats.length;
        totalAmount += lineTotal;
        return { ...item, seats, trip, unitPrice, lineTotal };
      });

      const id = orderId();
      await client.query(
        `INSERT INTO public.passenger_booking_orders
           (id, auth_user_id, customer_name, customer_phone, customer_email, payment_method, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, user.id, parsed.data.customerName, parsed.data.customerPhone, user.email,
          parsed.data.paymentMethod, totalAmount],
      );

      for (const [index, item] of normalizedItems.entries()) {
        for (const seat of item.seats) {
          await client.query(
            "INSERT INTO public.trip_reserved_seats (trip_id, seat_code, reservation_type) VALUES ($1, $2, 'booking')",
            [item.tripId, seat],
          );
        }
        await client.query(
          `INSERT INTO public.passenger_booking_order_items
             (order_id, trip_id, route_label, service_date, departure_time, seat_codes, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, item.tripId, item.trip.route_label, item.trip.service_date, item.trip.departure_time,
            item.seats, item.unitPrice, item.lineTotal],
        );
        const bookingId = `BK-${id.slice(4)}-${index + 1}`;
        await client.query(
          `INSERT INTO public.ticket_bookings
             (id, trip_id, route_label, service_date, departure_time, total_amount, status,
              customer_name, customer_phone, booking_channel, payment_status, payment_method,
              customer_auth_user_id, customer_order_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'Đã giữ chỗ', $7, $8, 'Website',
             'Chưa thanh toán', $9, $10, $11, now())`,
          [bookingId, item.tripId, item.trip.route_label, item.trip.service_date,
            item.trip.departure_time, item.lineTotal, parsed.data.customerName,
            parsed.data.customerPhone, parsed.data.paymentMethod, user.id, id],
        );
        for (const seat of item.seats) {
          await client.query(
            "INSERT INTO public.booking_seats (booking_id, seat_code, unit_price) VALUES ($1, $2, $3)",
            [bookingId, seat, item.unitPrice],
          );
        }
      }
      await client.query("COMMIT");
      return NextResponse.json({ order: { id, totalAmount, status: "Chờ thanh toán" } }, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if ((error as { code?: string }).code === "23505") {
        throw new ApplicationError("IDEMPOTENCY_CONFLICT", "Một ghế trong giỏ vừa được khách khác đặt. Vui lòng chọn lại.");
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return errorProblemResponse(error);
  }
}
