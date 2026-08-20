export type IncidentPriority = "Khẩn cấp" | "Cao" | "Trung bình" | "Thấp";
export type IncidentStatus = "Mới" | "Đang xử lý" | "Chờ phản hồi" | "Đã giải quyết";

export type IncidentRecord = {
  id: string;
  title: string;
  category: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  site: string;
  assignee: string;
  createdAt: string;
  sla: string;
  summary: string;
};

export const incidentRecords: IncidentRecord[] = [
  {
    id: "INC-2048",
    title: "Mất kết nối máy in tại quầy điều hành",
    category: "Thiết bị đầu cuối",
    priority: "Cao",
    status: "Đang xử lý",
    site: "Điểm vận hành A",
    assignee: "Nhóm Hạ tầng",
    createdAt: "21/08/2026 · 08:12",
    sla: "Còn 42 phút",
    summary: "Máy in mô phỏng không nhận lệnh từ hai máy trạm tại khu vực quầy.",
  },
  {
    id: "INC-2046",
    title: "Ứng dụng nghiệp vụ phản hồi chậm",
    category: "Ứng dụng",
    priority: "Trung bình",
    status: "Đang xử lý",
    site: "Văn phòng trung tâm",
    assignee: "Nhóm Ứng dụng",
    createdAt: "21/08/2026 · 07:46",
    sla: "Còn 2 giờ 18 phút",
    summary: "Thời gian phản hồi cao hơn đường cơ sở trên dữ liệu giám sát giả lập.",
  },
  {
    id: "INC-2043",
    title: "Yêu cầu cấp quyền tài khoản nhân sự mới",
    category: "Danh tính & quyền",
    priority: "Thấp",
    status: "Chờ phản hồi",
    site: "Chi nhánh B",
    assignee: "Service Desk",
    createdAt: "20/08/2026 · 16:34",
    sla: "Còn 1 ngày",
    summary: "Yêu cầu demo đang chờ quản lý xác nhận vai trò trước khi cấp quyền.",
  },
  {
    id: "INC-2039",
    title: "Cảnh báo dung lượng kho lưu trữ tăng nhanh",
    category: "Hạ tầng",
    priority: "Cao",
    status: "Mới",
    site: "Trung tâm dữ liệu demo",
    assignee: "Chưa phân công",
    createdAt: "20/08/2026 · 14:05",
    sla: "Còn 26 phút",
    summary: "Chỉ số tổng hợp vượt ngưỡng cảnh báo demo trong ba chu kỳ liên tiếp.",
  },
  {
    id: "INC-2037",
    title: "Máy trạm cần cập nhật bản vá bảo mật",
    category: "An toàn thông tin",
    priority: "Trung bình",
    status: "Đang xử lý",
    site: "Điểm vận hành C",
    assignee: "Nhóm Endpoint",
    createdAt: "20/08/2026 · 10:28",
    sla: "Còn 5 giờ",
    summary: "Một nhóm thiết bị mẫu chưa hoàn tất đợt cập nhật được phê duyệt.",
  },
  {
    id: "INC-2032",
    title: "Kiểm tra quyền truy cập thư mục dùng chung",
    category: "Danh tính & quyền",
    priority: "Thấp",
    status: "Đã giải quyết",
    site: "Văn phòng trung tâm",
    assignee: "Service Desk",
    createdAt: "19/08/2026 · 15:50",
    sla: "Đạt SLA",
    summary: "Quyền mẫu đã được đối chiếu với ma trận RBAC và ghi nhận audit log.",
  },
];

export type MaintenanceStatus = "Sắp tới" | "Đang thực hiện" | "Hoàn tất" | "Quá hạn";

export type MaintenanceRecord = {
  id: string;
  date: string;
  time: string;
  title: string;
  type: string;
  site: string;
  owner: string;
  status: MaintenanceStatus;
  checklist: string[];
};

export const maintenanceRecords: MaintenanceRecord[] = [
  {
    id: "MNT-0824",
    date: "24/08/2026",
    time: "09:00–11:30",
    title: "Kiểm tra sao lưu và cập nhật thiết bị mạng",
    type: "Định kỳ hàng tháng",
    site: "Điểm vận hành A",
    owner: "Nhóm Hạ tầng",
    status: "Sắp tới",
    checklist: ["Xác nhận bản sao lưu gần nhất", "Kiểm tra khả năng khôi phục mẫu", "Ghi nhận phiên bản sau cập nhật"],
  },
  {
    id: "MNT-0826",
    date: "26/08/2026",
    time: "13:30–15:00",
    title: "Đối soát tài sản và tình trạng bảo hành",
    type: "Kiểm kê quý",
    site: "Chi nhánh B",
    owner: "Service Desk",
    status: "Sắp tới",
    checklist: ["Đối chiếu mã tài sản", "Cập nhật người phụ trách", "Đánh dấu thiết bị sắp hết bảo hành"],
  },
  {
    id: "MNT-0828",
    date: "28/08/2026",
    time: "22:00–23:00",
    title: "Cập nhật bản vá máy trạm theo nhóm",
    type: "Cửa sổ thay đổi",
    site: "Điểm vận hành C",
    owner: "Nhóm Endpoint",
    status: "Sắp tới",
    checklist: ["Chụp đường cơ sở", "Triển khai nhóm thử nghiệm", "Theo dõi lỗi và phương án quay lui"],
  },
  {
    id: "MNT-0819",
    date: "19/08/2026",
    time: "08:30–10:00",
    title: "Kiểm tra nguồn dự phòng và kết nối vật lý",
    type: "Định kỳ hàng tháng",
    site: "Văn phòng trung tâm",
    owner: "Nhóm Hạ tầng",
    status: "Hoàn tất",
    checklist: ["Kiểm tra nguồn", "Kiểm tra nhãn cáp", "Lưu biên bản nghiệm thu"],
  },
  {
    id: "MNT-0818",
    date: "18/08/2026",
    time: "14:00–15:30",
    title: "Rà soát tài khoản không còn sử dụng",
    type: "Kiểm soát truy cập",
    site: "Toàn hệ thống demo",
    owner: "Nhóm An toàn thông tin",
    status: "Quá hạn",
    checklist: ["Đối chiếu danh sách nhân sự", "Thu hồi quyền dư thừa", "Ghi nhận bằng chứng phê duyệt"],
  },
];

export type RunbookRecord = {
  slug: string;
  code: string;
  title: string;
  category: string;
  minutes: number;
  updatedAt: string;
  owner: string;
  description: string;
  steps: string[];
};

export const runbooks: RunbookRecord[] = [
  {
    slug: "chan-doan-mat-ket-noi",
    code: "RB-NET-01",
    title: "Chẩn đoán sự cố mất kết nối",
    category: "Mạng",
    minutes: 20,
    updatedAt: "18/08/2026",
    owner: "Nhóm Hạ tầng",
    description: "Luồng chuẩn hóa từ tiếp nhận, khoanh vùng, kiểm tra vật lý đến xác nhận khôi phục.",
    steps: ["Xác nhận người dùng và phạm vi ảnh hưởng", "Kiểm tra nguồn, cáp và trạng thái thiết bị", "Đối chiếu thay đổi gần nhất", "Kiểm tra kết nối bằng dữ liệu demo", "Khắc phục theo playbook đã duyệt", "Xác nhận dịch vụ và cập nhật nhật ký"],
  },
  {
    slug: "onboarding-tai-khoan",
    code: "RB-IAM-02",
    title: "Onboarding tài khoản theo RBAC",
    category: "Danh tính & quyền",
    minutes: 15,
    updatedAt: "16/08/2026",
    owner: "Service Desk",
    description: "Checklist cấp quyền tối thiểu, phê duyệt đúng vai trò và lưu bằng chứng audit.",
    steps: ["Xác minh yêu cầu và quản lý phê duyệt", "Chọn vai trò từ ma trận RBAC", "Cấp quyền tối thiểu", "Bật xác thực đa yếu tố", "Gửi hướng dẫn sử dụng", "Ghi nhận audit log và ngày rà soát"],
  },
  {
    slug: "restore-drill",
    code: "RB-BCP-03",
    title: "Diễn tập khôi phục bản sao lưu",
    category: "Liên tục kinh doanh",
    minutes: 45,
    updatedAt: "12/08/2026",
    owner: "Nhóm Nền tảng",
    description: "Quy trình kiểm thử bản sao lưu trong môi trường cô lập, không chứa dữ liệu thật.",
    steps: ["Chọn bản sao lưu mẫu và mục tiêu RPO/RTO", "Tạo môi trường cô lập", "Khôi phục dữ liệu mẫu", "Kiểm tra tính toàn vẹn", "Đo thời gian hoàn thành", "Lưu biên bản và hành động cải tiến"],
  },
  {
    slug: "patch-endpoint",
    code: "RB-SEC-04",
    title: "Triển khai bản vá máy trạm",
    category: "An toàn thông tin",
    minutes: 30,
    updatedAt: "10/08/2026",
    owner: "Nhóm Endpoint",
    description: "Triển khai theo vòng, có đường cơ sở, nhóm thử nghiệm và phương án quay lui.",
    steps: ["Đánh giá mức độ ưu tiên", "Xác nhận bản vá đã được phê duyệt", "Triển khai nhóm thử nghiệm", "Theo dõi chỉ số lỗi", "Mở rộng theo vòng", "Chốt bằng chứng tuân thủ"],
  },
];

export const roadmapPhases = [
  {
    weeks: "Tuần 1–2",
    name: "Khảo sát & thiết kế",
    outcome: "User story, quy trình AS-IS/TO-BE, mô hình dữ liệu, threat model và prototype được duyệt.",
    status: "Hoàn tất",
  },
  {
    weeks: "Tuần 3–5",
    name: "Nền tảng CMDB",
    outcome: "Tài sản, địa điểm, RBAC, audit log, import dữ liệu mẫu và dashboard cơ bản.",
    status: "Đang thực hiện",
  },
  {
    weeks: "Tuần 6–8",
    name: "ITSM & bảo trì",
    outcome: "Ticket, SLA, workflow, lịch bảo trì, checklist, thông báo và runbook.",
    status: "Sắp tới",
  },
  {
    weeks: "Tuần 9–10",
    name: "Quan sát & tích hợp",
    outcome: "Cảnh báo, dashboard KPI, API tích hợp, backup governance và báo cáo.",
    status: "Sắp tới",
  },
  {
    weeks: "Tuần 11–12",
    name: "UAT & chuyển giao",
    outcome: "Kiểm thử bảo mật, hiệu năng, UAT, tài liệu vận hành, đào tạo và go-live pilot.",
    status: "Sắp tới",
  },
] as const;
