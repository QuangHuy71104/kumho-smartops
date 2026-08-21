import {
  demoOrders,
  formatDateTime,
  type TransportOrder,
} from "../app/don-hang/_lib/orders.ts";
import { demoDispatchTasks } from "../app/dieu-phoi/_lib/dispatch.ts";
import { fleetSummary, vehicles, type Vehicle } from "../app/doi-xe/_lib/fleet.ts";
import { maintenanceSchedule, workOrders } from "../app/bao-duong/_lib/maintenance.ts";
import { snapshots } from "../app/bao-cao/_lib/reports.ts";

export type DashboardMetric = {
  label: string;
  value: string;
  note: string;
  tone: "brand" | "success" | "warning" | "info";
};

export type FleetReadiness = {
  name: string;
  uptime: string;
  status: string;
  score: number;
};

export type DashboardOrder = {
  id: string;
  title: string;
  service: string;
  status: string;
  assignee: string;
  deadline: string;
  href: string;
};

export const createOrderHref = "/don-hang?new=1";

export function getOrderDetailsHref(orderId: string) {
  return `/don-hang?id=${encodeURIComponent(orderId)}`;
}

export function buildDashboardOrder(order: TransportOrder): DashboardOrder {
  return {
    id: order.id,
    title: `${order.cargo} · ${order.origin} → ${order.destination}`,
    service: order.service,
    status: order.status,
    assignee: order.assigneeAlias,
    deadline: formatDateTime(order.slaDeadline),
    href: getOrderDetailsHref(order.id),
  };
}

const currentDispatchDate = demoDispatchTasks[0]?.date;
const currentDispatchTasks = demoDispatchTasks.filter((task) => task.date === currentDispatchDate);
const attentionOrders = demoOrders.filter(
  (order) => order.status === "Cần xử lý" || order.slaState !== "Trong SLA",
);
const weeklyOperationsSnapshot = snapshots["7 ngày"];

export const dashboardMetrics = [
  {
    label: "Xe sẵn sàng",
    value: `${fleetSummary.ready}/${fleetSummary.total}`,
    note: `${fleetSummary.running} đang chạy · ${fleetSummary.maintenance} bảo dưỡng`,
    tone: "success",
  },
  {
    label: "Chuyến đang chạy",
    value: String(currentDispatchTasks.filter((task) => task.status === "Đang chạy").length),
    note: `${currentDispatchTasks.filter((task) => task.status === "Sẵn sàng").length} sẵn sàng · ${currentDispatchTasks.filter((task) => task.status === "Chờ điều phối").length} chờ xếp`,
    tone: "info",
  },
  {
    label: "Đơn cần xử lý",
    value: String(attentionOrders.length).padStart(2, "0"),
    note: `${attentionOrders.filter((order) => order.slaState === "Trễ SLA").length} trễ SLA · ${attentionOrders.filter((order) => order.status === "Cần xử lý").length} ngoại lệ`,
    tone: "warning",
  },
  {
    label: "Đúng giờ 7 ngày",
    value: weeklyOperationsSnapshot.onTime,
    note: `${weeklyOperationsSnapshot.onTimeDelta} so với kỳ trước`,
    tone: "brand",
  },
] satisfies readonly DashboardMetric[];

export const recentOrders = demoOrders
  .filter((order) => order.status !== "Hoàn tất")
  .slice(0, 3)
  .map(buildDashboardOrder);

function buildFleetReadiness(
  name: string,
  matches: (vehicle: Vehicle) => boolean,
): FleetReadiness {
  const group = vehicles.filter(matches);
  const operational = group.filter((vehicle) => vehicle.status !== "Bảo dưỡng").length;
  const maintenance = group.length - operational;
  const score = group.length
    ? Math.round(group.reduce((sum, vehicle) => sum + vehicle.readiness, 0) / group.length)
    : 0;

  return {
    name,
    uptime: `${operational}/${group.length}`,
    status: maintenance ? `${maintenance} xe đang bảo dưỡng` : "Đủ điều kiện khai thác",
    score,
  };
}

export const fleetReadiness = [
  buildFleetReadiness("Xe khách ghế ngồi", (vehicle) => ["Xe 16 chỗ", "Xe 29 chỗ", "Xe 45 chỗ"].includes(vehicle.type)),
  buildFleetReadiness("Xe giường nằm", (vehicle) => vehicle.type === "Xe giường nằm"),
  buildFleetReadiness("Xe hàng hóa", (vehicle) => vehicle.type === "Xe hàng"),
] satisfies readonly FleetReadiness[];

export const dashboardFleetSummary = fleetSummary;

const maintenancePreviewOrder = workOrders.find((order) => order.id === "WO-DEMO-034") ?? workOrders[0];
const maintenancePreviewSchedule = maintenanceSchedule.find((item) => item.title.includes(maintenancePreviewOrder.id))
  ?? maintenanceSchedule[0];

export const nextMaintenance = {
  id: maintenancePreviewOrder.id,
  day: maintenancePreviewSchedule.day,
  monthLabel: maintenancePreviewSchedule.month,
  title: `${maintenancePreviewOrder.job} · ${maintenancePreviewOrder.vehicleCode}`,
  time: `${maintenancePreviewSchedule.time} · ${maintenancePreviewOrder.duration}`,
  site: maintenancePreviewOrder.bay,
  owner: maintenancePreviewSchedule.team,
};
