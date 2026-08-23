export type WorkOrderStatus = "Quá hạn" | "Sắp đến hạn" | "Đang thực hiện" | "Đã lên lịch" | "Hoàn tất";
export type WorkOrderPriority = "Khẩn" | "Cao" | "Trung bình" | "Thấp";
export type ChecklistStore = Record<string, Record<string, boolean>>;

export const CHECKLIST_STORAGE_KEY = "ksops:transport:maintenance-checklist:v1";
export const EMPTY_CHECKLIST_STORE: ChecklistStore = {};

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type WorkOrder = {
  id: string;
  vehicle: string;
  vehicleCode: string;
  job: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  dueDate: string;
  dueOdometer: number;
  currentOdometer: number;
  dailyKm: number;
  remainingKm: number;
  technician: string;
  bay: string;
  duration: string;
  checklist: readonly ChecklistItem[];
};

export const statusOptions: readonly WorkOrderStatus[] = ["Quá hạn", "Sắp đến hạn", "Đang thực hiện", "Đã lên lịch", "Hoàn tất"];
export const priorityOptions: readonly WorkOrderPriority[] = ["Khẩn", "Cao", "Trung bình", "Thấp"];

export function decodeChecklistStore(value: unknown): ChecklistStore | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const orders = Object.entries(value);
  if (orders.length > 50) return null;

  const decoded: ChecklistStore = {};
  for (const [orderId, rawItems] of orders) {
    if (!orderId.startsWith("BD-2608-") || typeof rawItems !== "object" || rawItems === null || Array.isArray(rawItems)) {
      return null;
    }
    const items = Object.entries(rawItems);
    if (items.length > 30 || items.some(([itemId, done]) => !/^[a-z0-9-]{1,40}$/.test(itemId) || typeof done !== "boolean")) {
      return null;
    }
    decoded[orderId] = Object.fromEntries(items) as Record<string, boolean>;
  }
  return decoded;
}

const periodicChecklist: readonly ChecklistItem[] = [
  { id: "oil", label: "Kiểm tra dầu và chất lỏng", done: true },
  { id: "brake", label: "Kiểm tra hệ thống phanh", done: true },
  { id: "tyre", label: "Đo áp suất và độ mòn lốp", done: false },
  { id: "electric", label: "Kiểm tra điện và chiếu sáng", done: false },
  { id: "road-test", label: "Chạy thử và ký xác nhận", done: false },
];

export const workOrders: readonly WorkOrder[] = [
  { id: "BD-2608-031", vehicle: "Hyundai Solati 16 chỗ", vehicleCode: "51B-305.76", job: "Bảo dưỡng định kỳ", status: "Đang thực hiện", priority: "Cao", dueDate: "21/08/2026", dueOdometer: 112800, currentOdometer: 112840, dailyKm: 320, remainingKm: 0, technician: "Tổ Kỹ thuật Cơ khí", bay: "Khoang xưởng A", duration: "3 giờ 30 phút", checklist: periodicChecklist },
  { id: "BD-2608-034", vehicle: "Thaco Bluesky 45 chỗ", vehicleCode: "51B-254.97", job: "Kiểm tra phanh chuyên sâu", status: "Quá hạn", priority: "Khẩn", dueDate: "20/08/2026", dueOdometer: 203490, currentOdometer: 203610, dailyKm: 430, remainingKm: -120, technician: "Tổ Kỹ thuật Gầm máy", bay: "Khoang xưởng B", duration: "5 giờ", checklist: [{ id: "lockout", label: "Khóa an toàn khu vực làm việc", done: true }, { id: "pads", label: "Đo độ mòn má phanh", done: true }, { id: "fluid", label: "Kiểm tra dầu phanh", done: false }, { id: "pressure", label: "Thử áp suất hệ thống", done: false }, { id: "signoff", label: "Nghiệm thu kỹ thuật", done: false }] },
  { id: "BD-2608-036", vehicle: "Hino FG thùng kín", vehicleCode: "51D-562.19", job: "Bảo dưỡng hệ truyền động", status: "Đang thực hiện", priority: "Cao", dueDate: "21/08/2026", dueOdometer: 128560, currentOdometer: 128560, dailyKm: 260, remainingKm: 0, technician: "Tổ Kỹ thuật Cơ khí", bay: "Khoang xưởng C", duration: "4 giờ", checklist: [{ id: "visual", label: "Kiểm tra trực quan", done: true }, { id: "oil", label: "Kiểm tra dầu truyền động", done: false }, { id: "mount", label: "Kiểm tra gối đỡ", done: false }, { id: "test", label: "Chạy thử không tải", done: false }] },
  { id: "BD-2608-038", vehicle: "Hyundai Universe giường nằm", vehicleCode: "51F-022.73", job: "Bảo dưỡng sau hành trình dài", status: "Sắp đến hạn", priority: "Cao", dueDate: "22/08/2026", dueOdometer: 220160, currentOdometer: 219440, dailyKm: 520, remainingKm: 720, technician: "Tổ Kỹ thuật Điện lạnh", bay: "Chờ xếp khoang", duration: "4 giờ 30 phút", checklist: periodicChecklist },
  { id: "BD-2608-039", vehicle: "Ford Transit 16 chỗ", vehicleCode: "51B-329.18", job: "Thay dầu định kỳ", status: "Sắp đến hạn", priority: "Trung bình", dueDate: "23/08/2026", dueOdometer: 97200, currentOdometer: 96520, dailyKm: 280, remainingKm: 680, technician: "Tổ Kỹ thuật Gầm máy", bay: "Chờ xếp khoang", duration: "1 giờ 30 phút", checklist: periodicChecklist },
  { id: "BD-2608-040", vehicle: "Thaco Garden 29 chỗ", vehicleCode: "51B-301.25", job: "Kiểm tra điều hòa khoang", status: "Sắp đến hạn", priority: "Trung bình", dueDate: "24/08/2026", dueOdometer: 146740, currentOdometer: 145780, dailyKm: 310, remainingKm: 960, technician: "Tổ Kỹ thuật Điện lạnh", bay: "Chờ xếp khoang", duration: "2 giờ", checklist: [{ id: "temp", label: "Đo nhiệt độ đầu ra", done: false }, { id: "filter", label: "Kiểm tra lọc gió", done: false }, { id: "gas", label: "Kiểm tra áp suất môi chất", done: false }, { id: "test", label: "Chạy thử hệ thống", done: false }] },
  { id: "BD-2608-041", vehicle: "Hyundai Universe 45 chỗ", vehicleCode: "51B-267.83", job: "Kiểm tra nhanh cuối hành trình", status: "Sắp đến hạn", priority: "Cao", dueDate: "22/08/2026", dueOdometer: 189370, currentOdometer: 188920, dailyKm: 430, remainingKm: 450, technician: "Tổ Kỹ thuật Cơ khí", bay: "Chờ xe về bãi", duration: "2 giờ 30 phút", checklist: periodicChecklist },
  { id: "BD-2608-042", vehicle: "Thaco Town 29 chỗ", vehicleCode: "51B-288.64", job: "Bảo dưỡng định kỳ", status: "Đã lên lịch", priority: "Thấp", dueDate: "28/08/2026", dueOdometer: 136400, currentOdometer: 134260, dailyKm: 290, remainingKm: 2140, technician: "Tổ Kỹ thuật Gầm máy", bay: "Chưa xếp khoang", duration: "3 giờ", checklist: periodicChecklist },
  { id: "BD-2608-043", vehicle: "Isuzu NPR thùng kín", vehicleCode: "51D-548.26", job: "Kiểm tra lốp và tải", status: "Đã lên lịch", priority: "Trung bình", dueDate: "25/08/2026", dueOdometer: 102550, currentOdometer: 101720, dailyKm: 250, remainingKm: 830, technician: "Tổ Kỹ thuật Điện lạnh", bay: "Chưa xếp khoang", duration: "2 giờ", checklist: [{ id: "tyre", label: "Đo độ mòn lốp", done: false }, { id: "pressure", label: "Cân bằng áp suất", done: false }, { id: "load", label: "Kiểm tra phân bố tải", done: false }, { id: "signoff", label: "Ký xác nhận", done: false }] },
];

export function filterWorkOrders(list: readonly WorkOrder[], search: string, status: string, priority: string) {
  const keyword = search.trim().toLocaleLowerCase("vi");
  return list.filter((order) => {
    const matchesSearch = keyword.length === 0 || [order.id, order.vehicle, order.vehicleCode, order.job, order.technician]
      .some((value) => value.toLocaleLowerCase("vi").includes(keyword));
    return matchesSearch
      && (status === "Tất cả" || order.status === status)
      && (priority === "Tất cả" || order.priority === priority);
  });
}

export const maintenanceSummary = {
  open: workOrders.filter((order) => order.status !== "Hoàn tất").length,
  inProgress: workOrders.filter((order) => order.status === "Đang thực hiện").length,
  dueSoon: workOrders.filter((order) => order.status === "Sắp đến hạn").length,
  overdue: workOrders.filter((order) => order.status === "Quá hạn").length,
};

export const mileageAlerts = [...workOrders]
  .filter((order) => order.remainingKm <= order.dailyKm * 2)
  .sort((first, second) => first.remainingKm - second.remainingKm)
  .slice(0, 4);

export const maintenanceSchedule = [
  { day: "23", month: "THÁNG 8", time: "09:00", title: "Hoàn tất BD-2608-031", team: "Tổ Kỹ thuật Cơ khí" },
  { day: "23", month: "THÁNG 8", time: "13:30", title: "Đánh giá phanh BD-2608-034", team: "Tổ Kỹ thuật Gầm máy" },
  { day: "24", month: "THÁNG 8", time: "08:00", title: "Tiếp nhận xe 51F-022.73", team: "Tổ Kỹ thuật Điện lạnh" },
  { day: "25", month: "THÁNG 8", time: "10:30", title: "Thay dầu xe 51B-329.18", team: "Tổ Kỹ thuật Gầm máy" },
] as const;
