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
  { label: "Giấy phép lái xe", state: "Hợp lệ", note: "Còn hạn trên 180 ngày" },
  { label: "Giấy khám sức khỏe", state: "Hợp lệ", note: "Xác minh 02/08/2026" },
  { label: "Chứng nhận an toàn", state: "Hợp lệ", note: "Hoàn tất mô-đun 2026" },
];

export const drivers: readonly Driver[] = [
  { id: "NVTX-0001", name: "Nguyễn Minh Tuấn", availability: "Sẵn sàng", shift: "Ca sáng", shiftWindow: "05:30–13:30", licenseClass: "Hạng D", licenseExpiry: "30/11/2027", compliance: 100, hoursThisWeek: 31, assignment: "Chờ chuyến tiếp theo", vehicle: "51B-288.64", homeBase: "Bãi xe Thủ Đức", documents: validDocuments, schedule: [{ time: "05:30", task: "Nhận ca & kiểm tra xe", note: "Đã hoàn tất" }, { time: "08:00", task: "Tuyến TP.HCM – Vũng Tàu", note: "Đã hoàn tất" }, { time: "11:00", task: "Tuyến Vũng Tàu – TP.HCM", note: "Sắp tới" }] },
  { id: "NVTX-0002", name: "Trần Quốc Huy", availability: "Đang làm việc", shift: "Ca sáng", shiftWindow: "06:00–14:00", licenseClass: "Hạng D", licenseExpiry: "18/06/2027", compliance: 98, hoursThisWeek: 34, assignment: "Tuyến Biên Hòa – TP.HCM", vehicle: "51B-329.18", homeBase: "Bãi xe Thủ Đức", documents: validDocuments, schedule: [{ time: "06:00", task: "Nhận ca", note: "Đã hoàn tất" }, { time: "07:15", task: "Tuyến Biên Hòa – TP.HCM", note: "Đang thực hiện" }, { time: "12:15", task: "Bàn giao xe", note: "Sắp tới" }] },
  { id: "NVTX-0003", name: "Lê Hoàng Nam", availability: "Sẵn sàng", shift: "Ca chiều", shiftWindow: "12:30–20:30", licenseClass: "Hạng D", licenseExpiry: "04/03/2027", compliance: 96, hoursThisWeek: 25, assignment: "Dự phòng điều phối", vehicle: "Chưa gán xe", homeBase: "Bãi xe Bình Tân", documents: [{ label: "Giấy phép lái xe", state: "Hợp lệ", note: "Còn hạn trên 180 ngày" }, { label: "Giấy khám sức khỏe", state: "Sắp hết hạn", note: "Cần cập nhật trong 32 ngày" }, { label: "Chứng nhận an toàn", state: "Hợp lệ", note: "Hoàn tất mô-đun 2026" }], schedule: [{ time: "12:30", task: "Nhận ca", note: "Sắp tới" }, { time: "13:00", task: "Dự phòng điều phối", note: "Đã lên lịch" }, { time: "18:30", task: "Kiểm tra cuối ca", note: "Đã lên lịch" }] },
  { id: "NVTX-0004", name: "Phạm Đức Long", availability: "Đang làm việc", shift: "Ca chiều", shiftWindow: "13:00–21:00", licenseClass: "Hạng E", licenseExpiry: "22/09/2028", compliance: 100, hoursThisWeek: 29, assignment: "Tuyến TP.HCM – Tây Ninh", vehicle: "51B-276.41", homeBase: "Bến xe Miền Đông Mới", documents: validDocuments, schedule: [{ time: "13:00", task: "Nhận ca & briefing", note: "Sắp tới" }, { time: "16:00", task: "Tuyến TP.HCM – Tây Ninh", note: "Đã lên lịch" }, { time: "20:45", task: "Kết ca", note: "Đã lên lịch" }] },
  { id: "NVTX-0005", name: "Võ Thành Trung", availability: "Sẵn sàng", shift: "Ca đêm", shiftWindow: "19:30–03:30", licenseClass: "Hạng E", licenseExpiry: "15/08/2027", compliance: 99, hoursThisWeek: 22, assignment: "Tuyến đêm TP.HCM – Buôn Ma Thuột", vehicle: "51F-016.58", homeBase: "Bến xe Miền Đông Mới", documents: validDocuments, schedule: [{ time: "19:30", task: "Nhận ca đêm", note: "Đã lên lịch" }, { time: "20:30", task: "Tuyến đêm TP.HCM – Buôn Ma Thuột", note: "Đã lên lịch" }, { time: "03:10", task: "Bàn giao ca", note: "Đã lên lịch" }] },
  { id: "NVTX-0006", name: "Bùi Thanh Tâm", availability: "Đang làm việc", shift: "Ca đêm", shiftWindow: "20:00–04:00", licenseClass: "Hạng E", licenseExpiry: "07/12/2027", compliance: 97, hoursThisWeek: 36, assignment: "Tuyến đêm Buôn Ma Thuột – TP.HCM", vehicle: "51F-022.73", homeBase: "Bến xe Miền Đông Mới", documents: validDocuments, schedule: [{ time: "20:00", task: "Nhận ca đêm", note: "Đã hoàn tất" }, { time: "21:00", task: "Tuyến đêm Buôn Ma Thuột – TP.HCM", note: "Đang thực hiện" }, { time: "09:50", task: "Về bến", note: "Dự kiến" }] },
  { id: "NVTX-0007", name: "Đỗ Văn Khải", availability: "Nghỉ phép", shift: "Linh hoạt", shiftWindow: "Theo điều phối", licenseClass: "Hạng D", licenseExpiry: "29/01/2028", compliance: 100, hoursThisWeek: 16, assignment: "Nghỉ phép đến 23/08", vehicle: "Chưa gán xe", homeBase: "Bãi xe Thủ Đức", documents: validDocuments, schedule: [{ time: "Cả ngày", task: "Nghỉ phép", note: "Đã duyệt" }] },
  { id: "NVTX-0008", name: "Nguyễn Hoàng Phúc", availability: "Chờ xác minh", shift: "Ca sáng", shiftWindow: "05:30–13:30", licenseClass: "Hạng D", licenseExpiry: "12/10/2026", compliance: 78, hoursThisWeek: 18, assignment: "Tạm khóa phân công", vehicle: "Chưa gán xe", homeBase: "Bãi xe Bình Tân", documents: [{ label: "Giấy phép lái xe", state: "Sắp hết hạn", note: "Còn 52 ngày" }, { label: "Giấy khám sức khỏe", state: "Cần bổ sung", note: "Chưa có bản xác minh" }, { label: "Chứng nhận an toàn", state: "Hợp lệ", note: "Hoàn tất mô-đun 2026" }], schedule: [{ time: "09:00", task: "Bổ sung hồ sơ", note: "Cần hành động" }, { time: "14:00", task: "Đánh giá tuân thủ", note: "Đã lên lịch" }] },
  { id: "NVTX-0009", name: "Lâm Quang Vinh", availability: "Sẵn sàng", shift: "Linh hoạt", shiftWindow: "Theo điều phối", licenseClass: "Hạng C", licenseExpiry: "26/05/2028", compliance: 100, hoursThisWeek: 27, assignment: "Lệnh hàng HH-DN-BP-1300", vehicle: "51D-571.84", homeBase: "Kho trung chuyển Sóng Thần", documents: validDocuments, schedule: [{ time: "08:00", task: "Kiểm tra lệnh hàng", note: "Đã hoàn tất" }, { time: "13:00", task: "Nhận hàng tại kho", note: "Sắp tới" }, { time: "17:30", task: "Đóng lệnh vận chuyển", note: "Đã lên lịch" }] },
  { id: "NVTX-0010", name: "Trương Gia Bảo", availability: "Đang làm việc", shift: "Linh hoạt", shiftWindow: "07:00–17:00", licenseClass: "Hạng C", licenseExpiry: "09/07/2027", compliance: 97, hoursThisWeek: 33, assignment: "Lệnh hàng HH-BD-TN-0615", vehicle: "51D-548.26", homeBase: "Kho trung chuyển Sóng Thần", documents: validDocuments, schedule: [{ time: "07:00", task: "Nhận xe tại kho", note: "Đã hoàn tất" }, { time: "08:15", task: "Giao hàng tại Gò Dầu", note: "Đang thực hiện" }, { time: "15:45", task: "Về kho Sóng Thần", note: "Dự kiến" }] },
  { id: "NVTX-0011", name: "Hồ Minh Khang", availability: "Sẵn sàng", shift: "Ca chiều", shiftWindow: "12:00–20:00", licenseClass: "Hạng D", licenseExpiry: "16/02/2028", compliance: 95, hoursThisWeek: 21, assignment: "Chờ chuyến tiếp theo", vehicle: "51B-312.09", homeBase: "Bãi xe Thủ Đức", documents: [{ label: "Giấy phép lái xe", state: "Hợp lệ", note: "Còn hạn trên 180 ngày" }, { label: "Giấy khám sức khỏe", state: "Hợp lệ", note: "Xác minh 09/08/2026" }, { label: "Chứng nhận an toàn", state: "Sắp hết hạn", note: "Ôn tập trước 30/09" }], schedule: [{ time: "12:00", task: "Nhận ca", note: "Sắp tới" }, { time: "14:30", task: "Chuyến tăng cường", note: "Chờ điều phối" }, { time: "19:30", task: "Kết ca", note: "Đã lên lịch" }] },
  { id: "NVTX-0012", name: "Đặng Thanh Sơn", availability: "Chờ xác minh", shift: "Ca đêm", shiftWindow: "19:00–03:00", licenseClass: "Hạng E", licenseExpiry: "02/11/2026", compliance: 82, hoursThisWeek: 19, assignment: "Chờ tái xác minh hồ sơ", vehicle: "Chưa gán xe", homeBase: "Bến xe Miền Đông Mới", documents: [{ label: "Giấy phép lái xe", state: "Sắp hết hạn", note: "Còn 73 ngày" }, { label: "Giấy khám sức khỏe", state: "Hợp lệ", note: "Xác minh 01/08/2026" }, { label: "Chứng nhận an toàn", state: "Cần bổ sung", note: "Thiếu bài kiểm tra cuối" }], schedule: [{ time: "10:00", task: "Hoàn thiện đào tạo", note: "Cần hành động" }, { time: "16:00", task: "Tái xác minh", note: "Đã lên lịch" }] },
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
