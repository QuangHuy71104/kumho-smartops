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

export const dashboardMetrics = [
  { label: "Xe sẵn sàng", value: "39/48", note: "81,3% năng lực đội xe", tone: "success" },
  { label: "Chuyến đang chạy", value: "18", note: "6 tuyến cố định · 12 hợp đồng", tone: "info" },
  { label: "Đơn cần điều phối", value: "07", note: "2 đơn ưu tiên trong 60 phút", tone: "warning" },
  { label: "Đúng giờ hôm nay", value: "94,8%", note: "+2,1% so với tuần trước", tone: "brand" },
] satisfies readonly DashboardMetric[];

export const recentOrders = [
  { id: "ORD-DEMO-1042", title: "Giao kiện hàng tuyến TP.HCM → BMT", service: "Hàng hóa", status: "Đang giao", assignee: "Nguyễn Minh", eta: "17:40" },
  { id: "CTR-DEMO-0188", title: "Đưa đón nhân viên ca tối", service: "Xe hợp đồng", status: "Chờ xuất bến", assignee: "Trần Quốc", eta: "18:15" },
  { id: "ORD-DEMO-1039", title: "Nhận hàng tận nơi — Quận 7", service: "Last-mile", status: "Cần điều phối", assignee: "Chưa phân công", eta: "19:00" },
] as const;

export const fleetReadiness = [
  { name: "Xe tuyến cố định", uptime: "16/18", status: "Sẵn sàng", score: 89 },
  { name: "Xe hợp đồng", uptime: "13/16", status: "Đang khai thác", score: 81 },
  { name: "Xe hàng hóa", uptime: "10/14", status: "Cần bổ sung", score: 71 },
  { name: "Tài xế khả dụng", uptime: "42/47", status: "Đủ ca", score: 89 },
] satisfies readonly FleetReadiness[];

export const nextMaintenance = {
  id: "MNT-DEMO-084",
  day: "22",
  monthLabel: "THÁNG 8",
  title: "Bảo dưỡng định kỳ xe 45 chỗ · KS-45-018",
  time: "08:00 – 11:30",
  site: "Xưởng kỹ thuật demo",
  owner: "Tổ bảo dưỡng A",
};
