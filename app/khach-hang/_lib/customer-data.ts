export const CUSTOMER_TYPES = ["Cá nhân mô phỏng", "Doanh nghiệp mô phỏng"] as const;
export const CUSTOMER_SEGMENTS = ["Chiến lược", "Thường xuyên", "Tiềm năng", "Mới"] as const;
export const CUSTOMER_RISKS = ["Thấp", "Theo dõi", "Cao"] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];
export type CustomerRisk = (typeof CUSTOMER_RISKS)[number];

export type CustomerOrder = {
  id: string;
  date: string;
  service: string;
  route: string;
  value: number;
  status: "Hoàn tất" | "Đang phục vụ" | "Đã hủy";
};

export type CustomerRecord = {
  id: string;
  displayName: string;
  type: CustomerType;
  segment: CustomerSegment;
  risk: CustomerRisk;
  satisfaction: number;
  orderCount: number;
  demoValue: number;
  lastInteraction: string;
  owner: string;
  servicePreference: string;
  tags: string[];
  note: string;
  orders: CustomerOrder[];
};

export const customerRecords: CustomerRecord[] = [
  { id: "KH-DEMO-0001", displayName: "Doanh nghiệp Mô Phỏng 01", type: "Doanh nghiệp mô phỏng", segment: "Chiến lược", risk: "Thấp", satisfaction: 4.8, orderCount: 18, demoValue: 284000000, lastInteraction: "21/08/2026 · Review dịch vụ", owner: "Nhóm Chăm sóc A", servicePreference: "Hợp đồng xe theo đoàn", tags: ["Hợp đồng", "Đúng hạn", "Review quý"], note: "Hồ sơ synthetic có tần suất sử dụng ổn định và phản hồi tích cực.", orders: [{ id: "ĐH-DEMO-1842", date: "18/08/2026", service: "Thuê xe đoàn", route: "Thành Phố A → Hội nghị C", value: 16800000, status: "Hoàn tất" }, { id: "ĐH-DEMO-1764", date: "02/08/2026", service: "Thuê xe đoàn", route: "Thành Phố A → Sinh thái B", value: 14400000, status: "Hoàn tất" }, { id: "ĐH-DEMO-1699", date: "16/07/2026", service: "Điều phối sự kiện", route: "Nội vùng demo", value: 21800000, status: "Hoàn tất" }] },
  { id: "KH-DEMO-0002", displayName: "Khách Cá Nhân Mẫu 02", type: "Cá nhân mô phỏng", segment: "Thường xuyên", risk: "Thấp", satisfaction: 4.6, orderCount: 11, demoValue: 4650000, lastInteraction: "20/08/2026 · Phản hồi chuyến", owner: "Nhóm CSKH Vé", servicePreference: "Vé hành khách linh hoạt", tags: ["Vé tuyến", "Khung giờ sáng"], note: "Hồ sơ mẫu ưu tiên chuyến sáng và thao tác đặt chỗ trực tuyến.", orders: [{ id: "VX-DEMO-8821", date: "20/08/2026", service: "Vé hành khách", route: "Thành Phố A → Duyên Hải B", value: 165000, status: "Hoàn tất" }, { id: "VX-DEMO-8604", date: "08/08/2026", service: "Vé hành khách", route: "Duyên Hải B → Thành Phố A", value: 145000, status: "Hoàn tất" }] },
  { id: "KH-DEMO-0003", displayName: "Doanh nghiệp Mô Phỏng 03", type: "Doanh nghiệp mô phỏng", segment: "Tiềm năng", risk: "Theo dõi", satisfaction: 3.9, orderCount: 5, demoValue: 72400000, lastInteraction: "19/08/2026 · Làm rõ báo giá", owner: "Nhóm Kinh doanh B", servicePreference: "Xe 29–45 chỗ", tags: ["Báo giá", "Theo dõi SLA"], note: "Cần làm rõ phạm vi sớm và xác nhận kỳ vọng trước khi báo giá.", orders: [{ id: "ĐH-DEMO-1731", date: "10/08/2026", service: "Thuê xe đoàn", route: "Thành Phố A → Điểm D", value: 19200000, status: "Hoàn tất" }, { id: "ĐH-DEMO-1811", date: "22/08/2026", service: "Thuê xe đoàn", route: "Nội vùng demo", value: 11800000, status: "Đang phục vụ" }] },
  { id: "KH-DEMO-0004", displayName: "Khách Cá Nhân Mẫu 04", type: "Cá nhân mô phỏng", segment: "Mới", risk: "Theo dõi", satisfaction: 4.1, orderCount: 2, demoValue: 485000, lastInteraction: "18/08/2026 · Hướng dẫn đặt chỗ", owner: "Nhóm CSKH Vé", servicePreference: "Vé hành khách tiêu chuẩn", tags: ["Khách mới", "Hỗ trợ số hóa"], note: "Cần hướng dẫn rõ chính sách đổi chuyến bằng nội dung dễ hiểu.", orders: [{ id: "VX-DEMO-8512", date: "18/08/2026", service: "Vé hành khách", route: "Thành Phố A → Duyên Hải B", value: 145000, status: "Hoàn tất" }, { id: "VX-DEMO-8490", date: "15/08/2026", service: "Vé hành khách", route: "Thành Phố A → Cao Nguyên C", value: 340000, status: "Đã hủy" }] },
  { id: "KH-DEMO-0005", displayName: "Đoàn Thể Mô Phỏng 05", type: "Doanh nghiệp mô phỏng", segment: "Thường xuyên", risk: "Thấp", satisfaction: 4.7, orderCount: 9, demoValue: 136000000, lastInteraction: "18/08/2026 · Xác nhận kế hoạch", owner: "Nhóm Chăm sóc A", servicePreference: "Đoàn 29 chỗ", tags: ["Đoàn thể", "Kế hoạch sớm"], note: "Đặt lịch sớm và có tỷ lệ thay đổi thấp trong dữ liệu mẫu.", orders: [{ id: "ĐH-DEMO-1677", date: "18/08/2026", service: "Thuê xe đoàn", route: "Bắc A → Sinh thái B", value: 7600000, status: "Hoàn tất" }, { id: "ĐH-DEMO-1598", date: "28/07/2026", service: "Thuê xe đoàn", route: "Thành Phố A → Hội nghị C", value: 9600000, status: "Hoàn tất" }] },
  { id: "KH-DEMO-0006", displayName: "Khách Cá Nhân Mẫu 06", type: "Cá nhân mô phỏng", segment: "Tiềm năng", risk: "Cao", satisfaction: 3.2, orderCount: 4, demoValue: 980000, lastInteraction: "17/08/2026 · Tiếp nhận phản hồi", owner: "Nhóm Trải nghiệm", servicePreference: "Vé tuyến đường dài", tags: ["Cần phản hồi", "Theo dõi trải nghiệm"], note: "Một phản hồi demo đang cần xác nhận nguyên nhân và đóng vòng liên hệ.", orders: [{ id: "VX-DEMO-8391", date: "17/08/2026", service: "Vé hành khách", route: "Thành Phố A → Cao Nguyên C", value: 320000, status: "Hoàn tất" }, { id: "VX-DEMO-8120", date: "29/07/2026", service: "Vé hành khách", route: "Thành Phố A → Cao Nguyên C", value: 340000, status: "Hoàn tất" }] },
  { id: "KH-DEMO-0007", displayName: "Doanh nghiệp Mô Phỏng 07", type: "Doanh nghiệp mô phỏng", segment: "Mới", risk: "Theo dõi", satisfaction: 4.0, orderCount: 1, demoValue: 11800000, lastInteraction: "16/08/2026 · Khảo sát nhu cầu", owner: "Nhóm Kinh doanh A", servicePreference: "Sự kiện nội vùng", tags: ["Onboarding", "Báo giá đầu tiên"], note: "Hồ sơ mới, cần thống nhất đầu mối và tiêu chí nghiệm thu giả lập.", orders: [{ id: "ĐH-DEMO-1551", date: "16/08/2026", service: "Điều phối sự kiện", route: "Nội vùng demo", value: 11800000, status: "Đang phục vụ" }] },
  { id: "KH-DEMO-0008", displayName: "Khách Cá Nhân Mẫu 08", type: "Cá nhân mô phỏng", segment: "Thường xuyên", risk: "Thấp", satisfaction: 4.9, orderCount: 15, demoValue: 5420000, lastInteraction: "15/08/2026 · Khảo sát hài lòng", owner: "Nhóm CSKH Vé", servicePreference: "Vé tuyến linh hoạt", tags: ["Hài lòng cao", "Đặt chỗ số"], note: "Chỉ số satisfaction cao trong dữ liệu trình diễn, không đại diện khách thật.", orders: [{ id: "VX-DEMO-8012", date: "15/08/2026", service: "Vé hành khách", route: "Duyên Hải B → Thành Phố A", value: 165000, status: "Hoàn tất" }, { id: "VX-DEMO-7802", date: "02/08/2026", service: "Vé hành khách", route: "Thành Phố A → Duyên Hải B", value: 145000, status: "Hoàn tất" }] },
];

export function formatCustomerValue(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function averageSatisfaction(records: CustomerRecord[]) {
  return records.length ? records.reduce((sum, item) => sum + item.satisfaction, 0) / records.length : 0;
}
