export const DISPATCH_TYPES = ["Chuyến cố định", "Xe hợp đồng", "Hàng hóa"] as const;
export const DISPATCH_SHIFTS = ["Ca sáng", "Ca chiều", "Ca tối"] as const;
export const DISPATCH_STATUSES = ["Chờ điều phối", "Sẵn sàng", "Đang chạy", "Có xung đột"] as const;
export const DISPATCH_DATES = ["2026-08-21", "2026-08-22", "2026-08-23"] as const;

export type DispatchType = (typeof DISPATCH_TYPES)[number];
export type DispatchShift = (typeof DISPATCH_SHIFTS)[number];
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];
export type DispatchDate = (typeof DISPATCH_DATES)[number];
export type RiskLevel = "Ổn định" | "Theo dõi" | "Cao";

export type DispatchTask = {
  id: string;
  date: DispatchDate;
  shift: DispatchShift;
  time: string;
  type: DispatchType;
  routeCode: string;
  origin: string;
  destination: string;
  vehicleAlias: string;
  driverAlias: string;
  capacityLabel: string;
  usedCapacity: number;
  totalCapacity: number;
  capacityUnit: "ghế" | "kg";
  status: DispatchStatus;
  risk: RiskLevel;
  warnings: string[];
  note: string;
};

export type DispatchFilters = {
  date: DispatchDate;
  type: DispatchType | "Tất cả loại hình";
  status: DispatchStatus | "Tất cả trạng thái";
  shift: DispatchShift | "Tất cả ca";
};

export const demoVehicles = [
  "Xe mẫu 01 · 29 chỗ",
  "Xe mẫu 02 · 45 chỗ",
  "Xe mẫu 03 · tải nhẹ",
  "Xe mẫu 04 · tải trung",
  "Xe mẫu 05 · hợp đồng",
] as const;

export const demoDrivers = [
  "Tài xế demo A",
  "Tài xế demo B",
  "Tài xế demo C",
  "Tài xế demo D",
  "Tài xế demo E",
] as const;

export const demoDispatchTasks: DispatchTask[] = [
  {
    id: "DP-CD-081",
    date: "2026-08-21",
    shift: "Ca sáng",
    time: "05:30–08:10",
    type: "Chuyến cố định",
    routeCode: "CD-MAU-01",
    origin: "TP. Hồ Chí Minh",
    destination: "Bà Rịa – Vũng Tàu",
    vehicleAlias: "Xe mẫu 02 · 45 chỗ",
    driverAlias: "Tài xế demo A",
    capacityLabel: "38 / 45 ghế",
    usedCapacity: 38,
    totalCapacity: 45,
    capacityUnit: "ghế",
    status: "Đang chạy",
    risk: "Ổn định",
    warnings: [],
    note: "Chuyến tuyến cố định mô phỏng, không phản ánh lịch khai thác thực tế.",
  },
  {
    id: "DP-HH-114",
    date: "2026-08-21",
    shift: "Ca sáng",
    time: "06:15–10:30",
    type: "Hàng hóa",
    routeCode: "HH-MAU-07",
    origin: "Bình Dương",
    destination: "Tây Ninh",
    vehicleAlias: "Xe mẫu 04 · tải trung",
    driverAlias: "Tài xế demo B",
    capacityLabel: "3.680 / 4.000 kg",
    usedCapacity: 3680,
    totalCapacity: 4000,
    capacityUnit: "kg",
    status: "Có xung đột",
    risk: "Cao",
    warnings: ["Tải dự kiến đạt 92%", "Thời gian quay đầu dưới ngưỡng mô phỏng"],
    note: "Cần rà soát tải và khoảng nghỉ trước khi chốt phương án.",
  },
  {
    id: "DP-HD-207",
    date: "2026-08-21",
    shift: "Ca sáng",
    time: "08:00–11:30",
    type: "Xe hợp đồng",
    routeCode: "HD-MAU-03",
    origin: "TP. Hồ Chí Minh",
    destination: "Long An",
    vehicleAlias: "Chưa gán xe",
    driverAlias: "Chưa gán tài xế",
    capacityLabel: "24 / 29 ghế dự kiến",
    usedCapacity: 24,
    totalCapacity: 29,
    capacityUnit: "ghế",
    status: "Chờ điều phối",
    risk: "Theo dõi",
    warnings: ["Chưa gán xe và tài xế"],
    note: "Yêu cầu hợp đồng chỉ là kịch bản học tập với bí danh.",
  },
  {
    id: "DP-HH-118",
    date: "2026-08-21",
    shift: "Ca chiều",
    time: "13:00–17:20",
    type: "Hàng hóa",
    routeCode: "HH-MAU-09",
    origin: "Đồng Nai",
    destination: "Bình Phước",
    vehicleAlias: "Xe mẫu 03 · tải nhẹ",
    driverAlias: "Tài xế demo C",
    capacityLabel: "1.420 / 2.000 kg",
    usedCapacity: 1420,
    totalCapacity: 2000,
    capacityUnit: "kg",
    status: "Sẵn sàng",
    risk: "Ổn định",
    warnings: [],
    note: "Lệnh hàng hóa ghép tuyến dùng số liệu tải tổng hợp.",
  },
  {
    id: "DP-CD-086",
    date: "2026-08-21",
    shift: "Ca chiều",
    time: "14:15–17:00",
    type: "Chuyến cố định",
    routeCode: "CD-MAU-04",
    origin: "Tây Ninh",
    destination: "TP. Hồ Chí Minh",
    vehicleAlias: "Xe mẫu 01 · 29 chỗ",
    driverAlias: "Tài xế demo D",
    capacityLabel: "27 / 29 ghế",
    usedCapacity: 27,
    totalCapacity: 29,
    capacityUnit: "ghế",
    status: "Sẵn sàng",
    risk: "Theo dõi",
    warnings: ["Mức lấp đầy dự kiến trên 90%"],
    note: "Theo dõi khả năng tiếp nhận khách tại điểm dừng mô phỏng.",
  },
  {
    id: "DP-HD-211",
    date: "2026-08-21",
    shift: "Ca tối",
    time: "18:30–22:00",
    type: "Xe hợp đồng",
    routeCode: "HD-MAU-06",
    origin: "Biên Hòa, Đồng Nai",
    destination: "TP. Hồ Chí Minh",
    vehicleAlias: "Xe mẫu 05 · hợp đồng",
    driverAlias: "Tài xế demo E",
    capacityLabel: "31 / 45 ghế",
    usedCapacity: 31,
    totalCapacity: 45,
    capacityUnit: "ghế",
    status: "Sẵn sàng",
    risk: "Ổn định",
    warnings: [],
    note: "Ca tối minh họa điều phối xe hợp đồng, không phải lịch khách hàng thật.",
  },
  {
    id: "DP-HH-122",
    date: "2026-08-22",
    shift: "Ca sáng",
    time: "06:00–09:45",
    type: "Hàng hóa",
    routeCode: "HH-MAU-12",
    origin: "Long An",
    destination: "Tiền Giang",
    vehicleAlias: "Chưa gán xe",
    driverAlias: "Chưa gán tài xế",
    capacityLabel: "1.760 / 2.000 kg dự kiến",
    usedCapacity: 1760,
    totalCapacity: 2000,
    capacityUnit: "kg",
    status: "Chờ điều phối",
    risk: "Theo dõi",
    warnings: ["Chưa gán nguồn lực"],
    note: "Tuyến hàng ngày kế tiếp chờ tổ lập phương án demo.",
  },
  {
    id: "DP-CD-091",
    date: "2026-08-22",
    shift: "Ca chiều",
    time: "15:00–18:15",
    type: "Chuyến cố định",
    routeCode: "CD-MAU-08",
    origin: "Bình Phước",
    destination: "Bình Dương",
    vehicleAlias: "Xe mẫu 02 · 45 chỗ",
    driverAlias: "Tài xế demo B",
    capacityLabel: "35 / 45 ghế",
    usedCapacity: 35,
    totalCapacity: 45,
    capacityUnit: "ghế",
    status: "Sẵn sàng",
    risk: "Ổn định",
    warnings: [],
    note: "Lịch tuyến mẫu cho bài toán cân bằng nguồn lực liên tỉnh.",
  },
  {
    id: "DP-HD-216",
    date: "2026-08-23",
    shift: "Ca sáng",
    time: "07:30–12:00",
    type: "Xe hợp đồng",
    routeCode: "HD-MAU-10",
    origin: "TP. Hồ Chí Minh",
    destination: "Bình Dương",
    vehicleAlias: "Chưa gán xe",
    driverAlias: "Chưa gán tài xế",
    capacityLabel: "18 / 29 ghế dự kiến",
    usedCapacity: 18,
    totalCapacity: 29,
    capacityUnit: "ghế",
    status: "Chờ điều phối",
    risk: "Theo dõi",
    warnings: ["Cần chốt nguồn lực trước ca"],
    note: "Kịch bản hợp đồng tương lai dùng hoàn toàn bí danh.",
  },
];

export function filterDispatchTasks(tasks: DispatchTask[], filters: DispatchFilters) {
  return tasks.filter((task) => (
    task.date === filters.date
    && (filters.type === "Tất cả loại hình" || task.type === filters.type)
    && (filters.status === "Tất cả trạng thái" || task.status === filters.status)
    && (filters.shift === "Tất cả ca" || task.shift === filters.shift)
  ));
}

export function getDispatchSummary(tasks: DispatchTask[], date: DispatchDate) {
  const dailyTasks = tasks.filter((task) => task.date === date);
  return {
    total: dailyTasks.length,
    ready: dailyTasks.filter((task) => task.status === "Sẵn sàng").length,
    running: dailyTasks.filter((task) => task.status === "Đang chạy").length,
    attention: dailyTasks.filter((task) => task.risk === "Cao" || task.status === "Chờ điều phối").length,
  };
}

export function getUtilization(task: DispatchTask) {
  return Math.min(100, Math.round((task.usedCapacity / task.totalCapacity) * 100));
}

export function formatDispatchDate(date: DispatchDate) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export type SimulateAssignmentResult = {
  tasks: DispatchTask[];
  hasConflict: boolean;
  message: string;
};

export function simulateAssignment(
  tasks: DispatchTask[],
  taskId: string,
  vehicleAlias: string,
  driverAlias: string,
): SimulateAssignmentResult {
  const target = tasks.find((task) => task.id === taskId);
  if (!target) return { tasks, hasConflict: true, message: "Không tìm thấy lệnh điều phối mẫu." };

  const overlapping = tasks.filter((task) => (
    task.id !== taskId
    && task.date === target.date
    && task.shift === target.shift
    && task.status !== "Chờ điều phối"
  ));
  const warnings: string[] = [];
  if (overlapping.some((task) => task.vehicleAlias === vehicleAlias)) warnings.push("Xe đã được dùng trong cùng ca mô phỏng");
  if (overlapping.some((task) => task.driverAlias === driverAlias)) warnings.push("Tài xế đã có nhiệm vụ trong cùng ca mô phỏng");
  if (getUtilization(target) >= 90) warnings.push(target.capacityUnit === "kg" ? "Tải dự kiến từ 90% trở lên" : "Mức lấp đầy dự kiến từ 90% trở lên");

  const hasConflict = warnings.some((warning) => warning.includes("đã"));
  const nextStatus: DispatchStatus = hasConflict ? "Có xung đột" : "Sẵn sàng";
  const risk: RiskLevel = hasConflict ? "Cao" : warnings.length ? "Theo dõi" : "Ổn định";
  const updated = tasks.map((task) => task.id === taskId ? {
    ...task,
    vehicleAlias,
    driverAlias,
    status: nextStatus,
    risk,
    warnings,
  } : task);

  return {
    tasks: updated,
    hasConflict,
    message: hasConflict
      ? `${taskId} đã được mô phỏng nhưng phát hiện xung đột nguồn lực.`
      : `${taskId} đã được gán xe và tài xế trong phiên mô phỏng.`,
  };
}
