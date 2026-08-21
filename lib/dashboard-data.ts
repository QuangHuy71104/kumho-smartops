import { incidentRecords, maintenanceRecords } from "./demo-data";

export type DashboardMetric = {
  label: string;
  value: string;
  note: string;
  tone: "brand" | "success" | "warning" | "info";
};

export type ServiceHealth = {
  name: string;
  uptime: string;
  status: string;
  score: number;
};

export const dashboardMetrics = [
  { label: "Tài sản được quản lý", value: "148", note: "+12 trong 30 ngày", tone: "brand" },
  { label: "Thiết bị đạt chuẩn", value: "96,8%", note: "+1,4% so với tháng trước", tone: "success" },
  { label: "Sự cố đang mở", value: "07", note: "2 yêu cầu ưu tiên cao", tone: "warning" },
  { label: "Bảo trì sắp đến hạn", value: "05", note: "Trong 7 ngày tới", tone: "info" },
] satisfies readonly DashboardMetric[];

export const recentIncidents = incidentRecords.slice(0, 3);

export const serviceHealth = [
  { name: "Mạng văn phòng", uptime: "99,98%", status: "Ổn định", score: 99 },
  { name: "Hệ thống bán vé", uptime: "99,92%", status: "Ổn định", score: 96 },
  { name: "Đồng bộ dữ liệu", uptime: "98,70%", status: "Theo dõi", score: 78 },
  { name: "Sao lưu định kỳ", uptime: "100%", status: "Hoàn tất", score: 100 },
] satisfies readonly ServiceHealth[];

const firstUpcomingMaintenance = maintenanceRecords.find((record) => record.status === "Sắp tới");

if (!firstUpcomingMaintenance) {
  throw new Error("Dashboard demo requires at least one upcoming maintenance record.");
}

const [maintenanceDay, maintenanceMonth] = firstUpcomingMaintenance.date.split("/");

export const nextMaintenance = {
  ...firstUpcomingMaintenance,
  day: maintenanceDay,
  monthLabel: `THÁNG ${Number(maintenanceMonth)}`,
};
