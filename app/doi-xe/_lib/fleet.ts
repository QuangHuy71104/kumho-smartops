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
  { id: "51B-317.42", name: "Ford Transit 16 chỗ", type: "Xe 16 chỗ", status: "Sẵn sàng", depot: "Bãi xe Thủ Đức", driver: "Chờ phân công", assignment: "HĐ-SG-BD-0730", nextMilestone: "Khởi hành dự kiến 10:30", odometer: 82430, serviceRemaining: 1240, readiness: 98, capacity: "16 ghế", lastInspection: "08:12 · 23/08/2026" },
  { id: "51B-329.18", name: "Ford Transit 16 chỗ", type: "Xe 16 chỗ", status: "Đang chạy", depot: "Bãi xe Thủ Đức", driver: "Trần Quốc Huy", assignment: "HĐ-BH-SG-1830", nextMilestone: "Về bãi dự kiến 12:15", odometer: 96520, serviceRemaining: 680, readiness: 94, capacity: "16 ghế", lastInspection: "06:45 · 23/08/2026" },
  { id: "51B-305.76", name: "Hyundai Solati 16 chỗ", type: "Xe 16 chỗ", status: "Bảo dưỡng", depot: "Xưởng kỹ thuật Thủ Đức", driver: "Chưa phân công", assignment: "BD-2608-031", nextMilestone: "Hoàn tất dự kiến 15:00", odometer: 112840, serviceRemaining: 0, readiness: 76, capacity: "16 ghế", lastInspection: "17:20 · 22/08/2026" },
  { id: "51B-288.64", name: "Thaco Town 29 chỗ", type: "Xe 29 chỗ", status: "Sẵn sàng", depot: "Bãi xe Bình Tân", driver: "Phạm Đức Long", assignment: "CD-TN-SG-1415", nextMilestone: "Khởi hành dự kiến 14:15", odometer: 134260, serviceRemaining: 2140, readiness: 99, capacity: "29 ghế", lastInspection: "08:05 · 23/08/2026" },
  { id: "51B-301.25", name: "Thaco Garden 29 chỗ", type: "Xe 29 chỗ", status: "Đang chạy", depot: "Bãi xe Bình Tân", driver: "Nguyễn Hoàng Phúc", assignment: "CD-CT-SG-0630", nextMilestone: "Trạm dừng Trung Lương · 09:35", odometer: 145780, serviceRemaining: 960, readiness: 96, capacity: "29 ghế", lastInspection: "05:58 · 23/08/2026" },
  { id: "51B-312.09", name: "Thaco Town 29 chỗ", type: "Xe 29 chỗ", status: "Sẵn sàng", depot: "Bãi xe Thủ Đức", driver: "Chờ phân công", assignment: "Chưa xếp chuyến", nextMilestone: "Kiểm tra ca lúc 13:30", odometer: 76480, serviceRemaining: 3560, readiness: 97, capacity: "29 ghế", lastInspection: "07:44 · 23/08/2026" },
  { id: "51B-267.83", name: "Hyundai Universe 45 chỗ", type: "Xe 45 chỗ", status: "Đang chạy", depot: "Bến xe Miền Đông Mới", driver: "Nguyễn Minh Tuấn", assignment: "CD-SG-VT-0530", nextMilestone: "Đến Bà Rịa · 07:42", odometer: 188920, serviceRemaining: 450, readiness: 92, capacity: "45 ghế", lastInspection: "04:50 · 23/08/2026" },
  { id: "51B-276.41", name: "Hyundai Universe 45 chỗ", type: "Xe 45 chỗ", status: "Sẵn sàng", depot: "Bến xe Miền Đông Mới", driver: "Võ Thành Trung", assignment: "HĐ-BH-SG-1830", nextMilestone: "Khởi hành dự kiến 18:30", odometer: 157340, serviceRemaining: 1880, readiness: 98, capacity: "45 ghế", lastInspection: "08:28 · 23/08/2026" },
  { id: "51B-254.97", name: "Thaco Bluesky 45 chỗ", type: "Xe 45 chỗ", status: "Bảo dưỡng", depot: "Xưởng kỹ thuật Thủ Đức", driver: "Chưa phân công", assignment: "BD-2608-034", nextMilestone: "Chờ nghiệm thu hệ thống phanh", odometer: 203610, serviceRemaining: -120, readiness: 68, capacity: "45 ghế", lastInspection: "16:10 · 22/08/2026" },
  { id: "51F-016.58", name: "Thaco Mobihome", type: "Xe giường nằm", status: "Sẵn sàng", depot: "Bến xe Miền Đông Mới", driver: "Đỗ Văn Khải", assignment: "CD-SG-BMT-2030", nextMilestone: "Khởi hành dự kiến 20:30", odometer: 176250, serviceRemaining: 2480, readiness: 99, capacity: "34 giường", lastInspection: "08:34 · 23/08/2026" },
  { id: "51F-022.73", name: "Hyundai Universe giường nằm", type: "Xe giường nằm", status: "Đang chạy", depot: "Bến xe Miền Đông Mới", driver: "Bùi Thanh Tâm", assignment: "CD-BMT-SG-2100", nextMilestone: "Về bến dự kiến 09:50", odometer: 219440, serviceRemaining: 720, readiness: 93, capacity: "34 giường", lastInspection: "19:25 · 22/08/2026" },
  { id: "51F-031.46", name: "Thaco Mobihome", type: "Xe giường nằm", status: "Sẵn sàng", depot: "Bãi xe Bình Tân", driver: "Chờ phân công", assignment: "Chưa xếp chuyến", nextMilestone: "Vệ sinh khoang lúc 11:15", odometer: 152860, serviceRemaining: 3140, readiness: 97, capacity: "34 giường", lastInspection: "07:55 · 23/08/2026" },
  { id: "51D-548.26", name: "Isuzu NPR thùng kín", type: "Xe hàng", status: "Đang chạy", depot: "Kho trung chuyển Sóng Thần", driver: "Trần Quốc Huy", assignment: "HH-BD-TN-0615", nextMilestone: "Giao tại Gò Dầu · 10:05", odometer: 101720, serviceRemaining: 830, readiness: 95, capacity: "Tải trọng 5 tấn", lastInspection: "06:12 · 23/08/2026" },
  { id: "51D-562.19", name: "Hino FG thùng kín", type: "Xe hàng", status: "Bảo dưỡng", depot: "Xưởng kỹ thuật Thủ Đức", driver: "Chưa phân công", assignment: "BD-2608-036", nextMilestone: "Hoàn tất dự kiến 17:30", odometer: 128560, serviceRemaining: 0, readiness: 71, capacity: "Tải trọng 8 tấn", lastInspection: "15:42 · 22/08/2026" },
  { id: "51D-571.84", name: "Isuzu NPR thùng kín", type: "Xe hàng", status: "Sẵn sàng", depot: "Kho trung chuyển Sóng Thần", driver: "Lê Hoàng Nam", assignment: "HH-DN-BP-1300", nextMilestone: "Nhận hàng dự kiến 13:00", odometer: 68940, serviceRemaining: 4220, readiness: 100, capacity: "Tải trọng 5 tấn", lastInspection: "08:20 · 23/08/2026" },
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
