export type ReportPeriod = "7 ngày" | "30 ngày" | "Quý 3";

export type ReportSnapshot = {
  revenue: string;
  utilization: string;
  onTime: string;
  satisfaction: string;
  revenueDelta: string;
  utilizationDelta: string;
  onTimeDelta: string;
  satisfactionDelta: string;
  trend: readonly number[];
};

export const snapshots: Record<ReportPeriod, ReportSnapshot> = {
  "7 ngày": { revenue: "684 triệu", utilization: "81,3%", onTime: "94,8%", satisfaction: "4,72/5", revenueDelta: "+6,2%", utilizationDelta: "+3,1 điểm", onTimeDelta: "+2,1 điểm", satisfactionDelta: "+0,08" , trend: [54, 68, 46, 82, 74, 91, 78] },
  "30 ngày": { revenue: "2,84 tỷ", utilization: "78,9%", onTime: "93,6%", satisfaction: "4,66/5", revenueDelta: "+8,6%", utilizationDelta: "+1,8 điểm", onTimeDelta: "+1,2 điểm", satisfactionDelta: "+0,05", trend: [52, 61, 58, 66, 72, 69, 76, 81, 78, 86] },
  "Quý 3": { revenue: "7,92 tỷ", utilization: "76,4%", onTime: "92,8%", satisfaction: "4,61/5", revenueDelta: "+11,4%", utilizationDelta: "+2,6 điểm", onTimeDelta: "+0,9 điểm", satisfactionDelta: "+0,11", trend: [48, 54, 57, 62, 60, 69, 73, 75, 79, 84, 88, 91] },
};

export const servicePerformance = [
  { service: "Tuyến cố định", orders: "1.284 vé", revenue: "1,18 tỷ", onTime: "95,6%", contribution: 42 },
  { service: "Xe hợp đồng", orders: "86 hợp đồng", revenue: "968 triệu", onTime: "94,1%", contribution: 34 },
  { service: "Vận chuyển hàng", orders: "412 đơn", revenue: "692 triệu", onTime: "92,7%", contribution: 24 },
] as const;

export const routePerformance = [
  { route: "TP.HCM → Buôn Ma Thuột", load: 88, score: "Tốt", note: "6 chuyến/ngày · đúng giờ 96,2%" },
  { route: "TP.HCM → Bình Dương", load: 76, score: "Ổn định", note: "Xe hợp đồng · lấp đầy 76%" },
  { route: "TP.HCM → Đồng Nai", load: 69, score: "Cần tối ưu", note: "Đơn hàng chiều về còn thấp" },
] as const;

export function protectCsvCell(value: string | number) {
  const normalized = String(value);
  const safe = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function buildReportCsv(period: ReportPeriod) {
  const rows = [
    ["Kỳ báo cáo", period],
    ["Dịch vụ", "Sản lượng", "Doanh thu", "Đúng giờ", "Tỷ trọng (%)"],
    ...servicePerformance.map((item) => [item.service, item.orders, item.revenue, item.onTime, item.contribution]),
  ];
  return `\uFEFF${rows.map((row) => row.map(protectCsvCell).join(",")).join("\r\n")}`;
}
