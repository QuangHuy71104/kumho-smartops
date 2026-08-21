export type WorkOrderStatus = "Quá hạn mẫu" | "Sắp đến hạn" | "Đang thực hiện" | "Đã lên lịch" | "Hoàn tất";
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

export const statusOptions: readonly WorkOrderStatus[] = ["Quá hạn mẫu", "Sắp đến hạn", "Đang thực hiện", "Đã lên lịch", "Hoàn tất"];
export const priorityOptions: readonly WorkOrderPriority[] = ["Khẩn", "Cao", "Trung bình", "Thấp"];

export function decodeChecklistStore(value: unknown): ChecklistStore | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const orders = Object.entries(value);
  if (orders.length > 50) return null;

  const decoded: ChecklistStore = {};
  for (const [orderId, rawItems] of orders) {
    if (!orderId.startsWith("WO-DEMO-") || typeof rawItems !== "object" || rawItems === null || Array.isArray(rawItems)) {
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
  { id: "oil", label: "Kiểm tra dầu và chất lỏng mẫu", done: true },
  { id: "brake", label: "Kiểm tra hệ thống phanh", done: true },
  { id: "tyre", label: "Đo áp suất và độ mòn lốp", done: false },
  { id: "electric", label: "Kiểm tra điện và chiếu sáng", done: false },
  { id: "road-test", label: "Chạy thử và ký xác nhận demo", done: false },
];

export const workOrders: readonly WorkOrder[] = [
  { id: "WO-DEMO-031", vehicle: "Xe khách mẫu 16-03", vehicleCode: "DX-DEMO-016-03", job: "Bảo dưỡng định kỳ mẫu", status: "Đang thực hiện", priority: "Cao", dueDate: "21/08/2026", dueOdometer: 112800, currentOdometer: 112840, dailyKm: 320, remainingKm: 0, technician: "Tổ kỹ thuật mẫu 01", bay: "Khoang xưởng demo A", duration: "3 giờ 30 phút", checklist: periodicChecklist },
  { id: "WO-DEMO-034", vehicle: "Xe đường dài mẫu 45-03", vehicleCode: "DX-DEMO-045-03", job: "Kiểm tra phanh chuyên sâu", status: "Quá hạn mẫu", priority: "Khẩn", dueDate: "20/08/2026", dueOdometer: 203490, currentOdometer: 203610, dailyKm: 430, remainingKm: -120, technician: "Tổ kỹ thuật mẫu 02", bay: "Khoang xưởng demo B", duration: "5 giờ", checklist: [{ id: "lockout", label: "Khóa an toàn khu vực làm việc", done: true }, { id: "pads", label: "Đo độ mòn má phanh mẫu", done: true }, { id: "fluid", label: "Kiểm tra dầu phanh", done: false }, { id: "pressure", label: "Thử áp suất hệ thống", done: false }, { id: "signoff", label: "Nghiệm thu kỹ thuật demo", done: false }] },
  { id: "WO-DEMO-036", vehicle: "Xe hàng mẫu 02", vehicleCode: "DX-DEMO-HH-02", job: "Bảo dưỡng hệ truyền động", status: "Đang thực hiện", priority: "Cao", dueDate: "21/08/2026", dueOdometer: 128560, currentOdometer: 128560, dailyKm: 260, remainingKm: 0, technician: "Tổ kỹ thuật mẫu 01", bay: "Khoang xưởng demo C", duration: "4 giờ", checklist: [{ id: "visual", label: "Kiểm tra trực quan", done: true }, { id: "oil", label: "Kiểm tra dầu truyền động", done: false }, { id: "mount", label: "Kiểm tra gối đỡ mẫu", done: false }, { id: "test", label: "Chạy thử không tải", done: false }] },
  { id: "WO-DEMO-038", vehicle: "Xe giường nằm mẫu 02", vehicleCode: "DX-DEMO-GN-02", job: "Bảo dưỡng sau hành trình dài", status: "Sắp đến hạn", priority: "Cao", dueDate: "22/08/2026", dueOdometer: 220160, currentOdometer: 219440, dailyKm: 520, remainingKm: 720, technician: "Tổ kỹ thuật mẫu 03", bay: "Chờ xếp khoang", duration: "4 giờ 30 phút", checklist: periodicChecklist },
  { id: "WO-DEMO-039", vehicle: "Xe khách mẫu 16-02", vehicleCode: "DX-DEMO-016-02", job: "Thay dầu định kỳ mẫu", status: "Sắp đến hạn", priority: "Trung bình", dueDate: "23/08/2026", dueOdometer: 97200, currentOdometer: 96520, dailyKm: 280, remainingKm: 680, technician: "Tổ kỹ thuật mẫu 02", bay: "Chờ xếp khoang", duration: "1 giờ 30 phút", checklist: periodicChecklist },
  { id: "WO-DEMO-040", vehicle: "Xe tuyến mẫu 29-02", vehicleCode: "DX-DEMO-029-02", job: "Kiểm tra điều hòa khoang", status: "Sắp đến hạn", priority: "Trung bình", dueDate: "24/08/2026", dueOdometer: 146740, currentOdometer: 145780, dailyKm: 310, remainingKm: 960, technician: "Tổ kỹ thuật mẫu 03", bay: "Chờ xếp khoang", duration: "2 giờ", checklist: [{ id: "temp", label: "Đo nhiệt độ đầu ra mẫu", done: false }, { id: "filter", label: "Kiểm tra lọc gió", done: false }, { id: "gas", label: "Kiểm tra áp suất môi chất", done: false }, { id: "test", label: "Chạy thử hệ thống", done: false }] },
  { id: "WO-DEMO-041", vehicle: "Xe đường dài mẫu 45-01", vehicleCode: "DX-DEMO-045-01", job: "Kiểm tra nhanh cuối hành trình", status: "Sắp đến hạn", priority: "Cao", dueDate: "22/08/2026", dueOdometer: 189370, currentOdometer: 188920, dailyKm: 430, remainingKm: 450, technician: "Tổ kỹ thuật mẫu 01", bay: "Chờ xe về bãi", duration: "2 giờ 30 phút", checklist: periodicChecklist },
  { id: "WO-DEMO-042", vehicle: "Xe tuyến mẫu 29-01", vehicleCode: "DX-DEMO-029-01", job: "Bảo dưỡng định kỳ mẫu", status: "Đã lên lịch", priority: "Thấp", dueDate: "28/08/2026", dueOdometer: 136400, currentOdometer: 134260, dailyKm: 290, remainingKm: 2140, technician: "Tổ kỹ thuật mẫu 02", bay: "Chưa xếp khoang", duration: "3 giờ", checklist: periodicChecklist },
  { id: "WO-DEMO-043", vehicle: "Xe hàng mẫu 01", vehicleCode: "DX-DEMO-HH-01", job: "Kiểm tra lốp và tải", status: "Đã lên lịch", priority: "Trung bình", dueDate: "25/08/2026", dueOdometer: 102550, currentOdometer: 101720, dailyKm: 250, remainingKm: 830, technician: "Tổ kỹ thuật mẫu 03", bay: "Chưa xếp khoang", duration: "2 giờ", checklist: [{ id: "tyre", label: "Đo độ mòn lốp", done: false }, { id: "pressure", label: "Cân bằng áp suất", done: false }, { id: "load", label: "Kiểm tra phân bố tải mẫu", done: false }, { id: "signoff", label: "Ký xác nhận demo", done: false }] },
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
  overdue: workOrders.filter((order) => order.status === "Quá hạn mẫu").length,
};

export const mileageAlerts = [...workOrders]
  .filter((order) => order.remainingKm <= order.dailyKm * 2)
  .sort((first, second) => first.remainingKm - second.remainingKm)
  .slice(0, 4);

export const maintenanceSchedule = [
  { day: "21", month: "THÁNG 8", time: "09:00", title: "Hoàn tất WO-DEMO-031", team: "Tổ kỹ thuật mẫu 01" },
  { day: "21", month: "THÁNG 8", time: "13:30", title: "Đánh giá phanh WO-DEMO-034", team: "Tổ kỹ thuật mẫu 02" },
  { day: "22", month: "THÁNG 8", time: "08:00", title: "Tiếp nhận xe giường nằm mẫu 02", team: "Tổ kỹ thuật mẫu 03" },
  { day: "23", month: "THÁNG 8", time: "10:30", title: "Thay dầu xe khách mẫu 16-02", team: "Tổ kỹ thuật mẫu 02" },
] as const;
