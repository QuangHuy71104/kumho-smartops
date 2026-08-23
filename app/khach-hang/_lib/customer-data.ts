export const CUSTOMER_TYPES = ["Cá nhân", "Doanh nghiệp"] as const;
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
  lifetimeValue: number;
  lastInteraction: string;
  owner: string;
  servicePreference: string;
  tags: string[];
  note: string;
  orders: CustomerOrder[];
};

export const customerRecords: CustomerRecord[] = [
  { id: "KH-0001", displayName: "Công ty TNHH Minh Long", type: "Doanh nghiệp", segment: "Chiến lược", risk: "Thấp", satisfaction: 4.8, orderCount: 18, lifetimeValue: 284000000, lastInteraction: "21/08/2026 · Review dịch vụ", owner: "Nhóm Chăm sóc A", servicePreference: "Hợp đồng xe theo đoàn", tags: ["Hợp đồng", "Đúng hạn", "Review quý"], note: "Khách hàng chiến lược có tần suất sử dụng ổn định và phản hồi tích cực.", orders: [{ id: "HĐ-26-1842", date: "18/08/2026", service: "Thuê xe đoàn", route: "TP.HCM → GEM Center", value: 16800000, status: "Hoàn tất" }, { id: "HĐ-26-1764", date: "02/08/2026", service: "Thuê xe đoàn", route: "TP.HCM → Hồ Tràm", value: 14400000, status: "Hoàn tất" }, { id: "HĐ-26-1699", date: "16/07/2026", service: "Điều phối sự kiện", route: "Nội thành TP.HCM", value: 21800000, status: "Hoàn tất" }] },
  { id: "KH-0002", displayName: "Nguyễn Thanh Hà", type: "Cá nhân", segment: "Thường xuyên", risk: "Thấp", satisfaction: 4.6, orderCount: 11, lifetimeValue: 4650000, lastInteraction: "20/08/2026 · Phản hồi chuyến", owner: "Nhóm CSKH Vé", servicePreference: "Vé hành khách linh hoạt", tags: ["Vé tuyến", "Khung giờ sáng"], note: "Khách hàng ưu tiên chuyến sáng và thường đặt chỗ trực tuyến.", orders: [{ id: "BK-2608-8821", date: "20/08/2026", service: "Vé hành khách", route: "TP.HCM → Vũng Tàu", value: 165000, status: "Hoàn tất" }, { id: "BK-2608-8604", date: "08/08/2026", service: "Vé hành khách", route: "Vũng Tàu → TP.HCM", value: 145000, status: "Hoàn tất" }] },
  { id: "KH-0003", displayName: "Công ty CP An Phú Logistics", type: "Doanh nghiệp", segment: "Tiềm năng", risk: "Theo dõi", satisfaction: 3.9, orderCount: 5, lifetimeValue: 72400000, lastInteraction: "19/08/2026 · Làm rõ báo giá", owner: "Nhóm Kinh doanh B", servicePreference: "Xe 29–45 chỗ", tags: ["Báo giá", "Theo dõi SLA"], note: "Cần làm rõ phạm vi sớm và xác nhận kỳ vọng trước khi báo giá.", orders: [{ id: "HĐ-26-1731", date: "10/08/2026", service: "Thuê xe đoàn", route: "TP.HCM → Đại Nam", value: 19200000, status: "Hoàn tất" }, { id: "HĐ-26-1811", date: "22/08/2026", service: "Thuê xe đoàn", route: "Nội thành TP.HCM", value: 11800000, status: "Đang phục vụ" }] },
  { id: "KH-0004", displayName: "Trần Hoàng Minh", type: "Cá nhân", segment: "Mới", risk: "Theo dõi", satisfaction: 4.1, orderCount: 2, lifetimeValue: 485000, lastInteraction: "18/08/2026 · Hướng dẫn đặt chỗ", owner: "Nhóm CSKH Vé", servicePreference: "Vé hành khách tiêu chuẩn", tags: ["Khách mới", "Hỗ trợ số hóa"], note: "Cần hướng dẫn rõ chính sách đổi chuyến bằng nội dung dễ hiểu.", orders: [{ id: "BK-2608-8512", date: "18/08/2026", service: "Vé hành khách", route: "TP.HCM → Vũng Tàu", value: 145000, status: "Hoàn tất" }, { id: "BK-2608-8490", date: "15/08/2026", service: "Vé hành khách", route: "TP.HCM → Buôn Ma Thuột", value: 340000, status: "Đã hủy" }] },
  { id: "KH-0005", displayName: "Công đoàn Công ty Đông Nam", type: "Doanh nghiệp", segment: "Thường xuyên", risk: "Thấp", satisfaction: 4.7, orderCount: 9, lifetimeValue: 136000000, lastInteraction: "18/08/2026 · Xác nhận kế hoạch", owner: "Nhóm Chăm sóc A", servicePreference: "Đoàn 29 chỗ", tags: ["Đoàn thể", "Kế hoạch sớm"], note: "Đặt lịch sớm và có tỷ lệ thay đổi hành trình thấp.", orders: [{ id: "HĐ-26-1677", date: "18/08/2026", service: "Thuê xe đoàn", route: "Bình Dương → Hồ Tràm", value: 7600000, status: "Hoàn tất" }, { id: "HĐ-26-1598", date: "28/07/2026", service: "Thuê xe đoàn", route: "TP.HCM → GEM Center", value: 9600000, status: "Hoàn tất" }] },
  { id: "KH-0006", displayName: "Lê Ngọc Hân", type: "Cá nhân", segment: "Tiềm năng", risk: "Cao", satisfaction: 3.2, orderCount: 4, lifetimeValue: 980000, lastInteraction: "17/08/2026 · Tiếp nhận phản hồi", owner: "Nhóm Trải nghiệm", servicePreference: "Vé tuyến đường dài", tags: ["Cần phản hồi", "Theo dõi trải nghiệm"], note: "Một phản hồi về thời gian đón đang cần xác nhận nguyên nhân và đóng vòng liên hệ.", orders: [{ id: "BK-2608-8391", date: "17/08/2026", service: "Vé hành khách", route: "TP.HCM → Buôn Ma Thuột", value: 320000, status: "Hoàn tất" }, { id: "BK-2608-8120", date: "29/07/2026", service: "Vé hành khách", route: "TP.HCM → Buôn Ma Thuột", value: 340000, status: "Hoàn tất" }] },
  { id: "KH-0007", displayName: "Công ty Nội thất Sông Xanh", type: "Doanh nghiệp", segment: "Mới", risk: "Theo dõi", satisfaction: 4.0, orderCount: 1, lifetimeValue: 11800000, lastInteraction: "16/08/2026 · Khảo sát nhu cầu", owner: "Nhóm Kinh doanh A", servicePreference: "Sự kiện nội vùng", tags: ["Onboarding", "Báo giá đầu tiên"], note: "Hồ sơ mới, cần thống nhất đầu mối và tiêu chí nghiệm thu.", orders: [{ id: "HĐ-26-1551", date: "16/08/2026", service: "Điều phối sự kiện", route: "Nội thành TP.HCM", value: 11800000, status: "Đang phục vụ" }] },
  { id: "KH-0008", displayName: "Phạm Quang Huy", type: "Cá nhân", segment: "Thường xuyên", risk: "Thấp", satisfaction: 4.9, orderCount: 15, lifetimeValue: 5420000, lastInteraction: "15/08/2026 · Khảo sát hài lòng", owner: "Nhóm CSKH Vé", servicePreference: "Vé tuyến linh hoạt", tags: ["Hài lòng cao", "Đặt chỗ số"], note: "Mức độ hài lòng cao, khách hàng thường sử dụng kênh đặt chỗ trực tuyến.", orders: [{ id: "BK-2608-8012", date: "15/08/2026", service: "Vé hành khách", route: "Vũng Tàu → TP.HCM", value: 165000, status: "Hoàn tất" }, { id: "BK-2608-7802", date: "02/08/2026", service: "Vé hành khách", route: "TP.HCM → Vũng Tàu", value: 145000, status: "Hoàn tất" }] },
];

export function formatCustomerValue(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function averageSatisfaction(records: CustomerRecord[]) {
  return records.length ? records.reduce((sum, item) => sum + item.satisfaction, 0) / records.length : 0;
}
