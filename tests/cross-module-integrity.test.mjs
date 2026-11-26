import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  buildDashboardOrder,
  createOrderHref,
  dashboardFleetSummary,
  dashboardMetrics,
  fleetReadiness,
  getOrderDetailsHref,
  nextMaintenance,
  recentOrders,
} from "../lib/dashboard-data.ts";
import { demoOrders } from "../app/don-hang/_lib/orders.ts";
import {
  demoDispatchTasks,
  demoDriverOptions,
  demoVehicleOptions,
  simulateAssignment,
} from "../app/dieu-phoi/_lib/dispatch.ts";
import { fleetSummary, vehicles } from "../app/doi-xe/_lib/fleet.ts";
import { drivers } from "../app/tai-xe/_lib/drivers.ts";
import { maintenanceSchedule, workOrders } from "../app/bao-duong/_lib/maintenance.ts";
import { snapshots } from "../app/bao-cao/_lib/reports.ts";

const root = process.cwd();
const read = (path) => readFile(join(root, path), "utf8");

test("dashboard order cards derive from the canonical synthetic order fixtures", () => {
  const canonicalIds = new Set(demoOrders.map((order) => order.id));

  assert.equal(recentOrders.length, 3);
  assert.equal(new Set(recentOrders.map((order) => order.id)).size, recentOrders.length);
  assert.ok(recentOrders.every((order) => canonicalIds.has(order.id)));
  assert.ok(recentOrders.every((order) => order.href === getOrderDetailsHref(order.id)));
  assert.ok(recentOrders.every((order) => !/Nguyễn|Trần Quốc/u.test(`${order.title} ${order.assignee}`)));
});

test("dashboard order mapper preserves the canonical id and encodes its deep link", () => {
  const fixture = demoOrders[0];
  const mapped = buildDashboardOrder(fixture);

  assert.equal(mapped.id, fixture.id);
  assert.equal(mapped.href, `/don-hang?id=${encodeURIComponent(fixture.id)}`);
  assert.equal(mapped.assignee, fixture.assigneeAlias);
  assert.match(mapped.title, new RegExp(fixture.origin));
  assert.equal(createOrderHref, "/don-hang?new=1");
});

test("order workspace consumes deep-link id and create intents below Suspense", async () => {
  const [page, workspace] = await Promise.all([
    read("app/don-hang/page.tsx"),
    read("app/don-hang/_components/OrderWorkspace.tsx"),
  ]);

  assert.match(page, /<Suspense[\s\S]*<OrderWorkspace \/>[\s\S]*<\/Suspense>/);
  assert.match(workspace, /useSearchParams\(\)/);
  assert.match(workspace, /searchParams\.get\("id"\)/);
  assert.match(workspace, /searchParams\.get\("new"\) === "1"/);
  assert.match(workspace, /dialog\.showModal\(\)/);
});

test("dispatch assignments reference canonical fleet and driver resources", () => {
  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const driverIds = new Set(drivers.map((driver) => driver.id));

  for (const task of demoDispatchTasks) {
    if (task.vehicleId) assert.ok(vehicleIds.has(task.vehicleId), `${task.id} has an unknown vehicle`);
    if (task.driverId) assert.ok(driverIds.has(task.driverId), `${task.id} has an unknown driver`);
  }

  assert.ok(demoVehicleOptions.every((option) => vehicleIds.has(option.id)));
  assert.ok(demoDriverOptions.every((option) => driverIds.has(option.id)));
});

test("dispatch simulation persists resource ids and rejects unknown aliases", () => {
  const targetId = "DP-HH-122";
  const vehicle = demoVehicleOptions[0];
  const driver = demoDriverOptions[0];
  const assigned = simulateAssignment(demoDispatchTasks, targetId, vehicle.label, driver.label);
  const updated = assigned.tasks.find((task) => task.id === targetId);

  assert.equal(assigned.hasConflict, false);
  assert.equal(updated?.vehicleId, vehicle.id);
  assert.equal(updated?.driverId, driver.id);

  const rejected = simulateAssignment(demoDispatchTasks, targetId, "Xe không tồn tại", driver.label);
  assert.equal(rejected.hasConflict, true);
  assert.equal(rejected.tasks, demoDispatchTasks);
});

test("dashboard KPIs and maintenance preview derive from canonical fixtures", () => {
  assert.equal(dashboardFleetSummary, fleetSummary);
  assert.equal(dashboardMetrics[0].value, `${fleetSummary.ready}/${fleetSummary.total}`);
  assert.equal(dashboardMetrics[1].value, String(demoDispatchTasks.filter((task) => task.date === demoDispatchTasks[0].date && task.status === "Đang chạy").length));
  assert.equal(dashboardMetrics[3].value, snapshots["7 ngày"].onTime);

  const groupedFleetTotal = fleetReadiness.reduce((sum, group) => sum + Number(group.uptime.split("/")[1]), 0);
  assert.equal(groupedFleetTotal, vehicles.length);

  assert.ok(workOrders.some((order) => order.id === nextMaintenance.id));
  assert.ok(maintenanceSchedule.some((item) => item.title.includes(nextMaintenance.id)));
});
