export const DISPATCH_TYPES = ["Chuyến cố định", "Xe hợp đồng", "Hàng hóa"] as const;
export const DISPATCH_SHIFTS = ["Ca sáng", "Ca chiều", "Ca tối"] as const;
export const DISPATCH_STATUSES = ["Chờ điều phối", "Sẵn sàng", "Đang chạy", "Có xung đột"] as const;
export const DISPATCH_DATES = ["2026-08-23", "2026-08-24", "2026-08-25"] as const;

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
  vehicleId: string | null;
  driverId: string | null;
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

export const demoVehicleOptions = [
  { id: "51B-288.64", label: "51B-288.64 · 29 chỗ" },
  { id: "51B-267.83", label: "51B-267.83 · 45 chỗ" },
  { id: "51D-571.84", label: "51D-571.84 · tải 5 tấn" },
  { id: "51D-548.26", label: "51D-548.26 · tải 5 tấn" },
  { id: "51B-276.41", label: "51B-276.41 · 45 chỗ" },
] as const;

export const demoDriverOptions = [
  { id: "NVTX-0001", label: "Nguyễn Minh Tuấn" },
  { id: "NVTX-0002", label: "Trần Quốc Huy" },
  { id: "NVTX-0003", label: "Lê Hoàng Nam" },
  { id: "NVTX-0004", label: "Phạm Đức Long" },
  { id: "NVTX-0005", label: "Võ Thành Trung" },
] as const;

export const demoVehicles = demoVehicleOptions.map((vehicle) => vehicle.label);
export const demoDrivers = demoDriverOptions.map((driver) => driver.label);

function resourceIdForAlias(
  options: readonly { id: string; label: string }[],
  alias: string,
) {
  return options.find((option) => option.label === alias)?.id ?? null;
}

export const demoDispatchTasks: DispatchTask[] = [
  {
    id: "DP-CD-081",
    date: "2026-08-23",
    shift: "Ca sáng",
    time: "05:30–08:10",
    type: "Chuyến cố định",
    routeCode: "CD-SG-VT-0530",
    origin: "TP. Hồ Chí Minh",
    destination: "Bà Rịa – Vũng Tàu",
    vehicleId: "51B-267.83",
    driverId: "NVTX-0001",
    vehicleAlias: "51B-267.83 · 45 chỗ",
    driverAlias: "Nguyễn Minh Tuấn",
    capacityLabel: "38 / 45 ghế",
    usedCapacity: 38,
    totalCapacity: 45,
    capacityUnit: "ghế",
    status: "Đang chạy",
    risk: "Ổn định",
    warnings: [],
    note: "Đã rời Bến xe Miền Đông Mới lúc 05:34, lưu thông đúng kế hoạch.",
  },
  {
    id: "DP-HH-114",
    date: "2026-08-23",
    shift: "Ca sáng",
    time: "06:15–10:30",
    type: "Hàng hóa",
    routeCode: "HH-BD-TN-0615",
    origin: "Bình Dương",
    destination: "Tây Ninh",
    vehicleId: "51D-548.26",
    driverId: "NVTX-0002",
    vehicleAlias: "51D-548.26 · tải 5 tấn",
    driverAlias: "Trần Quốc Huy",
    capacityLabel: "3.680 / 4.000 kg",
    usedCapacity: 3680,
    totalCapacity: 4000,
    capacityUnit: "kg",
    status: "Có xung đột",
    risk: "Cao",
    warnings: ["Tải dự kiến đạt 92%", "Thời gian quay đầu dưới 45 phút"],
    note: "Cần rà soát tải và khoảng nghỉ trước khi chốt phương án.",
  },
  {
    id: "DP-HD-207",
    date: "2026-08-23",
    shift: "Ca sáng",
    time: "08:00–11:30",
    type: "Xe hợp đồng",
    routeCode: "HD-SG-LA-0800",
    origin: "TP. Hồ Chí Minh",
    destination: "Long An",
    vehicleId: null,
    driverId: null,
    vehicleAlias: "Chưa gán xe",
    driverAlias: "Chưa gán tài xế",
    capacityLabel: "24 / 29 ghế dự kiến",
    usedCapacity: 24,
    totalCapacity: 29,
    capacityUnit: "ghế",
    status: "Chờ điều phối",
    risk: "Theo dõi",
    warnings: ["Chưa gán xe và tài xế"],
    note: "Đoàn 24 khách, yêu cầu xe có micro và khoang hành lý trống.",
  },
  {
    id: "DP-HH-118",
    date: "2026-08-23",
    shift: "Ca chiều",
    time: "13:00–17:20",
    type: "Hàng hóa",
    routeCode: "HH-DN-BP-1300",
    origin: "Đồng Nai",
    destination: "Bình Phước",
    vehicleId: "51D-571.84",
    driverId: "NVTX-0003",
    vehicleAlias: "51D-571.84 · tải 5 tấn",
    driverAlias: "Lê Hoàng Nam",
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
    date: "2026-08-23",
    shift: "Ca chiều",
    time: "14:15–17:00",
    type: "Chuyến cố định",
    routeCode: "CD-TN-SG-1415",
    origin: "Tây Ninh",
    destination: "TP. Hồ Chí Minh",
    vehicleId: "51B-288.64",
    driverId: "NVTX-0004",
    vehicleAlias: "51B-288.64 · 29 chỗ",
    driverAlias: "Phạm Đức Long",
    capacityLabel: "27 / 29 ghế",
    usedCapacity: 27,
    totalCapacity: 29,
    capacityUnit: "ghế",
    status: "Sẵn sàng",
    risk: "Theo dõi",
    warnings: ["Mức lấp đầy dự kiến trên 90%"],
    note: "Theo dõi khả năng tiếp nhận thêm hai khách tại điểm dừng Gò Dầu.",
  },
  {
    id: "DP-HD-211",
    date: "2026-08-23",
    shift: "Ca tối",
    time: "18:30–22:00",
    type: "Xe hợp đồng",
    routeCode: "HD-BH-SG-1830",
    origin: "Biên Hòa, Đồng Nai",
    destination: "TP. Hồ Chí Minh",
    vehicleId: "51B-276.41",
    driverId: "NVTX-0005",
    vehicleAlias: "51B-276.41 · 45 chỗ",
    driverAlias: "Võ Thành Trung",
    capacityLabel: "31 / 45 ghế",
    usedCapacity: 31,
    totalCapacity: 45,
    capacityUnit: "ghế",
    status: "Sẵn sàng",
    risk: "Ổn định",
    warnings: [],
    note: "Đón đoàn tại KCN Amata, trả khách theo hai điểm tại Quận 1 và Quận 3.",
  },
  {
    id: "DP-HH-122",
    date: "2026-08-24",
    shift: "Ca sáng",
    time: "06:00–09:45",
    type: "Hàng hóa",
    routeCode: "HH-LA-TG-0600",
    origin: "Long An",
    destination: "Tiền Giang",
    vehicleId: null,
    driverId: null,
    vehicleAlias: "Chưa gán xe",
    driverAlias: "Chưa gán tài xế",
    capacityLabel: "1.760 / 2.000 kg dự kiến",
    usedCapacity: 1760,
    totalCapacity: 2000,
    capacityUnit: "kg",
    status: "Chờ điều phối",
    risk: "Theo dõi",
    warnings: ["Chưa gán nguồn lực"],
    note: "Lệnh gom hàng sáng, cần chốt xe trước 17:00 ngày hôm nay.",
  },
  {
    id: "DP-CD-091",
    date: "2026-08-24",
    shift: "Ca chiều",
    time: "15:00–18:15",
    type: "Chuyến cố định",
    routeCode: "CD-BP-BD-1500",
    origin: "Bình Phước",
    destination: "Bình Dương",
    vehicleId: "51B-267.83",
    driverId: "NVTX-0002",
    vehicleAlias: "51B-267.83 · 45 chỗ",
    driverAlias: "Trần Quốc Huy",
    capacityLabel: "35 / 45 ghế",
    usedCapacity: 35,
    totalCapacity: 45,
    capacityUnit: "ghế",
    status: "Sẵn sàng",
    risk: "Ổn định",
    warnings: [],
    note: "Xe quay đầu từ Bình Phước, đã bố trí vệ sinh nhanh tại bến Bình Dương.",
  },
  {
    id: "DP-HD-216",
    date: "2026-08-25",
    shift: "Ca sáng",
    time: "07:30–12:00",
    type: "Xe hợp đồng",
    routeCode: "HD-SG-BD-0730",
    origin: "TP. Hồ Chí Minh",
    destination: "Bình Dương",
    vehicleId: null,
    driverId: null,
    vehicleAlias: "Chưa gán xe",
    driverAlias: "Chưa gán tài xế",
    capacityLabel: "18 / 29 ghế dự kiến",
    usedCapacity: 18,
    totalCapacity: 29,
    capacityUnit: "ghế",
    status: "Chờ điều phối",
    risk: "Theo dõi",
    warnings: ["Cần chốt nguồn lực trước ca"],
    note: "Đưa đón nhóm kỹ sư đến KCN VSIP I, cần chốt nguồn lực trước ca.",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<const T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function boundedString(value: unknown, maximum = 180): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function decodeDispatchTask(value: unknown): DispatchTask | null {
  if (!isRecord(value) || !boundedString(value.id, 32) || !value.id.startsWith("DP-")) return null;
  if (!isOneOf(value.date, DISPATCH_DATES) || !isOneOf(value.shift, DISPATCH_SHIFTS)) return null;
  if (!isOneOf(value.type, DISPATCH_TYPES) || !isOneOf(value.status, DISPATCH_STATUSES)) return null;
  if (!isOneOf(value.risk, ["Ổn định", "Theo dõi", "Cao"] as const)) return null;
  if (!isOneOf(value.capacityUnit, ["ghế", "kg"] as const)) return null;
  if (!["time", "routeCode", "origin", "destination", "vehicleAlias", "driverAlias", "capacityLabel", "note"]
    .every((key) => boundedString(value[key], key === "note" ? 400 : 180))) return null;
  if (value.vehicleId !== null && !boundedString(value.vehicleId, 32)) return null;
  if (value.driverId !== null && !boundedString(value.driverId, 32)) return null;
  if (typeof value.usedCapacity !== "number" || !Number.isFinite(value.usedCapacity) || value.usedCapacity < 0) return null;
  if (typeof value.totalCapacity !== "number" || !Number.isFinite(value.totalCapacity) || value.totalCapacity <= 0) return null;
  if (value.usedCapacity > value.totalCapacity * 1.5) return null;
  if (!Array.isArray(value.warnings) || value.warnings.length > 12
    || !value.warnings.every((warning) => boundedString(warning, 220))) return null;
  return value as DispatchTask;
}

export function decodeStoredDispatchTasks(value: unknown): DispatchTask[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;
  const tasks = value.map(decodeDispatchTask);
  if (tasks.some((task) => task === null)) return null;
  const decoded = tasks as DispatchTask[];
  return new Set(decoded.map((task) => task.id)).size === decoded.length ? decoded : null;
}

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
  if (!target) return { tasks, hasConflict: true, message: "Không tìm thấy lệnh điều phối." };

  const vehicleId = resourceIdForAlias(demoVehicleOptions, vehicleAlias);
  const driverId = resourceIdForAlias(demoDriverOptions, driverAlias);
  if (!vehicleId || !driverId) {
    return {
      tasks,
      hasConflict: true,
      message: "Xe hoặc tài xế không thuộc danh mục nguồn lực hiện hành.",
    };
  }

  const overlapping = tasks.filter((task) => (
    task.id !== taskId
    && task.date === target.date
    && task.shift === target.shift
    && task.status !== "Chờ điều phối"
  ));
  const warnings: string[] = [];
  if (overlapping.some((task) => task.vehicleId === vehicleId)) warnings.push("Xe đã được dùng trong cùng ca");
  if (overlapping.some((task) => task.driverId === driverId)) warnings.push("Tài xế đã có nhiệm vụ trong cùng ca");
  if (getUtilization(target) >= 90) warnings.push(target.capacityUnit === "kg" ? "Tải dự kiến từ 90% trở lên" : "Mức lấp đầy dự kiến từ 90% trở lên");

  const hasConflict = warnings.some((warning) => warning.includes("đã"));
  const nextStatus: DispatchStatus = hasConflict ? "Có xung đột" : "Sẵn sàng";
  const risk: RiskLevel = hasConflict ? "Cao" : warnings.length ? "Theo dõi" : "Ổn định";
  const updated = tasks.map((task) => task.id === taskId ? {
    ...task,
    vehicleId,
    driverId,
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
      ? `${taskId} đã được cập nhật nhưng phát hiện xung đột nguồn lực.`
      : `${taskId} đã được gán xe và tài xế.`,
  };
}
