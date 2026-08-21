export type DriverAvailability = "Sẵn sàng" | "Đang làm việc" | "Nghỉ phép" | "Chờ xác minh";
export type DriverShift = "Ca sáng" | "Ca chiều" | "Ca đêm" | "Linh hoạt";
export type DocumentState = "Hợp lệ" | "Sắp hết hạn" | "Cần bổ sung";

export type DriverDocument = {
  label: string;
  state: DocumentState;
  note: string;
};

export type ScheduleItem = {
  time: string;
  task: string;
  note: string;
};

export type Driver = {
  id: string;
  name: string;
  availability: DriverAvailability;
  shift: DriverShift;
  shiftWindow: string;
  licenseClass: string;
  licenseExpiry: string;
  compliance: number;
  hoursThisWeek: number;
  assignment: string;
  vehicle: string;
  homeBase: string;
  documents: readonly DriverDocument[];
  schedule: readonly ScheduleItem[];
};

export const availabilityOptions: readonly DriverAvailability[] = ["Sẵn sàng", "Đang làm việc", "Nghỉ phép", "Chờ xác minh"];
export const shiftOptions: readonly DriverShift[] = ["Ca sáng", "Ca chiều", "Ca đêm", "Linh hoạt"];

const validDocuments: readonly DriverDocument[] = [
  { label: "Bằng lái demo", state: "Hợp lệ", note: "Còn hạn trên 180 ngày" },
  { label: "Giấy khám sức khỏe mẫu", state: "Hợp lệ", note: "Xác minh 02/08/2026" },
  { label: "Đào tạo an toàn demo", state: "Hợp lệ", note: "Hoàn tất mô-đun 2026" },
];

export const drivers: readonly Driver[] = [
  { id: "TX-DEMO-001", name: "Tài xế mẫu 01", availability: "Sẵn sàng", shift: "Ca sáng", shiftWindow: "05:30–13:30", licenseClass: "Hạng D · Demo", licenseExpiry: "30/11/2027", compliance: 100, hoursThisWeek: 31, assignment: "Chờ chuyến tiếp theo", vehicle: "DX-DEMO-029-01", homeBase: "Bãi xe mô phỏng A", documents: validDocuments, schedule: [{ time: "05:30", task: "Nhận ca & kiểm tra xe", note: "Đã hoàn tất" }, { time: "08:00", task: "Tuyến mẫu A–E", note: "Đã hoàn tất" }, { time: "11:00", task: "Tuyến mẫu E–A", note: "Sắp tới" }] },
  { id: "TX-DEMO-002", name: "Tài xế mẫu 02", availability: "Đang làm việc", shift: "Ca sáng", shiftWindow: "06:00–14:00", licenseClass: "Hạng D · Demo", licenseExpiry: "18/06/2027", compliance: 98, hoursThisWeek: 34, assignment: "Tuyến mẫu B–D", vehicle: "DX-DEMO-016-02", homeBase: "Bãi xe mô phỏng A", documents: validDocuments, schedule: [{ time: "06:00", task: "Nhận ca", note: "Đã hoàn tất" }, { time: "07:15", task: "Tuyến mẫu B–D", note: "Đang thực hiện" }, { time: "12:15", task: "Bàn giao xe", note: "Sắp tới" }] },
  { id: "TX-DEMO-003", name: "Tài xế mẫu 03", availability: "Sẵn sàng", shift: "Ca chiều", shiftWindow: "12:30–20:30", licenseClass: "Hạng D · Demo", licenseExpiry: "04/03/2027", compliance: 96, hoursThisWeek: 25, assignment: "Dự phòng điều phối", vehicle: "Chưa gán xe", homeBase: "Bãi xe mô phỏng B", documents: [{ label: "Bằng lái demo", state: "Hợp lệ", note: "Còn hạn trên 180 ngày" }, { label: "Giấy khám sức khỏe mẫu", state: "Sắp hết hạn", note: "Cần cập nhật trong 32 ngày" }, { label: "Đào tạo an toàn demo", state: "Hợp lệ", note: "Hoàn tất mô-đun 2026" }], schedule: [{ time: "12:30", task: "Nhận ca", note: "Sắp tới" }, { time: "13:00", task: "Dự phòng điều phối", note: "Đã lên lịch" }, { time: "18:30", task: "Kiểm tra cuối ca", note: "Đã lên lịch" }] },
  { id: "TX-DEMO-004", name: "Tài xế mẫu 04", availability: "Đang làm việc", shift: "Ca chiều", shiftWindow: "13:00–21:00", licenseClass: "Hạng E · Demo", licenseExpiry: "22/09/2028", compliance: 100, hoursThisWeek: 29, assignment: "Tuyến mẫu B–G", vehicle: "DX-DEMO-045-02", homeBase: "Bãi xe mô phỏng C", documents: validDocuments, schedule: [{ time: "13:00", task: "Nhận ca & briefing", note: "Sắp tới" }, { time: "16:00", task: "Tuyến mẫu B–G", note: "Đã lên lịch" }, { time: "20:45", task: "Kết ca", note: "Đã lên lịch" }] },
  { id: "TX-DEMO-005", name: "Tài xế mẫu 05", availability: "Sẵn sàng", shift: "Ca đêm", shiftWindow: "19:30–03:30", licenseClass: "Hạng E · Demo", licenseExpiry: "15/08/2027", compliance: 99, hoursThisWeek: 22, assignment: "Tuyến đêm mẫu A–H", vehicle: "DX-DEMO-GN-01", homeBase: "Bãi xe mô phỏng C", documents: validDocuments, schedule: [{ time: "19:30", task: "Nhận ca đêm", note: "Đã lên lịch" }, { time: "20:30", task: "Tuyến đêm mẫu A–H", note: "Đã lên lịch" }, { time: "03:10", task: "Bàn giao ca", note: "Đã lên lịch" }] },
  { id: "TX-DEMO-006", name: "Tài xế mẫu 06", availability: "Đang làm việc", shift: "Ca đêm", shiftWindow: "20:00–04:00", licenseClass: "Hạng E · Demo", licenseExpiry: "07/12/2027", compliance: 97, hoursThisWeek: 36, assignment: "Tuyến đêm mẫu D–H", vehicle: "DX-DEMO-GN-02", homeBase: "Bãi xe mô phỏng C", documents: validDocuments, schedule: [{ time: "20:00", task: "Nhận ca đêm", note: "Đã hoàn tất" }, { time: "21:00", task: "Tuyến đêm mẫu D–H", note: "Đang thực hiện" }, { time: "09:50", task: "Về bãi mô phỏng", note: "Dự kiến" }] },
  { id: "TX-DEMO-007", name: "Tài xế mẫu 07", availability: "Nghỉ phép", shift: "Linh hoạt", shiftWindow: "Theo điều phối", licenseClass: "Hạng D · Demo", licenseExpiry: "29/01/2028", compliance: 100, hoursThisWeek: 16, assignment: "Nghỉ phép mẫu đến 23/08", vehicle: "Chưa gán xe", homeBase: "Bãi xe mô phỏng A", documents: validDocuments, schedule: [{ time: "Cả ngày", task: "Nghỉ phép mẫu", note: "Đã duyệt" }] },
  { id: "TX-DEMO-008", name: "Tài xế mẫu 08", availability: "Chờ xác minh", shift: "Ca sáng", shiftWindow: "05:30–13:30", licenseClass: "Hạng D · Demo", licenseExpiry: "12/10/2026", compliance: 78, hoursThisWeek: 18, assignment: "Tạm khóa phân công", vehicle: "Chưa gán xe", homeBase: "Bãi xe mô phỏng B", documents: [{ label: "Bằng lái demo", state: "Sắp hết hạn", note: "Còn 52 ngày" }, { label: "Giấy khám sức khỏe mẫu", state: "Cần bổ sung", note: "Chưa có bản xác minh demo" }, { label: "Đào tạo an toàn demo", state: "Hợp lệ", note: "Hoàn tất mô-đun 2026" }], schedule: [{ time: "09:00", task: "Bổ sung hồ sơ demo", note: "Cần hành động" }, { time: "14:00", task: "Đánh giá tuân thủ", note: "Đã lên lịch" }] },
  { id: "TX-DEMO-009", name: "Tài xế mẫu 09", availability: "Sẵn sàng", shift: "Linh hoạt", shiftWindow: "Theo điều phối", licenseClass: "Hạng C · Demo", licenseExpiry: "26/05/2028", compliance: 100, hoursThisWeek: 27, assignment: "Lệnh hàng mẫu GH-024", vehicle: "DX-DEMO-HH-03", homeBase: "Kho trung chuyển demo", documents: validDocuments, schedule: [{ time: "08:00", task: "Kiểm tra lệnh hàng", note: "Đã hoàn tất" }, { time: "13:00", task: "Nhận hàng mẫu", note: "Sắp tới" }, { time: "17:30", task: "Đóng lệnh mẫu", note: "Đã lên lịch" }] },
  { id: "TX-DEMO-010", name: "Tài xế mẫu 10", availability: "Đang làm việc", shift: "Linh hoạt", shiftWindow: "07:00–17:00", licenseClass: "Hạng C · Demo", licenseExpiry: "09/07/2027", compliance: 97, hoursThisWeek: 33, assignment: "Lệnh hàng mẫu GH-018", vehicle: "DX-DEMO-HH-01", homeBase: "Kho trung chuyển demo", documents: validDocuments, schedule: [{ time: "07:00", task: "Nhận xe hàng mẫu", note: "Đã hoàn tất" }, { time: "08:15", task: "Giao điểm mẫu K", note: "Đang thực hiện" }, { time: "15:45", task: "Về kho demo", note: "Dự kiến" }] },
  { id: "TX-DEMO-011", name: "Tài xế mẫu 11", availability: "Sẵn sàng", shift: "Ca chiều", shiftWindow: "12:00–20:00", licenseClass: "Hạng D · Demo", licenseExpiry: "16/02/2028", compliance: 95, hoursThisWeek: 21, assignment: "Chờ chuyến tiếp theo", vehicle: "DX-DEMO-029-03", homeBase: "Bãi xe mô phỏng A", documents: [{ label: "Bằng lái demo", state: "Hợp lệ", note: "Còn hạn trên 180 ngày" }, { label: "Giấy khám sức khỏe mẫu", state: "Hợp lệ", note: "Xác minh 09/08/2026" }, { label: "Đào tạo an toàn demo", state: "Sắp hết hạn", note: "Ôn tập trước 30/09" }], schedule: [{ time: "12:00", task: "Nhận ca", note: "Sắp tới" }, { time: "14:30", task: "Chuyến tăng cường mẫu", note: "Chờ điều phối" }, { time: "19:30", task: "Kết ca", note: "Đã lên lịch" }] },
  { id: "TX-DEMO-012", name: "Tài xế mẫu 12", availability: "Chờ xác minh", shift: "Ca đêm", shiftWindow: "19:00–03:00", licenseClass: "Hạng E · Demo", licenseExpiry: "02/11/2026", compliance: 82, hoursThisWeek: 19, assignment: "Chờ tái xác minh hồ sơ", vehicle: "Chưa gán xe", homeBase: "Bãi xe mô phỏng C", documents: [{ label: "Bằng lái demo", state: "Sắp hết hạn", note: "Còn 73 ngày" }, { label: "Giấy khám sức khỏe mẫu", state: "Hợp lệ", note: "Xác minh 01/08/2026" }, { label: "Đào tạo an toàn demo", state: "Cần bổ sung", note: "Thiếu bài kiểm tra cuối" }], schedule: [{ time: "10:00", task: "Hoàn thiện đào tạo demo", note: "Cần hành động" }, { time: "16:00", task: "Tái xác minh", note: "Đã lên lịch" }] },
];

export function filterDrivers(list: readonly Driver[], search: string, availability: string, shift: string) {
  const keyword = search.trim().toLocaleLowerCase("vi");
  return list.filter((driver) => {
    const matchesSearch = keyword.length === 0 || [driver.id, driver.name, driver.assignment, driver.vehicle, driver.homeBase]
      .some((value) => value.toLocaleLowerCase("vi").includes(keyword));
    return matchesSearch
      && (availability === "Tất cả" || driver.availability === availability)
      && (shift === "Tất cả" || driver.shift === shift);
  });
}

export const driverSummary = {
  total: drivers.length,
  ready: drivers.filter((driver) => driver.availability === "Sẵn sàng").length,
  working: drivers.filter((driver) => driver.availability === "Đang làm việc").length,
  review: drivers.filter((driver) => driver.availability === "Chờ xác minh").length,
  compliance: Math.round(drivers.reduce((sum, driver) => sum + driver.compliance, 0) / drivers.length),
};

export const shiftSummary = shiftOptions.map((shift) => ({
  shift,
  count: drivers.filter((driver) => driver.shift === shift).length,
  ready: drivers.filter((driver) => driver.shift === shift && driver.availability === "Sẵn sàng").length,
}));
