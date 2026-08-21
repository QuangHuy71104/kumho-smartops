import assert from "node:assert/strict";
import test from "node:test";
import {
  availableSeatCount,
  createDemoBooking,
  decodeDemoBookings,
  seatsFor,
  ticketTrips,
} from "../app/ve-xe/_lib/ticket-data.ts";
import {
  demoDispatchTasks,
  filterDispatchTasks,
  getDispatchSummary,
  getUtilization,
  simulateAssignment,
} from "../app/dieu-phoi/_lib/dispatch.ts";
import {
  EMPTY_CONTRACT_DRAFT,
  buildContractRequest,
  decodeCreatedContractRequests,
  estimateContractValue,
  validateContractDraft,
} from "../app/hop-dong/_lib/contract-data.ts";
import { decodePaidInvoiceIds } from "../app/tai-chinh/_lib/finance.ts";
import { buildReportCsv, protectCsvCell } from "../app/bao-cao/_lib/reports.ts";

test("seat inventory is unique and local bookings cannot be counted twice", () => {
  const trip = ticketTrips[0];
  const initialSeats = seatsFor(trip);
  const freeSeat = initialSeats.find((seat) => !seat.reserved);
  assert.ok(freeSeat);
  assert.equal(new Set(initialSeats.map((seat) => seat.code)).size, trip.capacity);

  const booking = createDemoBooking(trip, [freeSeat.code, freeSeat.code], 1_725_000_123_456);
  assert.deepEqual(booking.seats, [freeSeat.code]);
  assert.equal(booking.total, trip.price);
  assert.equal(availableSeatCount(trip, [booking]), availableSeatCount(trip) - 1);
});

test("booking decoder validates trip, seat, price and status", () => {
  const trip = ticketTrips[0];
  const seat = seatsFor(trip).find((item) => !item.reserved);
  assert.ok(seat);
  const booking = createDemoBooking(trip, [seat.code], 1_725_000_123_456);
  assert.deepEqual(decodeDemoBookings([booking]), [booking]);
  assert.equal(decodeDemoBookings([{ ...booking, total: booking.total + 1 }]), null);
  assert.equal(decodeDemoBookings([{ ...booking, seats: ["Z99"] }]), null);
});

test("dispatch filtering, utilization and daily summary are bounded", () => {
  const date = demoDispatchTasks[0].date;
  const daily = filterDispatchTasks(demoDispatchTasks, {
    date,
    type: "Tất cả loại hình",
    status: "Tất cả trạng thái",
    shift: "Tất cả ca",
  });
  const summary = getDispatchSummary(demoDispatchTasks, date);
  assert.equal(summary.total, daily.length);
  assert.ok(daily.every((task) => getUtilization(task) >= 0 && getUtilization(task) <= 100));
});

test("dispatch simulation detects same-shift vehicle and driver conflicts", () => {
  const target = demoDispatchTasks.find((task) => task.status === "Chờ điều phối"
    && demoDispatchTasks.some((candidate) => candidate.id !== task.id
      && candidate.date === task.date
      && candidate.shift === task.shift
      && candidate.status !== "Chờ điều phối"));
  assert.ok(target);
  const occupied = demoDispatchTasks.find((task) => task.id !== target.id
    && task.date === target.date
    && task.shift === target.shift
    && task.status !== "Chờ điều phối");
  assert.ok(occupied);
  const result = simulateAssignment([...demoDispatchTasks], target.id, occupied.vehicleAlias, occupied.driverAlias);
  assert.equal(result.hasConflict, true);
  assert.equal(result.tasks.find((task) => task.id === target.id)?.status, "Có xung đột");
});

test("contract validation enforces chronology and fleet capacity", () => {
  const validDraft = {
    ...EMPTY_CONTRACT_DRAFT,
    title: "Hành trình đào tạo mẫu",
    startDate: "2026-09-01",
    endDate: "2026-09-02",
    passengerCount: 30,
    vehicleType: "Xe 16 chỗ",
    vehicleCount: 2,
  };
  assert.equal(validateContractDraft(validDraft), null);
  assert.ok(estimateContractValue(validDraft) > 0);
  assert.match(validateContractDraft({ ...validDraft, passengerCount: 33 }), /chưa đủ/i);
  assert.match(validateContractDraft({ ...validDraft, endDate: "2026-08-31" }), /không được trước/i);

  const request = buildContractRequest(validDraft, 1_725_000_123_456);
  assert.deepEqual(decodeCreatedContractRequests([request]), [request]);
  assert.equal(decodeCreatedContractRequests([{ ...request, passengerCount: -1 }]), null);
});

test("finance and report decoders guard stored state and CSV formulas", () => {
  assert.deepEqual(decodePaidInvoiceIds(["INV-DEMO-1", "INV-DEMO-1"]), ["INV-DEMO-1"]);
  assert.equal(decodePaidInvoiceIds(["INV-REAL-1"]), null);
  assert.equal(protectCsvCell("=HYPERLINK(\"unsafe\")"), "\"'=HYPERLINK(\"\"unsafe\"\")\"");
  const csv = buildReportCsv("30 ngày");
  assert.match(csv, /^\uFEFF/);
  assert.match(csv, /Tuyến cố định/);
});
