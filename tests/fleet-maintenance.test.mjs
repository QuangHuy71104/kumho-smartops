import assert from "node:assert/strict";
import test from "node:test";
import {
  fleetSummary,
  filterVehicles,
  vehicles,
  vehicleStatuses,
  vehicleTypes,
} from "../app/doi-xe/_lib/fleet.ts";
import {
  driverSummary,
  drivers,
  filterDrivers,
} from "../app/tai-xe/_lib/drivers.ts";
import {
  decodeChecklistStore,
  filterWorkOrders,
  maintenanceSummary,
  mileageAlerts,
  workOrders,
} from "../app/bao-duong/_lib/maintenance.ts";

test("fleet fixtures cover every supported vehicle class and lifecycle state", () => {
  assert.deepEqual(new Set(vehicles.map((vehicle) => vehicle.type)), new Set(vehicleTypes));
  assert.deepEqual(new Set(vehicles.map((vehicle) => vehicle.status)), new Set(vehicleStatuses));
  assert.equal(new Set(vehicles.map((vehicle) => vehicle.id)).size, vehicles.length);
  assert.ok(vehicles.every((vehicle) => vehicle.id.includes("DEMO") && vehicle.name.toLocaleLowerCase("vi-VN").includes("mẫu")));
});

test("fleet filters and summary remain internally consistent", () => {
  const readyCoaches = filterVehicles(vehicles, "mẫu", "Xe 45 chỗ", "Sẵn sàng");
  assert.ok(readyCoaches.length > 0);
  assert.ok(readyCoaches.every((vehicle) => vehicle.type === "Xe 45 chỗ" && vehicle.status === "Sẵn sàng"));
  assert.equal(fleetSummary.ready + fleetSummary.running + fleetSummary.maintenance, vehicles.length);
});

test("driver search, availability and compliance aggregates are deterministic", () => {
  const available = filterDrivers(drivers, "demo", "Sẵn sàng", "Tất cả");
  assert.ok(available.length > 0);
  assert.ok(available.every((driver) => driver.availability === "Sẵn sàng"));
  assert.equal(driverSummary.total, drivers.length);
  assert.equal(driverSummary.ready, drivers.filter((driver) => driver.availability === "Sẵn sàng").length);
  assert.ok(drivers.every((driver) => driver.id.includes("DEMO")));
});

test("maintenance priority filters and mileage alerts expose actionable records", () => {
  const urgent = filterWorkOrders(workOrders, "", "Tất cả", "Khẩn");
  assert.ok(urgent.length > 0);
  assert.ok(urgent.every((order) => order.priority === "Khẩn"));
  assert.equal(maintenanceSummary.open, workOrders.filter((order) => order.status !== "Hoàn tất").length);
  assert.ok(mileageAlerts.every((order) => order.remainingKm <= order.dailyKm * 2));
});

test("maintenance local state decoder rejects malformed and oversized data", () => {
  const valid = { "WO-DEMO-031": { oil: true, brake: false } };
  assert.deepEqual(decodeChecklistStore(valid), valid);
  assert.equal(decodeChecklistStore({ "WO-REAL-1": { oil: true } }), null);
  assert.equal(decodeChecklistStore({ "WO-DEMO-031": { oil: "yes" } }), null);
  assert.equal(decodeChecklistStore([]), null);
});
