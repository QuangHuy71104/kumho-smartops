import { existsSync } from "node:fs";
import process from "node:process";
import pg from "pg";
import { customerRecords } from "../app/khach-hang/_lib/customer-data.ts";
import { contractRequests, decodeCreatedContractRequests } from "../app/hop-dong/_lib/contract-data.ts";
import { decodeStoredDispatchTasks, demoDispatchTasks } from "../app/dieu-phoi/_lib/dispatch.ts";
import { decodeStoredOrders, demoOrders } from "../app/don-hang/_lib/orders.ts";
import { drivers } from "../app/tai-xe/_lib/drivers.ts";
import { vehicles } from "../app/doi-xe/_lib/fleet.ts";
import {
  decodeChecklistStore,
  maintenanceSchedule,
  workOrders,
} from "../app/bao-duong/_lib/maintenance.ts";
import { cashFlow, decodePaidInvoiceIds, expenseBreakdown, invoices } from "../app/tai-chinh/_lib/finance.ts";
import { routePerformance, servicePerformance, snapshots } from "../app/bao-cao/_lib/reports.ts";
import {
  decodeDemoBookings,
  ticketRoutes,
  ticketTrips,
} from "../app/ve-xe/_lib/ticket-data.ts";

if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL is required.");

const url = new URL(connectionString);
const loopback = ["localhost", ["127", "0", "0", "1"].join("."), "[::1]"].includes(url.hostname);
const configuredCa = process.env.SUPABASE_DB_CA?.replaceAll("\\n", "\n").trim();
const ssl = loopback
  ? undefined
  : configuredCa
    ? { ca: configuredCa, rejectUnauthorized: true }
    : url.hostname.endsWith(".pooler.supabase.com") || url.hostname.endsWith(".supabase.co")
      ? { rejectUnauthorized: false }
      : (() => { throw new Error("Remote seed requires SUPABASE_DB_CA for verified TLS."); })();

const ORGANIZATION_ID = "KSO-TRANSPORT";

function viDateToIso(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error(`Invalid Vietnamese date: ${value}`);
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function customerIdForName(name) {
  return customerRecords.find((customer) => customer.displayName === name)?.id ?? null;
}

async function legacyPayload(client, key, decode, fallback) {
  const table = await client.query("SELECT to_regclass('platform.legacy_workspace_state')::text AS name");
  if (!table.rows[0]?.name) return fallback;
  const result = await client.query(
    "SELECT payload FROM platform.legacy_workspace_state WHERE state_key = $1",
    [key],
  );
  return decode(result.rows[0]?.payload) ?? fallback;
}

const pool = new pg.Pool({
  connectionString,
  ssl,
  max: 1,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 60_000,
  application_name: "ksops-relational-seed",
});

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const currentOrders = await legacyPayload(client, "orders", decodeStoredOrders, demoOrders);
    const currentDispatch = await legacyPayload(client, "dispatch", decodeStoredDispatchTasks, demoDispatchTasks);
    const currentBookings = await legacyPayload(client, "bookings", decodeDemoBookings, []);
    const createdContracts = await legacyPayload(client, "contracts", decodeCreatedContractRequests, []);
    const checklistStore = await legacyPayload(client, "maintenance-checklists", decodeChecklistStore, {});
    const manuallyPaidIds = await legacyPayload(client, "paid-invoices", decodePaidInvoiceIds, []);

    await client.query(
      `INSERT INTO public.organizations (id, code, legal_name, timezone, status)
       VALUES ($1, 'KUMHO_SMARTOPS', 'Công ty Cổ phần Vận tải Kumho SmartOps', 'Asia/Ho_Chi_Minh', 'active')
       ON CONFLICT (id) DO UPDATE SET legal_name = EXCLUDED.legal_name, updated_at = now()`,
      [ORGANIZATION_ID],
    );

    const branches = [
      ["CN-THU-DUC", "TD", "Trung tâm vận hành Thủ Đức", "depot", "TP. Hồ Chí Minh"],
      ["CN-BINH-TAN", "BT", "Trung tâm vận hành Bình Tân", "depot", "TP. Hồ Chí Minh"],
      ["BX-MIEN-DONG", "MDM", "Bến xe Miền Đông Mới", "station", "TP. Hồ Chí Minh"],
      ["KHO-SONG-THAN", "ST", "Kho trung chuyển Sóng Thần", "warehouse", "Bình Dương"],
      ["XUONG-THU-DUC", "XTD", "Xưởng kỹ thuật Thủ Đức", "workshop", "TP. Hồ Chí Minh"],
    ];
    for (const branch of branches) {
      await client.query(
        `INSERT INTO public.branches (id, organization_id, code, name, branch_type, city)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, branch_type = EXCLUDED.branch_type, city = EXCLUDED.city, updated_at = now()`,
        [branch[0], ORGANIZATION_ID, ...branch.slice(1)],
      );
    }

    const locations = [
      ["LOC-HCM", "CN-THU-DUC", "HCM", "TP. Hồ Chí Minh", "service_area", "TP. Hồ Chí Minh", 10.823099, 106.629664],
      ["LOC-THU-DUC", "CN-THU-DUC", "THU-DUC", "Kho trung chuyển Thủ Đức", "warehouse", "TP. Hồ Chí Minh", 10.849409, 106.753706],
      ["LOC-BINH-TAN", "CN-BINH-TAN", "BINH-TAN", "Kho Bình Tân", "warehouse", "TP. Hồ Chí Minh", 10.765258, 106.603853],
      ["LOC-MIEN-DONG", "BX-MIEN-DONG", "MIEN-DONG", "Bến xe Miền Đông Mới", "station", "TP. Hồ Chí Minh", 10.877891, 106.814146],
      ["LOC-SONG-THAN", "KHO-SONG-THAN", "SONG-THAN", "Kho trung chuyển Sóng Thần", "warehouse", "Bình Dương", 10.889911, 106.753383],
      ["LOC-BINH-DUONG", "KHO-SONG-THAN", "BINH-DUONG", "Bình Dương", "service_area", "Bình Dương", 11.325402, 106.477017],
      ["LOC-DONG-NAI", "CN-THU-DUC", "DONG-NAI", "Đồng Nai", "service_area", "Đồng Nai", 10.957413, 106.842687],
      ["LOC-VUNG-TAU", "BX-MIEN-DONG", "VUNG-TAU", "Bà Rịa – Vũng Tàu", "service_area", "Bà Rịa – Vũng Tàu", 10.411379, 107.136224],
    ];
    for (const location of locations) {
      await client.query(
        `INSERT INTO public.locations
           (id, organization_id, branch_id, code, name, location_type, city, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, updated_at = now()`,
        [location[0], ORGANIZATION_ID, ...location.slice(1)],
      );
    }

    for (const customer of customerRecords) {
      await client.query(
        `INSERT INTO public.customers
           (id, organization_id, display_name, customer_type, segment, risk_level, satisfaction,
            order_count, lifetime_value, last_interaction, account_owner, service_preference, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name, customer_type = EXCLUDED.customer_type,
           segment = EXCLUDED.segment, risk_level = EXCLUDED.risk_level,
           satisfaction = EXCLUDED.satisfaction, order_count = EXCLUDED.order_count,
           lifetime_value = EXCLUDED.lifetime_value, last_interaction = EXCLUDED.last_interaction,
           account_owner = EXCLUDED.account_owner, service_preference = EXCLUDED.service_preference,
           note = EXCLUDED.note, updated_at = now()`,
        [customer.id, ORGANIZATION_ID, customer.displayName, customer.type, customer.segment, customer.risk,
          customer.satisfaction, customer.orderCount, customer.lifetimeValue, customer.lastInteraction,
          customer.owner, customer.servicePreference, customer.note],
      );
      await client.query("DELETE FROM public.customer_tags WHERE customer_id = $1", [customer.id]);
      for (const tag of customer.tags) {
        await client.query("INSERT INTO public.customer_tags (customer_id, tag) VALUES ($1, $2)", [customer.id, tag]);
      }
      await client.query("DELETE FROM public.customer_orders WHERE customer_id = $1", [customer.id]);
      for (const order of customer.orders) {
        await client.query(
          `INSERT INTO public.customer_orders
             (id, customer_id, service_date, service_name, route_label, order_value, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [order.id, customer.id, viDateToIso(order.date), order.service, order.route, order.value, order.status],
        );
      }
    }

    for (const vehicle of vehicles) {
      await client.query(
        `INSERT INTO public.vehicles
           (id, organization_id, name, vehicle_type, operational_status, depot, current_driver_name,
            current_assignment, next_milestone, odometer_km, service_remaining_km,
            readiness_percent, capacity_label, last_inspection)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, vehicle_type = EXCLUDED.vehicle_type,
           operational_status = EXCLUDED.operational_status, depot = EXCLUDED.depot,
           current_driver_name = EXCLUDED.current_driver_name, current_assignment = EXCLUDED.current_assignment,
           next_milestone = EXCLUDED.next_milestone, odometer_km = EXCLUDED.odometer_km,
           service_remaining_km = EXCLUDED.service_remaining_km,
           readiness_percent = EXCLUDED.readiness_percent, capacity_label = EXCLUDED.capacity_label,
           last_inspection = EXCLUDED.last_inspection, updated_at = now()`,
        [vehicle.id, ORGANIZATION_ID, vehicle.name, vehicle.type, vehicle.status, vehicle.depot, vehicle.driver,
          vehicle.assignment, vehicle.nextMilestone, vehicle.odometer, vehicle.serviceRemaining,
          vehicle.readiness, vehicle.capacity, vehicle.lastInspection],
      );
    }

    for (const driver of drivers) {
      const vehicleId = vehicles.some((vehicle) => vehicle.id === driver.vehicle) ? driver.vehicle : null;
      await client.query(
        `INSERT INTO public.drivers
           (id, organization_id, full_name, availability, shift, shift_window, license_class,
            license_expiry, compliance_percent, hours_this_week, current_assignment, vehicle_id, home_base)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           full_name = EXCLUDED.full_name, availability = EXCLUDED.availability, shift = EXCLUDED.shift,
           shift_window = EXCLUDED.shift_window, license_class = EXCLUDED.license_class,
           license_expiry = EXCLUDED.license_expiry, compliance_percent = EXCLUDED.compliance_percent,
           hours_this_week = EXCLUDED.hours_this_week, current_assignment = EXCLUDED.current_assignment,
           vehicle_id = EXCLUDED.vehicle_id, home_base = EXCLUDED.home_base, updated_at = now()`,
        [driver.id, ORGANIZATION_ID, driver.name, driver.availability, driver.shift, driver.shiftWindow,
          driver.licenseClass, viDateToIso(driver.licenseExpiry), driver.compliance, driver.hoursThisWeek,
          driver.assignment, vehicleId, driver.homeBase],
      );
      await client.query("DELETE FROM public.driver_documents WHERE driver_id = $1", [driver.id]);
      for (const [index, document] of driver.documents.entries()) {
        await client.query(
          `INSERT INTO public.driver_documents
             (driver_id, document_name, verification_state, note, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [driver.id, document.label, document.state, document.note, index + 1],
        );
      }
      await client.query("DELETE FROM public.driver_schedules WHERE driver_id = $1", [driver.id]);
      for (const [index, schedule] of driver.schedule.entries()) {
        await client.query(
          "INSERT INTO public.driver_schedules (driver_id, time_label, task, note, sort_order) VALUES ($1, $2, $3, $4, $5)",
          [driver.id, schedule.time, schedule.task, schedule.note, index + 1],
        );
      }
    }

    for (const order of currentOrders) {
      await client.query(
        `INSERT INTO public.transport_orders
           (id, organization_id, customer_id, customer_name, service_type, cargo_type, origin,
            destination, distance_label, created_at, pickup_window, sla_deadline, sla_state,
            status, package_count, weight_kg, assignee, note, record_source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (id) DO NOTHING`,
        [order.id, ORGANIZATION_ID, customerIdForName(order.customerAlias), order.customerAlias,
          order.service, order.cargo, order.origin, order.destination, order.distanceLabel,
          order.createdAt, order.pickupWindow, order.slaDeadline, order.slaState, order.status,
          order.packageCount, order.weightKg, order.assigneeAlias, order.note,
          order.source === "seed" ? "seed" : "operator"],
      );
    }

    for (const task of currentDispatch) {
      await client.query(
        `INSERT INTO public.dispatch_tasks
           (id, organization_id, service_date, shift, time_range, dispatch_type, route_code,
            origin, destination, vehicle_id, driver_id, vehicle_display, driver_display,
            capacity_label, used_capacity, total_capacity, capacity_unit, status, risk_level, warnings, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         ON CONFLICT (id) DO NOTHING`,
        [task.id, ORGANIZATION_ID, task.date, task.shift, task.time, task.type, task.routeCode,
          task.origin, task.destination, task.vehicleId, task.driverId, task.vehicleAlias,
          task.driverAlias, task.capacityLabel, task.usedCapacity, task.totalCapacity,
          task.capacityUnit, task.status, task.risk, task.warnings, task.note],
      );
    }

    for (const route of ticketRoutes) {
      await client.query(
        `INSERT INTO public.ticket_routes (id, origin, destination, duration_label)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET origin = EXCLUDED.origin, destination = EXCLUDED.destination,
           duration_label = EXCLUDED.duration_label, updated_at = now()`,
        [route.id, route.origin, route.destination, route.duration],
      );
    }
    for (const trip of ticketTrips) {
      await client.query(
        `INSERT INTO public.ticket_trips
           (id, route_id, service_date, departure_time, arrival_time, vehicle_display,
            service_class, pickup_point, dropoff_point, seat_capacity, ticket_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           route_id = EXCLUDED.route_id, service_date = EXCLUDED.service_date,
           departure_time = EXCLUDED.departure_time, arrival_time = EXCLUDED.arrival_time,
           vehicle_display = EXCLUDED.vehicle_display, service_class = EXCLUDED.service_class,
           pickup_point = EXCLUDED.pickup_point, dropoff_point = EXCLUDED.dropoff_point,
           seat_capacity = EXCLUDED.seat_capacity, ticket_price = EXCLUDED.ticket_price, updated_at = now()`,
        [trip.id, trip.routeId, trip.date, trip.departure, trip.arrival, trip.vehicle,
          trip.serviceClass, trip.pickupPoint, trip.dropoffPoint, trip.capacity, trip.price],
      );
      await client.query("DELETE FROM public.trip_reserved_seats WHERE trip_id = $1 AND reservation_type = 'operational'", [trip.id]);
      for (const seat of trip.reservedSeats) {
        await client.query(
          "INSERT INTO public.trip_reserved_seats (trip_id, seat_code, reservation_type) VALUES ($1, $2, 'operational')",
          [trip.id, seat],
        );
      }
    }
    for (const booking of currentBookings) {
      const createdAt = Number.isNaN(Date.parse(booking.createdAt))
        ? new Date().toISOString()
        : booking.createdAt;
      const insertedBooking = await client.query(
        `INSERT INTO public.ticket_bookings
           (id, trip_id, route_label, service_date, departure_time, total_amount, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [booking.id, booking.tripId, booking.routeLabel, booking.date, booking.departure,
          booking.total, booking.status, createdAt],
      );
      if (!insertedBooking.rowCount) continue;
      const unitPrice = booking.seats.length ? Math.round(booking.total / booking.seats.length) : 0;
      for (const seat of booking.seats) {
        await client.query(
          "INSERT INTO public.booking_seats (booking_id, seat_code, unit_price) VALUES ($1, $2, $3)",
          [booking.id, seat, unitPrice],
        );
      }
    }

    for (const [recordSource, requests] of [["catalog", contractRequests], ["operator", createdContracts]]) {
      for (const request of requests) {
        const conflictAction = recordSource === "catalog"
          ? `DO UPDATE SET
               title = EXCLUDED.title, customer_group_type = EXCLUDED.customer_group_type,
               passenger_count = EXCLUDED.passenger_count, vehicle_type = EXCLUDED.vehicle_type,
               vehicle_count = EXCLUDED.vehicle_count, start_date = EXCLUDED.start_date,
               end_date = EXCLUDED.end_date, pickup_point = EXCLUDED.pickup_point,
               destination = EXCLUDED.destination, status = EXCLUDED.status,
               account_owner = EXCLUDED.account_owner, estimated_value = EXCLUDED.estimated_value,
               created_label = EXCLUDED.created_label, record_source = EXCLUDED.record_source, updated_at = now()`
          : "DO NOTHING";
        await client.query(
          `INSERT INTO public.contract_requests
             (id, title, customer_group_type, passenger_count, vehicle_type, vehicle_count,
              start_date, end_date, pickup_point, destination, status, account_owner,
              estimated_value, created_label, record_source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (id) ${conflictAction}`,
          [request.id, request.title, request.groupType, request.passengerCount, request.vehicleType,
            request.vehicleCount, request.startDate, request.endDate, request.pickup, request.destination,
            request.status, request.owner, request.estimatedValue, request.createdAt, recordSource],
        );
      }
    }

    for (const order of workOrders) {
      await client.query(
        `INSERT INTO public.maintenance_orders
           (id, vehicle_id, vehicle_name, job_name, status, priority, due_date, due_odometer_km,
            current_odometer_km, daily_distance_km, remaining_km, technician_team,
            workshop_bay, duration_label)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
           vehicle_name = EXCLUDED.vehicle_name, job_name = EXCLUDED.job_name,
           status = EXCLUDED.status, priority = EXCLUDED.priority, due_date = EXCLUDED.due_date,
           due_odometer_km = EXCLUDED.due_odometer_km,
           current_odometer_km = EXCLUDED.current_odometer_km,
           daily_distance_km = EXCLUDED.daily_distance_km, remaining_km = EXCLUDED.remaining_km,
           technician_team = EXCLUDED.technician_team, workshop_bay = EXCLUDED.workshop_bay,
           duration_label = EXCLUDED.duration_label, updated_at = now()`,
        [order.id, order.vehicleCode, order.vehicle, order.job, order.status, order.priority,
          viDateToIso(order.dueDate), order.dueOdometer, order.currentOdometer, order.dailyKm,
          order.remainingKm, order.technician, order.bay, order.duration],
      );
      for (const [index, item] of order.checklist.entries()) {
        const completed = checklistStore[order.id]?.[item.id] ?? item.done;
        await client.query(
          `INSERT INTO public.maintenance_checklist_items
             (maintenance_order_id, item_code, item_label, default_completed, is_completed, completed_at, sort_order)
           VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN now() ELSE NULL END, $6)
           ON CONFLICT (maintenance_order_id, item_code) DO UPDATE SET
             item_label = EXCLUDED.item_label,
             default_completed = EXCLUDED.default_completed,
             sort_order = EXCLUDED.sort_order`,
          [order.id, item.id, item.label, item.done, completed, index + 1],
        );
      }
    }
    await client.query("TRUNCATE public.maintenance_schedule RESTART IDENTITY");
    for (const [index, event] of maintenanceSchedule.entries()) {
      await client.query(
        `INSERT INTO public.maintenance_schedule
           (schedule_date, time_label, title, technician_team, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [`2026-08-${event.day}`, event.time, event.title, event.team, index + 1],
      );
    }

    for (const invoice of invoices) {
      const manuallyPaid = manuallyPaidIds.includes(invoice.id);
      await client.query(
        `INSERT INTO public.invoices
           (id, customer_id, customer_name, reference_code, service_type, amount, due_date,
            original_status, manually_paid, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $9 THEN now() ELSE NULL END)
         ON CONFLICT (id) DO UPDATE SET
           customer_id = EXCLUDED.customer_id, customer_name = EXCLUDED.customer_name,
           reference_code = EXCLUDED.reference_code, service_type = EXCLUDED.service_type,
           amount = EXCLUDED.amount, due_date = EXCLUDED.due_date,
           original_status = EXCLUDED.original_status, updated_at = now()`,
        [invoice.id, customerIdForName(invoice.customer), invoice.customer, invoice.reference,
          invoice.service, invoice.amount, viDateToIso(invoice.dueDate), invoice.status, manuallyPaid],
      );
    }
    for (const point of cashFlow) {
      const [day, month] = point.day.split("/");
      await client.query(
        `INSERT INTO public.cash_flow_daily (business_date, income_million, expense_million)
         VALUES ($1, $2, $3)
         ON CONFLICT (business_date) DO UPDATE SET income_million = EXCLUDED.income_million,
           expense_million = EXCLUDED.expense_million, updated_at = now()`,
        [`2026-${month}-${day}`, point.income, point.expense],
      );
    }
    for (const [index, expense] of expenseBreakdown.entries()) {
      await client.query(
        `INSERT INTO public.expense_categories (id, label, percentage, amount_label, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, percentage = EXCLUDED.percentage,
           amount_label = EXCLUDED.amount_label, sort_order = EXCLUDED.sort_order`,
        [`EXP-${String(index + 1).padStart(2, "0")}`, expense.label, expense.value, expense.amount, index + 1],
      );
    }

    for (const [period, snapshot] of Object.entries(snapshots)) {
      await client.query(
        `INSERT INTO public.report_snapshots
           (period, revenue_label, utilization_label, on_time_label, satisfaction_label,
            revenue_delta, utilization_delta, on_time_delta, satisfaction_delta, trend)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (period) DO UPDATE SET
           revenue_label = EXCLUDED.revenue_label, utilization_label = EXCLUDED.utilization_label,
           on_time_label = EXCLUDED.on_time_label, satisfaction_label = EXCLUDED.satisfaction_label,
           revenue_delta = EXCLUDED.revenue_delta, utilization_delta = EXCLUDED.utilization_delta,
           on_time_delta = EXCLUDED.on_time_delta, satisfaction_delta = EXCLUDED.satisfaction_delta,
           trend = EXCLUDED.trend, updated_at = now()`,
        [period, snapshot.revenue, snapshot.utilization, snapshot.onTime, snapshot.satisfaction,
          snapshot.revenueDelta, snapshot.utilizationDelta, snapshot.onTimeDelta,
          snapshot.satisfactionDelta, snapshot.trend],
      );
    }
    for (const [index, service] of servicePerformance.entries()) {
      await client.query(
        `INSERT INTO public.service_performance
           (id, service_name, order_volume_label, revenue_label, on_time_label, contribution_percent, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           service_name = EXCLUDED.service_name, order_volume_label = EXCLUDED.order_volume_label,
           revenue_label = EXCLUDED.revenue_label, on_time_label = EXCLUDED.on_time_label,
           contribution_percent = EXCLUDED.contribution_percent, sort_order = EXCLUDED.sort_order`,
        [`SVC-${String(index + 1).padStart(2, "0")}`, service.service, service.orders,
          service.revenue, service.onTime, service.contribution, index + 1],
      );
    }
    for (const [index, route] of routePerformance.entries()) {
      await client.query(
        `INSERT INTO public.route_performance
           (id, route_label, load_percent, score, note, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           route_label = EXCLUDED.route_label, load_percent = EXCLUDED.load_percent,
           score = EXCLUDED.score, note = EXCLUDED.note, sort_order = EXCLUDED.sort_order`,
        [`RPT-${String(index + 1).padStart(2, "0")}`, route.route, route.load,
          route.score, route.note, index + 1],
      );
    }

    await client.query("DELETE FROM platform.legacy_workspace_state");
    await client.query("COMMIT");
    process.stdout.write(
      `seeded relational operations: ${currentOrders.length} orders, ${currentDispatch.length} dispatch tasks, ${currentBookings.length} bookings\n`,
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
