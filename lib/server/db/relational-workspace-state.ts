import "server-only";

import type { PoolClient, QueryResult } from "pg";
import { ApplicationError } from "../../../modules/shared/application/errors.ts";
import { decodeChecklistStore } from "../../../app/bao-duong/_lib/maintenance.ts";
import { decodeStoredDispatchTasks } from "../../../app/dieu-phoi/_lib/dispatch.ts";
import { decodeStoredOrders } from "../../../app/don-hang/_lib/orders.ts";
import { decodeCreatedContractRequests } from "../../../app/hop-dong/_lib/contract-data.ts";
import { decodePaidInvoiceIds } from "../../../app/tai-chinh/_lib/finance.ts";
import { decodeDemoBookings } from "../../../app/ve-xe/_lib/ticket-data.ts";
import type { WorkspaceStateKey } from "../../workspace-state.ts";
import { getWorkspacePool } from "./workspace-pool.ts";

const ORGANIZATION_ID = "KSO-TRANSPORT";

type Queryable = {
  query: (text: string, values?: readonly unknown[]) => Promise<QueryResult>;
};

function isoDate(value: unknown) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid database date value.");
  return parsed.toISOString().slice(0, 10);
}

function dateLabel(value: unknown) {
  const [year, month, day] = isoDate(value).split("-");
  return `${day}/${month}/${year}`;
}

function timeLabel(value: string) {
  return value.slice(0, 5);
}

async function rows(queryable: Queryable, sql: string, values?: readonly unknown[]) {
  return (await queryable.query(sql, values)).rows;
}

async function readOrders(queryable: Queryable) {
  return (await rows(queryable, `
    SELECT id, customer_name, service_type, cargo_type, origin, destination,
           distance_label, created_at, pickup_window, sla_deadline, sla_state,
           status, package_count, weight_kg, assignee, note, record_source
      FROM public.transport_orders
     ORDER BY created_at DESC, id
  `)).map((row) => ({
    id: row.id,
    customerAlias: row.customer_name,
    service: row.service_type,
    cargo: row.cargo_type,
    origin: row.origin,
    destination: row.destination,
    distanceLabel: row.distance_label,
    createdAt: new Date(row.created_at).toISOString(),
    pickupWindow: row.pickup_window,
    slaDeadline: new Date(row.sla_deadline).toISOString(),
    slaState: row.sla_state,
    status: row.status,
    packageCount: Number(row.package_count),
    weightKg: Number(row.weight_kg),
    assigneeAlias: row.assignee,
    note: row.note,
    source: row.record_source === "operator" ? "local-demo" : "seed",
  }));
}

async function readDispatch(queryable: Queryable) {
  return (await rows(queryable, `
    SELECT id, service_date, shift, time_range, dispatch_type, route_code, origin,
           destination, vehicle_id, driver_id, vehicle_display, driver_display,
           capacity_label, used_capacity, total_capacity, capacity_unit, status,
           risk_level, warnings, note
      FROM public.dispatch_tasks
     ORDER BY service_date, time_range, id
  `)).map((row) => ({
    id: row.id,
    date: isoDate(row.service_date),
    shift: row.shift,
    time: row.time_range,
    type: row.dispatch_type,
    routeCode: row.route_code,
    origin: row.origin,
    destination: row.destination,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    vehicleAlias: row.vehicle_display,
    driverAlias: row.driver_display,
    capacityLabel: row.capacity_label,
    usedCapacity: Number(row.used_capacity),
    totalCapacity: Number(row.total_capacity),
    capacityUnit: row.capacity_unit,
    status: row.status,
    risk: row.risk_level,
    warnings: row.warnings,
    note: row.note,
  }));
}

async function readFleet(queryable: Queryable) {
  return (await rows(queryable, "SELECT * FROM public.vehicles ORDER BY id")).map((row) => ({
    id: row.id,
    name: row.name,
    type: row.vehicle_type,
    status: row.operational_status,
    depot: row.depot,
    driver: row.current_driver_name,
    assignment: row.current_assignment,
    nextMilestone: row.next_milestone,
    odometer: Number(row.odometer_km),
    serviceRemaining: Number(row.service_remaining_km),
    readiness: Number(row.readiness_percent),
    capacity: row.capacity_label,
    lastInspection: row.last_inspection,
  }));
}

async function readDrivers(queryable: Queryable) {
  const [driverRows, documentRows, scheduleRows] = await Promise.all([
    rows(queryable, "SELECT * FROM public.drivers ORDER BY id"),
    rows(queryable, "SELECT * FROM public.driver_documents ORDER BY driver_id, sort_order"),
    rows(queryable, "SELECT * FROM public.driver_schedules ORDER BY driver_id, sort_order"),
  ]);
  return driverRows.map((row) => ({
    id: row.id,
    name: row.full_name,
    availability: row.availability,
    shift: row.shift,
    shiftWindow: row.shift_window,
    licenseClass: row.license_class,
    licenseExpiry: dateLabel(row.license_expiry),
    compliance: Number(row.compliance_percent),
    hoursThisWeek: Number(row.hours_this_week),
    assignment: row.current_assignment,
    vehicle: row.vehicle_id ?? "Chưa gán xe",
    homeBase: row.home_base,
    documents: documentRows.filter((item) => item.driver_id === row.id).map((item) => ({
      label: item.document_name,
      state: item.verification_state,
      note: item.note,
    })),
    schedule: scheduleRows.filter((item) => item.driver_id === row.id).map((item) => ({
      time: item.time_label,
      task: item.task,
      note: item.note,
    })),
  }));
}

async function readTicketCatalog(queryable: Queryable) {
  const [routeRows, tripRows, seatRows] = await Promise.all([
    rows(queryable, "SELECT * FROM public.ticket_routes WHERE status = 'active' ORDER BY id"),
    rows(queryable, "SELECT * FROM public.ticket_trips WHERE status <> 'cancelled' ORDER BY service_date, departure_time, id"),
    rows(queryable, "SELECT * FROM public.trip_reserved_seats WHERE reservation_type = 'operational' ORDER BY trip_id, seat_code"),
  ]);
  return {
    routes: routeRows.map((row) => ({ id: row.id, origin: row.origin, destination: row.destination, duration: row.duration_label })),
    trips: tripRows.map((row) => ({
      id: row.id,
      routeId: row.route_id,
      date: isoDate(row.service_date),
      departure: timeLabel(row.departure_time),
      arrival: timeLabel(row.arrival_time),
      vehicle: row.vehicle_display,
      serviceClass: row.service_class,
      pickupPoint: row.pickup_point,
      dropoffPoint: row.dropoff_point,
      capacity: Number(row.seat_capacity),
      price: Number(row.ticket_price),
      reservedSeats: seatRows.filter((seat) => seat.trip_id === row.id).map((seat) => seat.seat_code),
    })),
  };
}

async function readBookings(queryable: Queryable) {
  const [bookingRows, seatRows] = await Promise.all([
    rows(queryable, "SELECT * FROM public.ticket_bookings ORDER BY created_at DESC, id"),
    rows(queryable, "SELECT * FROM public.booking_seats ORDER BY booking_id, seat_code"),
  ]);
  return bookingRows.map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    routeLabel: row.route_label,
    date: isoDate(row.service_date),
    departure: timeLabel(row.departure_time),
    seats: seatRows.filter((seat) => seat.booking_id === row.id).map((seat) => seat.seat_code),
    total: Number(row.total_amount),
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    bookingChannel: row.booking_channel,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
  }));
}

function contractFromRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    groupType: row.customer_group_type,
    passengerCount: Number(row.passenger_count),
    vehicleType: row.vehicle_type,
    vehicleCount: Number(row.vehicle_count),
    startDate: isoDate(row.start_date),
    endDate: isoDate(row.end_date),
    pickup: row.pickup_point,
    destination: row.destination,
    status: row.status,
    owner: row.account_owner,
    estimatedValue: Number(row.estimated_value),
    createdAt: row.created_label,
  };
}

async function readContracts(queryable: Queryable, source: "catalog" | "operator") {
  return (await rows(
    queryable,
    "SELECT * FROM public.contract_requests WHERE record_source = $1 ORDER BY start_date, id",
    [source],
  )).map(contractFromRow);
}

async function readCustomers(queryable: Queryable) {
  const [customerRows, tagRows, orderRows] = await Promise.all([
    rows(queryable, "SELECT * FROM public.customers ORDER BY id"),
    rows(queryable, "SELECT * FROM public.customer_tags ORDER BY customer_id, tag"),
    rows(queryable, "SELECT * FROM public.customer_orders ORDER BY customer_id, service_date DESC, id"),
  ]);
  return customerRows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    type: row.customer_type,
    segment: row.segment,
    risk: row.risk_level,
    satisfaction: Number(row.satisfaction),
    orderCount: Number(row.order_count),
    lifetimeValue: Number(row.lifetime_value),
    lastInteraction: row.last_interaction,
    owner: row.account_owner,
    servicePreference: row.service_preference,
    tags: tagRows.filter((tag) => tag.customer_id === row.id).map((tag) => tag.tag),
    note: row.note,
    orders: orderRows.filter((order) => order.customer_id === row.id).map((order) => ({
      id: order.id,
      date: dateLabel(order.service_date),
      service: order.service_name,
      route: order.route_label,
      value: Number(order.order_value),
      status: order.status,
    })),
  }));
}

async function readMaintenance(queryable: Queryable) {
  const [orderRows, checklistRows, scheduleRows] = await Promise.all([
    rows(queryable, "SELECT * FROM public.maintenance_orders ORDER BY due_date, id"),
    rows(queryable, "SELECT * FROM public.maintenance_checklist_items ORDER BY maintenance_order_id, sort_order"),
    rows(queryable, "SELECT * FROM public.maintenance_schedule ORDER BY schedule_date, sort_order"),
  ]);
  const workOrders = orderRows.map((row) => ({
    id: row.id,
    vehicle: row.vehicle_name,
    vehicleCode: row.vehicle_id,
    job: row.job_name,
    status: row.status,
    priority: row.priority,
    dueDate: dateLabel(row.due_date),
    dueOdometer: Number(row.due_odometer_km),
    currentOdometer: Number(row.current_odometer_km),
    dailyKm: Number(row.daily_distance_km),
    remainingKm: Number(row.remaining_km),
    technician: row.technician_team,
    bay: row.workshop_bay,
    duration: row.duration_label,
    checklist: checklistRows.filter((item) => item.maintenance_order_id === row.id).map((item) => ({
      id: item.item_code,
      label: item.item_label,
      done: item.default_completed,
    })),
  }));
  return {
    workOrders,
    mileageAlerts: [...workOrders]
      .filter((order) => order.remainingKm <= order.dailyKm * 2)
      .sort((first, second) => first.remainingKm - second.remainingKm)
      .slice(0, 4),
    schedule: scheduleRows.map((row) => ({
      day: isoDate(row.schedule_date).slice(8, 10),
      month: "THÁNG 8",
      time: row.time_label,
      title: row.title,
      team: row.technician_team,
    })),
  };
}

async function readChecklistStore(queryable: Queryable) {
  const checklistRows = await rows(
    queryable,
    "SELECT maintenance_order_id, item_code, is_completed FROM public.maintenance_checklist_items ORDER BY maintenance_order_id, sort_order",
  );
  const store: Record<string, Record<string, boolean>> = {};
  for (const row of checklistRows) {
    store[row.maintenance_order_id] ??= {};
    store[row.maintenance_order_id][row.item_code] = row.is_completed;
  }
  return store;
}

async function readFinance(queryable: Queryable) {
  const [invoiceRows, cashRows, expenseRows] = await Promise.all([
    rows(queryable, "SELECT * FROM public.invoices ORDER BY id DESC"),
    rows(queryable, "SELECT * FROM public.cash_flow_daily ORDER BY business_date"),
    rows(queryable, "SELECT * FROM public.expense_categories ORDER BY sort_order"),
  ]);
  return {
    invoices: invoiceRows.map((row) => ({
      id: row.id,
      customer: row.customer_name,
      reference: row.reference_code,
      service: row.service_type,
      amount: Number(row.amount),
      dueDate: dateLabel(row.due_date),
      status: row.manually_paid ? "Đã thanh toán" : row.original_status,
    })),
    cashFlow: cashRows.map((row) => ({
      day: `${isoDate(row.business_date).slice(8, 10)}/${isoDate(row.business_date).slice(5, 7)}`,
      income: Number(row.income_million),
      expense: Number(row.expense_million),
    })),
    expenseBreakdown: expenseRows.map((row) => ({
      label: row.label,
      value: Number(row.percentage),
      amount: row.amount_label,
    })),
  };
}

async function readReports(queryable: Queryable) {
  const [snapshotRows, serviceRows, routeRows] = await Promise.all([
    rows(queryable, "SELECT * FROM public.report_snapshots"),
    rows(queryable, "SELECT * FROM public.service_performance ORDER BY sort_order"),
    rows(queryable, "SELECT * FROM public.route_performance ORDER BY sort_order"),
  ]);
  return {
    snapshots: Object.fromEntries(snapshotRows.map((row) => [row.period, {
      revenue: row.revenue_label,
      utilization: row.utilization_label,
      onTime: row.on_time_label,
      satisfaction: row.satisfaction_label,
      revenueDelta: row.revenue_delta,
      utilizationDelta: row.utilization_delta,
      onTimeDelta: row.on_time_delta,
      satisfactionDelta: row.satisfaction_delta,
      trend: row.trend,
    }])),
    servicePerformance: serviceRows.map((row) => ({
      service: row.service_name,
      orders: row.order_volume_label,
      revenue: row.revenue_label,
      onTime: row.on_time_label,
      contribution: Number(row.contribution_percent),
    })),
    routePerformance: routeRows.map((row) => ({
      route: row.route_label,
      load: Number(row.load_percent),
      score: row.score,
      note: row.note,
    })),
  };
}

export async function readRelationalWorkspaceState(
  key: WorkspaceStateKey,
  queryable: Queryable = getWorkspacePool(),
): Promise<unknown> {
  switch (key) {
    case "orders": return readOrders(queryable);
    case "dispatch": return readDispatch(queryable);
    case "fleet": return readFleet(queryable);
    case "drivers": return readDrivers(queryable);
    case "ticket-catalog": return readTicketCatalog(queryable);
    case "bookings": return readBookings(queryable);
    case "contract-catalog": return readContracts(queryable, "catalog");
    case "contracts": return readContracts(queryable, "operator");
    case "customers": return readCustomers(queryable);
    case "maintenance": return readMaintenance(queryable);
    case "maintenance-checklists": return readChecklistStore(queryable);
    case "finance": return readFinance(queryable);
    case "paid-invoices": return (await rows(queryable, "SELECT id FROM public.invoices WHERE manually_paid ORDER BY id")).map((row) => row.id);
    case "reports": return readReports(queryable);
  }
}

async function writeOrders(client: PoolClient, data: unknown) {
  const orders = decodeStoredOrders(data);
  if (!orders) throw new ApplicationError("BAD_REQUEST", "Danh sách đơn hàng không hợp lệ.");
  for (const order of orders) {
    await client.query(
      `INSERT INTO public.transport_orders
         (id, organization_id, customer_id, customer_name, service_type, cargo_type, origin,
          destination, distance_label, created_at, pickup_window, sla_deadline, sla_state,
          status, package_count, weight_kg, assignee, note, record_source)
       VALUES ($1, $2, (SELECT id FROM public.customers WHERE display_name = $3 LIMIT 1),
               $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (id) DO UPDATE SET
         customer_id = EXCLUDED.customer_id, customer_name = EXCLUDED.customer_name,
         service_type = EXCLUDED.service_type, cargo_type = EXCLUDED.cargo_type,
         origin = EXCLUDED.origin, destination = EXCLUDED.destination,
         distance_label = EXCLUDED.distance_label, pickup_window = EXCLUDED.pickup_window,
         sla_deadline = EXCLUDED.sla_deadline, sla_state = EXCLUDED.sla_state,
         status = EXCLUDED.status, package_count = EXCLUDED.package_count,
         weight_kg = EXCLUDED.weight_kg, assignee = EXCLUDED.assignee,
         note = EXCLUDED.note, record_source = EXCLUDED.record_source, updated_at = now()`,
      [order.id, ORGANIZATION_ID, order.customerAlias, order.service, order.cargo,
        order.origin, order.destination, order.distanceLabel, order.createdAt, order.pickupWindow,
        order.slaDeadline, order.slaState, order.status, order.packageCount, order.weightKg,
        order.assigneeAlias, order.note, order.source === "seed" ? "seed" : "operator"],
    );
  }
  await client.query("DELETE FROM public.transport_orders WHERE NOT (id = ANY($1::varchar[]))", [orders.map((order) => order.id)]);
}

async function writeDispatch(client: PoolClient, data: unknown) {
  const tasks = decodeStoredDispatchTasks(data);
  if (!tasks) throw new ApplicationError("BAD_REQUEST", "Danh sách điều phối không hợp lệ.");
  for (const task of tasks) {
    await client.query(
      `INSERT INTO public.dispatch_tasks
         (id, organization_id, service_date, shift, time_range, dispatch_type, route_code,
          origin, destination, vehicle_id, driver_id, vehicle_display, driver_display,
          capacity_label, used_capacity, total_capacity, capacity_unit, status, risk_level, warnings, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       ON CONFLICT (id) DO UPDATE SET
         service_date = EXCLUDED.service_date, shift = EXCLUDED.shift, time_range = EXCLUDED.time_range,
         dispatch_type = EXCLUDED.dispatch_type, route_code = EXCLUDED.route_code,
         origin = EXCLUDED.origin, destination = EXCLUDED.destination,
         vehicle_id = EXCLUDED.vehicle_id, driver_id = EXCLUDED.driver_id,
         vehicle_display = EXCLUDED.vehicle_display, driver_display = EXCLUDED.driver_display,
         capacity_label = EXCLUDED.capacity_label, used_capacity = EXCLUDED.used_capacity,
         total_capacity = EXCLUDED.total_capacity, capacity_unit = EXCLUDED.capacity_unit,
         status = EXCLUDED.status, risk_level = EXCLUDED.risk_level,
         warnings = EXCLUDED.warnings, note = EXCLUDED.note, updated_at = now()`,
      [task.id, ORGANIZATION_ID, task.date, task.shift, task.time, task.type, task.routeCode,
        task.origin, task.destination, task.vehicleId, task.driverId, task.vehicleAlias,
        task.driverAlias, task.capacityLabel, task.usedCapacity, task.totalCapacity,
        task.capacityUnit, task.status, task.risk, task.warnings, task.note],
    );
  }
  await client.query("DELETE FROM public.dispatch_tasks WHERE NOT (id = ANY($1::varchar[]))", [tasks.map((task) => task.id)]);
}

async function writeBookings(client: PoolClient, data: unknown) {
  const bookings = decodeDemoBookings(data);
  if (!bookings) throw new ApplicationError("BAD_REQUEST", "Danh sách đặt vé không hợp lệ.");
  await client.query("DELETE FROM public.ticket_bookings");
  for (const booking of bookings) {
    const createdAt = Number.isNaN(Date.parse(booking.createdAt))
      ? new Date().toISOString()
      : booking.createdAt;
    await client.query(
      `INSERT INTO public.ticket_bookings
         (id, trip_id, route_label, service_date, departure_time, total_amount, status, created_at,
          customer_name, customer_phone, booking_channel, payment_status, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [booking.id, booking.tripId, booking.routeLabel, booking.date, booking.departure,
        booking.total, booking.status, createdAt, booking.customerName, booking.customerPhone,
        booking.bookingChannel, booking.paymentStatus, booking.paymentMethod],
    );
    const unitPrice = booking.seats.length ? Math.round(booking.total / booking.seats.length) : 0;
    for (const seat of booking.seats) {
      await client.query(
        "INSERT INTO public.booking_seats (booking_id, seat_code, unit_price) VALUES ($1, $2, $3)",
        [booking.id, seat, unitPrice],
      );
    }
  }
}

async function writeContracts(client: PoolClient, data: unknown) {
  const requests = decodeCreatedContractRequests(data);
  if (!requests) throw new ApplicationError("BAD_REQUEST", "Danh sách hợp đồng không hợp lệ.");
  await client.query("DELETE FROM public.contract_requests WHERE record_source = 'operator'");
  for (const request of requests) {
    await client.query(
      `INSERT INTO public.contract_requests
         (id, title, customer_group_type, passenger_count, vehicle_type, vehicle_count,
          start_date, end_date, pickup_point, destination, status, account_owner,
          estimated_value, created_label, record_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'operator')`,
      [request.id, request.title, request.groupType, request.passengerCount, request.vehicleType,
        request.vehicleCount, request.startDate, request.endDate, request.pickup, request.destination,
        request.status, request.owner, request.estimatedValue, request.createdAt],
    );
  }
}

async function writeChecklists(client: PoolClient, data: unknown) {
  const store = decodeChecklistStore(data);
  if (!store) throw new ApplicationError("BAD_REQUEST", "Dữ liệu checklist không hợp lệ.");
  await client.query(
    `UPDATE public.maintenance_checklist_items
        SET is_completed = default_completed,
            completed_at = CASE WHEN default_completed THEN now() ELSE NULL END`,
  );
  for (const [orderId, items] of Object.entries(store)) {
    for (const [itemCode, completed] of Object.entries(items)) {
      await client.query(
        `UPDATE public.maintenance_checklist_items
            SET is_completed = $3,
                completed_at = CASE WHEN $3 THEN now() ELSE NULL END
          WHERE maintenance_order_id = $1 AND item_code = $2`,
        [orderId, itemCode, completed],
      );
    }
  }
}

async function writePaidInvoices(client: PoolClient, data: unknown) {
  const ids = decodePaidInvoiceIds(data);
  if (!ids) throw new ApplicationError("BAD_REQUEST", "Danh sách hóa đơn không hợp lệ.");
  await client.query("UPDATE public.invoices SET manually_paid = false, paid_at = NULL, updated_at = now()");
  if (ids.length) {
    await client.query(
      "UPDATE public.invoices SET manually_paid = true, paid_at = now(), updated_at = now() WHERE id = ANY($1::varchar[])",
      [ids],
    );
  }
}

export async function writeRelationalWorkspaceState(key: WorkspaceStateKey, data: unknown) {
  const client = await getWorkspacePool().connect();
  try {
    await client.query("BEGIN");
    switch (key) {
      case "orders": await writeOrders(client, data); break;
      case "dispatch": await writeDispatch(client, data); break;
      case "bookings": await writeBookings(client, data); break;
      case "contracts": await writeContracts(client, data); break;
      case "maintenance-checklists": await writeChecklists(client, data); break;
      case "paid-invoices": await writePaidInvoices(client, data); break;
      default: throw new ApplicationError("BAD_REQUEST", "Phân hệ này chỉ hỗ trợ đọc dữ liệu.");
    }
    const stored = await readRelationalWorkspaceState(key, client);
    await client.query("COMMIT");
    return stored;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
