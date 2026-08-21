import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoOrder,
  decodeStoredOrders,
  demoOrders,
  filterOrders,
  getNextOrderStatus,
  getOrderSummary,
} from "../app/don-hang/_lib/orders.ts";

test("transport order fixtures use unique synthetic identifiers", () => {
  assert.ok(demoOrders.length >= 8);
  assert.equal(new Set(demoOrders.map((order) => order.id)).size, demoOrders.length);
  assert.ok(demoOrders.every((order) => order.id.includes("DEMO") || order.id.includes("MAU")));
  assert.ok(demoOrders.every((order) => order.source === "seed"));
  assert.ok(demoOrders.every((order) => order.customerAlias.toLocaleLowerCase("vi-VN").includes("mẫu")));
});

test("order search is accent-insensitive and composes with filters", () => {
  const filtered = filterOrders(demoOrders, {
    query: "ho chi minh",
    status: "Tất cả trạng thái",
    service: "Last-mile",
  });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((order) => order.service === "Last-mile"));
  assert.ok(filtered.every((order) => `${order.origin} ${order.destination}`.includes("Hồ Chí Minh")));
});

test("order workflow and summary partition records predictably", () => {
  assert.equal(getNextOrderStatus("Mới tiếp nhận"), "Đã xác nhận");
  assert.equal(getNextOrderStatus("Đang vận chuyển"), "Hoàn tất");
  assert.equal(getNextOrderStatus("Hoàn tất"), null);
  const summary = getOrderSummary(demoOrders);
  assert.equal(summary.total, demoOrders.length);
  assert.ok(summary.active > 0);
  assert.ok(summary.atRisk > 0);
});

test("demo order creation is deterministic for a supplied clock", () => {
  const now = new Date("2026-08-21T03:00:00.000Z");
  const order = createDemoOrder({
    customerAlias: "  Khách hàng thử nghiệm  ",
    service: "Last-mile",
    cargo: "Kiện tổng hợp",
    origin: "  Điểm A  ",
    destination: "  Điểm B  ",
    pickupWindow: "21/08 · 11:00–12:00",
    packageCount: 3,
    weightKg: 42,
    note: "",
  }, now);
  assert.equal(order.customerAlias, "Khách hàng thử nghiệm");
  assert.equal(order.origin, "Điểm A");
  assert.equal(order.status, "Mới tiếp nhận");
  assert.equal(order.source, "local-demo");
  assert.equal(new Date(order.slaDeadline).getTime() - now.getTime(), 5 * 60 * 60 * 1000);
});

test("stored order decoder enforces runtime bounds", () => {
  assert.deepEqual(decodeStoredOrders(demoOrders), demoOrders);
  assert.equal(decodeStoredOrders([{ ...demoOrders[0], packageCount: 0 }]), null);
  assert.equal(decodeStoredOrders([{ ...demoOrders[0], weightKg: Number.POSITIVE_INFINITY }]), null);
  assert.equal(decodeStoredOrders({ order: demoOrders[0] }), null);
});
