export type VehicleType = "Xe 16 chỗ" | "Xe 29 chỗ" | "Xe 45 chỗ" | "Xe giường nằm" | "Xe hàng";
export type VehicleStatus = "Sẵn sàng" | "Đang chạy" | "Bảo dưỡng";

export type Vehicle = {
  id: string;
  name: string;
  type: VehicleType;
  status: VehicleStatus;
  depot: string;
  driver: string;
  assignment: string;
  nextMilestone: string;
  odometer: number;
  serviceRemaining: number;
  readiness: number;
  capacity: string;
  lastInspection: string;
};

export const vehicleTypes: readonly VehicleType[] = [
  "Xe 16 chỗ",
  "Xe 29 chỗ",
  "Xe 45 chỗ",
  "Xe giường nằm",
  "Xe hàng",
];

export const vehicleStatuses: readonly VehicleStatus[] = ["Sẵn sàng", "Đang chạy", "Bảo dưỡng"];

export const vehicles: readonly Vehicle[] = [
  { id: "DX-DEMO-016-01", name: "Xe khách mẫu 16-01", type: "Xe 16 chỗ", status: "Sẵn sàng", depot: "Bãi xe mô phỏng A", driver: "Chờ phân công", assignment: "Tuyến mẫu A–C", nextMilestone: "Khởi hành dự kiến 10:30", odometer: 82430, serviceRemaining: 1240, readiness: 98, capacity: "16 ghế", lastInspection: "08:12 · 21/08/2026" },
  { id: "DX-DEMO-016-02", name: "Xe khách mẫu 16-02", type: "Xe 16 chỗ", status: "Đang chạy", depot: "Bãi xe mô phỏng A", driver: "Tài xế mẫu 03", assignment: "Tuyến mẫu B–D", nextMilestone: "Về bãi dự kiến 12:15", odometer: 96520, serviceRemaining: 680, readiness: 94, capacity: "16 ghế", lastInspection: "06:45 · 21/08/2026" },
  { id: "DX-DEMO-016-03", name: "Xe khách mẫu 16-03", type: "Xe 16 chỗ", status: "Bảo dưỡng", depot: "Xưởng kỹ thuật demo", driver: "Chưa phân công", assignment: "WO-DEMO-031", nextMilestone: "Hoàn tất dự kiến 15:00", odometer: 112840, serviceRemaining: 0, readiness: 76, capacity: "16 ghế", lastInspection: "17:20 · 20/08/2026" },
  { id: "DX-DEMO-029-01", name: "Xe tuyến mẫu 29-01", type: "Xe 29 chỗ", status: "Sẵn sàng", depot: "Bãi xe mô phỏng B", driver: "Tài xế mẫu 08", assignment: "Tuyến mẫu A–E", nextMilestone: "Khởi hành dự kiến 11:00", odometer: 134260, serviceRemaining: 2140, readiness: 99, capacity: "29 ghế", lastInspection: "08:05 · 21/08/2026" },
  { id: "DX-DEMO-029-02", name: "Xe tuyến mẫu 29-02", type: "Xe 29 chỗ", status: "Đang chạy", depot: "Bãi xe mô phỏng B", driver: "Tài xế mẫu 11", assignment: "Tuyến mẫu C–F", nextMilestone: "Điểm dừng mẫu 03 · 09:35", odometer: 145780, serviceRemaining: 960, readiness: 96, capacity: "29 ghế", lastInspection: "05:58 · 21/08/2026" },
  { id: "DX-DEMO-029-03", name: "Xe tuyến mẫu 29-03", type: "Xe 29 chỗ", status: "Sẵn sàng", depot: "Bãi xe mô phỏng A", driver: "Chờ phân công", assignment: "Chưa xếp chuyến", nextMilestone: "Kiểm tra ca lúc 13:30", odometer: 76480, serviceRemaining: 3560, readiness: 97, capacity: "29 ghế", lastInspection: "07:44 · 21/08/2026" },
  { id: "DX-DEMO-045-01", name: "Xe đường dài mẫu 45-01", type: "Xe 45 chỗ", status: "Đang chạy", depot: "Bãi xe mô phỏng C", driver: "Tài xế mẫu 15", assignment: "Tuyến mẫu A–G", nextMilestone: "Đến điểm mẫu G · 14:20", odometer: 188920, serviceRemaining: 450, readiness: 92, capacity: "45 ghế", lastInspection: "04:50 · 21/08/2026" },
  { id: "DX-DEMO-045-02", name: "Xe đường dài mẫu 45-02", type: "Xe 45 chỗ", status: "Sẵn sàng", depot: "Bãi xe mô phỏng C", driver: "Tài xế mẫu 18", assignment: "Tuyến mẫu B–G", nextMilestone: "Khởi hành dự kiến 16:00", odometer: 157340, serviceRemaining: 1880, readiness: 98, capacity: "45 ghế", lastInspection: "08:28 · 21/08/2026" },
  { id: "DX-DEMO-045-03", name: "Xe đường dài mẫu 45-03", type: "Xe 45 chỗ", status: "Bảo dưỡng", depot: "Xưởng kỹ thuật demo", driver: "Chưa phân công", assignment: "WO-DEMO-034", nextMilestone: "Chờ kiểm tra phanh mẫu", odometer: 203610, serviceRemaining: -120, readiness: 68, capacity: "45 ghế", lastInspection: "16:10 · 20/08/2026" },
  { id: "DX-DEMO-GN-01", name: "Xe giường nằm mẫu 01", type: "Xe giường nằm", status: "Sẵn sàng", depot: "Bãi xe mô phỏng C", driver: "Tài xế mẫu 20", assignment: "Tuyến đêm mẫu A–H", nextMilestone: "Khởi hành dự kiến 20:30", odometer: 176250, serviceRemaining: 2480, readiness: 99, capacity: "34 giường", lastInspection: "08:34 · 21/08/2026" },
  { id: "DX-DEMO-GN-02", name: "Xe giường nằm mẫu 02", type: "Xe giường nằm", status: "Đang chạy", depot: "Bãi xe mô phỏng C", driver: "Tài xế mẫu 22", assignment: "Tuyến đêm mẫu D–H", nextMilestone: "Về bãi dự kiến 09:50", odometer: 219440, serviceRemaining: 720, readiness: 93, capacity: "34 giường", lastInspection: "19:25 · 20/08/2026" },
  { id: "DX-DEMO-GN-03", name: "Xe giường nằm mẫu 03", type: "Xe giường nằm", status: "Sẵn sàng", depot: "Bãi xe mô phỏng B", driver: "Chờ phân công", assignment: "Chưa xếp chuyến", nextMilestone: "Vệ sinh khoang lúc 11:15", odometer: 152860, serviceRemaining: 3140, readiness: 97, capacity: "34 giường", lastInspection: "07:55 · 21/08/2026" },
  { id: "DX-DEMO-HH-01", name: "Xe hàng mẫu 01", type: "Xe hàng", status: "Đang chạy", depot: "Kho trung chuyển demo", driver: "Tài xế mẫu 26", assignment: "Lệnh hàng mẫu GH-018", nextMilestone: "Giao điểm mẫu K · 10:05", odometer: 101720, serviceRemaining: 830, readiness: 95, capacity: "Tải trọng mẫu 5 tấn", lastInspection: "06:12 · 21/08/2026" },
  { id: "DX-DEMO-HH-02", name: "Xe hàng mẫu 02", type: "Xe hàng", status: "Bảo dưỡng", depot: "Xưởng kỹ thuật demo", driver: "Chưa phân công", assignment: "WO-DEMO-036", nextMilestone: "Hoàn tất dự kiến 17:30", odometer: 128560, serviceRemaining: 0, readiness: 71, capacity: "Tải trọng mẫu 8 tấn", lastInspection: "15:42 · 20/08/2026" },
  { id: "DX-DEMO-HH-03", name: "Xe hàng mẫu 03", type: "Xe hàng", status: "Sẵn sàng", depot: "Kho trung chuyển demo", driver: "Tài xế mẫu 29", assignment: "Lệnh hàng mẫu GH-024", nextMilestone: "Nhận hàng dự kiến 13:00", odometer: 68940, serviceRemaining: 4220, readiness: 100, capacity: "Tải trọng mẫu 5 tấn", lastInspection: "08:20 · 21/08/2026" },
];

export function filterVehicles(list: readonly Vehicle[], search: string, type: string, status: string) {
  const keyword = search.trim().toLocaleLowerCase("vi");
  return list.filter((vehicle) => {
    const matchesSearch = keyword.length === 0 || [vehicle.id, vehicle.name, vehicle.driver, vehicle.depot, vehicle.assignment]
      .some((value) => value.toLocaleLowerCase("vi").includes(keyword));
    return matchesSearch
      && (type === "Tất cả" || vehicle.type === type)
      && (status === "Tất cả" || vehicle.status === status);
  });
}

export const fleetSummary = {
  total: vehicles.length,
  ready: vehicles.filter((vehicle) => vehicle.status === "Sẵn sàng").length,
  running: vehicles.filter((vehicle) => vehicle.status === "Đang chạy").length,
  maintenance: vehicles.filter((vehicle) => vehicle.status === "Bảo dưỡng").length,
  averageReadiness: Math.round(vehicles.reduce((sum, vehicle) => sum + vehicle.readiness, 0) / vehicles.length),
};
