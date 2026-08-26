import { existsSync } from "node:fs";
import process from "node:process";
import pg from "pg";

if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL is required.");

const url = new URL(connectionString);
const loopback = ["localhost", ["127", "0", "0", "1"].join("."), "[::1]"].includes(url.hostname);
const configuredCa = process.env.SUPABASE_DB_CA?.replaceAll("\\n", "\n").trim();
const ssl = loopback
  ? undefined
  : configuredCa
    ? { ca: configuredCa, rejectUnauthorized: true }
    : url.hostname.endsWith(".pooler.supabase.com") || url.hostname.endsWith(".supabase.co")
      ? { rejectUnauthorized: false }
      : (() => { throw new Error("Remote seed requires SUPABASE_DB_CA for verified TLS."); })();

const ORGANIZATION_ID = "KSO-TRANSPORT";
const ROLE_IDS = [
  "dispatcher",
  "cargo-agent",
  "ticket-agent",
  "contract-sales",
  "maintenance-technician",
  "finance-officer",
  "operations-manager",
  "auditor",
];

const workItems = [
  {
    id: "WI-DSP-001", module: "dispatch", workKind: "standard",
    title: "Xử lý xung đột xe chuyến Bình Phước – Bình Dương",
    description: "Kiểm tra lịch quay đầu của xe 51B-276.41, chọn phương án thay thế và xác nhận lại tài xế trước giờ đóng lệnh.",
    resourceType: "dispatch_task", resourceId: "DP-CD-091", routePath: "/dieu-phoi",
    priority: "urgent", status: "in_progress", assignedRole: "dispatcher", originRole: "operations-manager",
    assignedTo: "Ca điều phối sáng", dueAt: "2026-08-26T09:30:00+07:00", completedAt: null,
    createdAt: "2026-08-26T07:10:00+07:00", updatedAt: "2026-08-26T07:35:00+07:00",
  },
  {
    id: "WI-DSP-002", module: "dispatch", workKind: "standard",
    title: "Phân xe cho lô hàng Đồng Nai – Bình Phước",
    description: "Gán xe tải còn đủ tải trọng và tài xế đúng ca cho lịch hàng hóa buổi chiều, sau đó rà soát thời gian nghỉ bắt buộc.",
    resourceType: "dispatch_task", resourceId: "DP-HH-118", routePath: "/dieu-phoi",
    priority: "high", status: "new", assignedRole: "dispatcher", originRole: "cargo-agent",
    assignedTo: null, dueAt: "2026-08-26T11:00:00+07:00", completedAt: null,
    createdAt: "2026-08-26T07:25:00+07:00", updatedAt: "2026-08-26T07:25:00+07:00",
  },
  {
    id: "WI-DSP-003", module: "dispatch", workKind: "approval",
    title: "Xác nhận đổi tài xế chuyến Biên Hòa – TP.HCM",
    description: "Đối chiếu giấy phép, số giờ làm việc trong tuần và bàn giao phương tiện trước khi gửi quản lý duyệt thay đổi.",
    resourceType: "dispatch_task", resourceId: "DP-HD-211", routePath: "/dieu-phoi",
    priority: "normal", status: "waiting_approval", assignedRole: "dispatcher", originRole: "contract-sales",
    assignedTo: "Nguyễn Minh Tuấn", dueAt: "2026-08-26T16:30:00+07:00", completedAt: null,
    createdAt: "2026-08-25T15:20:00+07:00", updatedAt: "2026-08-26T08:00:00+07:00",
  },
  {
    id: "WI-CGO-001", module: "cargo", workKind: "standard",
    title: "Xác nhận khối lượng đơn DH-260823-2408",
    description: "Đối chiếu số kiện, khối lượng cân thực tế và khung giờ lấy hàng trước khi chuyển đơn sang điều phối.",
    resourceType: "transport_order", resourceId: "DH-260823-2408", routePath: "/don-hang",
    priority: "high", status: "claimed", assignedRole: "cargo-agent", originRole: "cargo-agent",
    assignedTo: "Tổ hàng hóa Thủ Đức", dueAt: "2026-08-26T10:15:00+07:00", completedAt: null,
    createdAt: "2026-08-26T07:05:00+07:00", updatedAt: "2026-08-26T07:42:00+07:00",
  },
  {
    id: "WI-CGO-002", module: "cargo", workKind: "standard",
    title: "Bổ sung biên bản bàn giao đơn DH-260823-2411",
    description: "Liên hệ điểm nhận để bổ sung ảnh kiện hàng và xác nhận người bàn giao nhằm hoàn thiện hồ sơ vận chuyển.",
    resourceType: "transport_order", resourceId: "DH-260823-2411", routePath: "/don-hang",
    priority: "normal", status: "waiting_evidence", assignedRole: "cargo-agent", originRole: "dispatcher",
    assignedTo: "Quầy hàng hóa số 2", dueAt: "2026-08-26T14:00:00+07:00", completedAt: null,
    createdAt: "2026-08-25T16:40:00+07:00", updatedAt: "2026-08-26T08:05:00+07:00",
  },
  {
    id: "WI-CGO-003", module: "cargo", workKind: "standard",
    title: "Cập nhật kết quả lấy hàng DH-260822-2415",
    description: "Ghi nhận thời gian xe đến, số kiện đã nhận và nguyên nhân chênh lệch để bảo đảm tiến độ giao hàng trong ngày.",
    resourceType: "transport_order", resourceId: "DH-260822-2415", routePath: "/don-hang",
    priority: "normal", status: "in_progress", assignedRole: "cargo-agent", originRole: "dispatcher",
    assignedTo: "Tổ hàng hóa Bình Tân", dueAt: "2026-08-26T15:30:00+07:00", completedAt: null,
    createdAt: "2026-08-26T06:50:00+07:00", updatedAt: "2026-08-26T08:15:00+07:00",
  },
  {
    id: "WI-TKT-001", module: "passenger", workKind: "standard",
    title: "Hoàn tất danh sách khách chuyến TRP-D2301",
    description: "Rà soát thông tin hành khách, ghế đã giữ và yêu cầu hỗ trợ trước khi bàn giao danh sách cho nhân viên đón khách.",
    resourceType: "ticket_trip", resourceId: "TRP-D2301", routePath: "/ve-xe",
    priority: "high", status: "new", assignedRole: "ticket-agent", originRole: "dispatcher",
    assignedTo: null, dueAt: "2026-08-26T09:45:00+07:00", completedAt: null,
    createdAt: "2026-08-26T07:30:00+07:00", updatedAt: "2026-08-26T07:30:00+07:00",
  },
  {
    id: "WI-TKT-002", module: "passenger", workKind: "standard",
    title: "Xử lý yêu cầu đổi ghế chuyến TRP-C2301",
    description: "Kiểm tra ghế còn trống, điều kiện đổi chỗ và cập nhật lại sơ đồ ghế cho chuyến đường dài khởi hành buổi tối.",
    resourceType: "ticket_trip", resourceId: "TRP-C2301", routePath: "/ve-xe",
    priority: "normal", status: "claimed", assignedRole: "ticket-agent", originRole: "ticket-agent",
    assignedTo: "Quầy vé Miền Đông", dueAt: "2026-08-26T13:30:00+07:00", completedAt: null,
    createdAt: "2026-08-26T07:15:00+07:00", updatedAt: "2026-08-26T07:55:00+07:00",
  },
  {
    id: "WI-TKT-003", module: "passenger", workKind: "standard",
    title: "Xác minh chứng từ hoàn tiền tuyến Vũng Tàu",
    description: "Kiểm tra thông tin thanh toán, thời điểm hủy và chứng từ liên quan trước khi chuyển đề nghị hoàn tiền cho kế toán.",
    resourceType: "ticket_trip", resourceId: "TRP-A2201", routePath: "/ve-xe",
    priority: "normal", status: "waiting_evidence", assignedRole: "ticket-agent", originRole: "finance-officer",
    assignedTo: "Nhóm chăm sóc hành khách", dueAt: "2026-08-27T10:00:00+07:00", completedAt: null,
    createdAt: "2026-08-25T14:10:00+07:00", updatedAt: "2026-08-26T08:10:00+07:00",
  },
  {
    id: "WI-CTR-001", module: "contract", workKind: "standard",
    title: "Hoàn thiện khảo sát hợp đồng HĐ-26-1039",
    description: "Chốt điểm đón, lịch trình từng ngày và yêu cầu phục vụ để lập phương án xe cho đoàn Công ty An Phú.",
    resourceType: "contract_request", resourceId: "HĐ-26-1039", routePath: "/hop-dong",
    priority: "high", status: "in_progress", assignedRole: "contract-sales", originRole: "contract-sales",
    assignedTo: "Nguyễn Ngọc Anh", dueAt: "2026-08-26T17:00:00+07:00", completedAt: null,
    createdAt: "2026-08-25T09:00:00+07:00", updatedAt: "2026-08-26T08:20:00+07:00",
  },
  {
    id: "WI-CTR-002", module: "contract", workKind: "approval",
    title: "Gửi duyệt báo giá hợp đồng HĐ-26-1034",
    description: "Kiểm tra chi phí xe, phụ cấp tài xế và điều khoản thanh toán trước khi trình quản lý vận hành phê duyệt báo giá.",
    resourceType: "contract_request", resourceId: "HĐ-26-1034", routePath: "/hop-dong",
    priority: "high", status: "waiting_approval", assignedRole: "contract-sales", originRole: "contract-sales",
    assignedTo: "Nhóm Kinh doanh B", dueAt: "2026-08-26T15:00:00+07:00", completedAt: null,
    createdAt: "2026-08-25T10:30:00+07:00", updatedAt: "2026-08-26T08:25:00+07:00",
  },
  {
    id: "WI-CTR-003", module: "contract", workKind: "standard",
    title: "Xác nhận nhu cầu xe hợp đồng HĐ-26-1042",
    description: "Liên hệ đầu mối khách hàng để xác nhận số lượng khách, thời gian chờ và phương án dự phòng cho sự kiện.",
    resourceType: "contract_request", resourceId: "HĐ-26-1042", routePath: "/hop-dong",
    priority: "normal", status: "claimed", assignedRole: "contract-sales", originRole: "operations-manager",
    assignedTo: "Nhóm Kinh doanh A", dueAt: "2026-08-27T11:30:00+07:00", completedAt: null,
    createdAt: "2026-08-26T07:00:00+07:00", updatedAt: "2026-08-26T08:00:00+07:00",
  },
  {
    id: "WI-MNT-001", module: "maintenance", workKind: "standard",
    title: "Hoàn tất kiểm tra phanh lệnh BD-2608-034",
    description: "Đo áp suất hệ thống, ghi kết quả thử phanh và cập nhật các hạng mục còn lại trước khi nghiệm thu kỹ thuật.",
    resourceType: "maintenance_order", resourceId: "BD-2608-034", routePath: "/bao-duong",
    priority: "urgent", status: "in_progress", assignedRole: "maintenance-technician", originRole: "operations-manager",
    assignedTo: "Tổ Kỹ thuật Gầm máy", dueAt: "2026-08-26T10:30:00+07:00", completedAt: null,
    createdAt: "2026-08-26T06:45:00+07:00", updatedAt: "2026-08-26T08:12:00+07:00",
  },
  {
    id: "WI-MNT-002", module: "maintenance", workKind: "standard",
    title: "Bổ sung kết quả chạy thử lệnh BD-2608-036",
    description: "Ghi nhận tiếng ồn, độ rung và nhiệt độ hệ truyền động sau chạy thử không tải để hoàn thiện hồ sơ sửa chữa.",
    resourceType: "maintenance_order", resourceId: "BD-2608-036", routePath: "/bao-duong",
    priority: "high", status: "waiting_evidence", assignedRole: "maintenance-technician", originRole: "maintenance-technician",
    assignedTo: "Tổ Kỹ thuật Cơ khí", dueAt: "2026-08-26T13:00:00+07:00", completedAt: null,
    createdAt: "2026-08-25T15:00:00+07:00", updatedAt: "2026-08-26T08:18:00+07:00",
  },
  {
    id: "WI-MNT-003", module: "maintenance", workKind: "standard",
    title: "Tiếp nhận xe cho lệnh BD-2608-038",
    description: "Xác nhận số kilomet, tình trạng ngoại quan và bố trí khoang xưởng trước khi bắt đầu bảo dưỡng sau hành trình dài.",
    resourceType: "maintenance_order", resourceId: "BD-2608-038", routePath: "/bao-duong",
    priority: "high", status: "new", assignedRole: "maintenance-technician", originRole: "dispatcher",
    assignedTo: null, dueAt: "2026-08-26T14:30:00+07:00", completedAt: null,
    createdAt: "2026-08-26T07:40:00+07:00", updatedAt: "2026-08-26T07:40:00+07:00",
  },
  {
    id: "WI-FIN-001", module: "billing", workKind: "standard",
    title: "Đối soát hóa đơn INV-2608-017",
    description: "Đối chiếu đơn vận chuyển, số tiền phải thu và lịch sử liên hệ trước khi cập nhật phương án xử lý công nợ quá hạn.",
    resourceType: "invoice", resourceId: "INV-2608-017", routePath: "/tai-chinh",
    priority: "urgent", status: "claimed", assignedRole: "finance-officer", originRole: "cargo-agent",
    assignedTo: "Tổ công nợ vận tải", dueAt: "2026-08-26T10:00:00+07:00", completedAt: null,
    createdAt: "2026-08-26T07:00:00+07:00", updatedAt: "2026-08-26T07:50:00+07:00",
  },
  {
    id: "WI-FIN-002", module: "billing", workKind: "standard",
    title: "Ghi nhận thanh toán hóa đơn INV-2608-018",
    description: "Kiểm tra số tiền chuyển khoản, nội dung giao dịch và tham chiếu hợp đồng trước khi ghi nhận thanh toán.",
    resourceType: "invoice", resourceId: "INV-2608-018", routePath: "/tai-chinh",
    priority: "high", status: "new", assignedRole: "finance-officer", originRole: "contract-sales",
    assignedTo: null, dueAt: "2026-08-26T14:00:00+07:00", completedAt: null,
    createdAt: "2026-08-26T07:35:00+07:00", updatedAt: "2026-08-26T07:35:00+07:00",
  },
  {
    id: "WI-FIN-003", module: "billing", workKind: "standard",
    title: "Xác minh đề nghị hoàn tiền vé tuyến",
    description: "Kiểm tra chứng từ do phòng vé chuyển, xác định mức hoàn và lập nội dung đối soát cho kỳ thanh toán trong ngày.",
    resourceType: "invoice", resourceId: "INV-2608-015", routePath: "/tai-chinh",
    priority: "normal", status: "waiting_evidence", assignedRole: "finance-officer", originRole: "ticket-agent",
    assignedTo: "Nhóm kế toán hành khách", dueAt: "2026-08-27T09:30:00+07:00", completedAt: null,
    createdAt: "2026-08-25T16:10:00+07:00", updatedAt: "2026-08-26T08:22:00+07:00",
  },
  {
    id: "WI-MGR-001", module: "contract", workKind: "approval",
    title: "Phê duyệt báo giá hợp đồng HĐ-26-1034",
    description: "Rà soát biên lợi nhuận, năng lực đội xe và điều khoản thanh toán trước khi quyết định duyệt báo giá gửi khách hàng.",
    resourceType: "contract_request", resourceId: "HĐ-26-1034", routePath: "/hop-dong",
    priority: "high", status: "waiting_approval", assignedRole: "operations-manager", originRole: "contract-sales",
    assignedTo: "Quản lý vận hành khu vực", dueAt: "2026-08-26T15:30:00+07:00", completedAt: null,
    createdAt: "2026-08-26T08:00:00+07:00", updatedAt: "2026-08-26T08:00:00+07:00",
  },
  {
    id: "WI-MGR-002", module: "cargo", workKind: "standard",
    title: "Quyết định phương án đơn DH-260823-2422",
    description: "Đánh giá ảnh hưởng SLA, chi phí điều xe bổ sung và cam kết với khách hàng để chọn phương án xử lý ngoại lệ.",
    resourceType: "transport_order", resourceId: "DH-260823-2422", routePath: "/don-hang",
    priority: "urgent", status: "new", assignedRole: "operations-manager", originRole: "dispatcher",
    assignedTo: null, dueAt: "2026-08-26T10:45:00+07:00", completedAt: null,
    createdAt: "2026-08-26T08:05:00+07:00", updatedAt: "2026-08-26T08:05:00+07:00",
  },
  {
    id: "WI-MGR-003", module: "maintenance", workKind: "approval",
    title: "Xác nhận tiếp tục khóa xe BD-2608-034",
    description: "Kiểm tra kết quả đo phanh và khuyến nghị của tổ kỹ thuật để quyết định tiếp tục khóa xe chờ sửa chữa.",
    resourceType: "maintenance_order", resourceId: "BD-2608-034", routePath: "/bao-duong",
    priority: "high", status: "completed", assignedRole: "operations-manager", originRole: "maintenance-technician",
    assignedTo: "Trưởng ca vận hành", dueAt: "2026-08-26T08:00:00+07:00", completedAt: "2026-08-26T07:55:00+07:00",
    createdAt: "2026-08-25T17:00:00+07:00", updatedAt: "2026-08-26T07:55:00+07:00",
  },
  {
    id: "WI-AUD-001", module: "audit", workKind: "audit",
    title: "Kiểm tra hồ sơ công nợ INV-2608-017",
    description: "Đối chiếu chứng từ dịch vụ, hạn thanh toán và các lần nhắc nợ để đánh giá việc tuân thủ quy trình quản lý công nợ.",
    resourceType: "invoice", resourceId: "INV-2608-017", routePath: "/tai-chinh",
    priority: "high", status: "in_progress", assignedRole: "auditor", originRole: "finance-officer",
    assignedTo: "Tổ kiểm soát nghiệp vụ", dueAt: "2026-08-27T16:00:00+07:00", completedAt: null,
    createdAt: "2026-08-25T13:30:00+07:00", updatedAt: "2026-08-26T08:30:00+07:00",
  },
  {
    id: "WI-AUD-002", module: "audit", workKind: "audit",
    title: "Rà soát thay đổi phân công DP-HH-118",
    description: "Kiểm tra lý do thay xe, điều kiện tài xế và dấu thời gian phê duyệt để bảo đảm thay đổi được thực hiện đúng thẩm quyền.",
    resourceType: "dispatch_task", resourceId: "DP-HH-118", routePath: "/dieu-phoi",
    priority: "normal", status: "new", assignedRole: "auditor", originRole: "operations-manager",
    assignedTo: null, dueAt: "2026-08-28T11:00:00+07:00", completedAt: null,
    createdAt: "2026-08-26T08:10:00+07:00", updatedAt: "2026-08-26T08:10:00+07:00",
  },
  {
    id: "WI-AUD-003", module: "reporting", workKind: "audit",
    title: "Thu thập bằng chứng báo cáo vận hành 30 ngày",
    description: "Đối chiếu số liệu doanh thu, tỷ lệ sử dụng xe và tỷ lệ đúng giờ với dữ liệu nguồn trước khi lập kết luận kiểm tra.",
    resourceType: "report_snapshot", resourceId: "30 ngày", routePath: "/bao-cao",
    priority: "normal", status: "waiting_evidence", assignedRole: "auditor", originRole: "auditor",
    assignedTo: "Nhóm kiểm soát dữ liệu", dueAt: "2026-08-29T15:00:00+07:00", completedAt: null,
    createdAt: "2026-08-25T09:30:00+07:00", updatedAt: "2026-08-26T08:35:00+07:00",
  },
];

const initialEvents = [
  ["WI-DSP-001", "work_started", "new", "in_progress", "dispatcher", "Ca điều phối sáng", "Đã nhận việc và bắt đầu rà soát lịch xe.", "2026-08-26T07:35:00+07:00"],
  ["WI-CGO-001", "claimed", "new", "claimed", "cargo-agent", "Tổ hàng hóa Thủ Đức", "Đã tiếp nhận hồ sơ cân hàng.", "2026-08-26T07:42:00+07:00"],
  ["WI-TKT-001", "created", null, "new", "dispatcher", "Ca điều phối sáng", "Danh sách chuyến cần được hoàn tất trước giờ bàn giao.", "2026-08-26T07:30:00+07:00"],
  ["WI-CTR-001", "work_started", "claimed", "in_progress", "contract-sales", "Nguyễn Ngọc Anh", "Đã xác nhận đầu mối khảo sát với khách hàng.", "2026-08-26T08:20:00+07:00"],
  ["WI-MNT-001", "work_started", "claimed", "in_progress", "maintenance-technician", "Tổ Kỹ thuật Gầm máy", "Xe đã vào khoang và hoàn tất bước khóa an toàn.", "2026-08-26T08:12:00+07:00"],
  ["WI-FIN-001", "claimed", "new", "claimed", "finance-officer", "Tổ công nợ vận tải", "Đã nhận hồ sơ đối soát công nợ.", "2026-08-26T07:50:00+07:00"],
  ["WI-MGR-001", "submitted_for_approval", "in_progress", "waiting_approval", "contract-sales", "Nhóm Kinh doanh B", "Hồ sơ chi phí và điều khoản đã được chuyển phê duyệt.", "2026-08-26T08:00:00+07:00"],
  ["WI-AUD-001", "work_started", "claimed", "in_progress", "auditor", "Tổ kiểm soát nghiệp vụ", "Đã mở hồ sơ và lập danh sách chứng từ cần đối chiếu.", "2026-08-26T08:30:00+07:00"],
];

const initialNotifications = [
  ["dispatcher", "WI-DSP-002", "Có lệnh điều phối mới", "Lô hàng Đồng Nai – Bình Phước cần được gán xe và tài xế trước 11:00.", "2026-08-26T07:25:00+07:00"],
  ["cargo-agent", "WI-CGO-001", "Đơn hàng cần xác nhận", "Đơn DH-260823-2408 đang chờ đối chiếu khối lượng để chuyển sang điều phối.", "2026-08-26T07:05:00+07:00"],
  ["ticket-agent", "WI-TKT-001", "Danh sách chuyến sắp đến hạn", "Chuyến TRP-D2301 cần hoàn tất danh sách khách trước giờ bàn giao.", "2026-08-26T07:30:00+07:00"],
  ["contract-sales", "WI-CTR-003", "Yêu cầu hợp đồng mới", "Hợp đồng HĐ-26-1042 cần xác nhận nhu cầu xe và thời gian phục vụ.", "2026-08-26T07:00:00+07:00"],
  ["maintenance-technician", "WI-MNT-003", "Xe chờ tiếp nhận xưởng", "Xe thuộc lệnh BD-2608-038 cần được kiểm tra đầu vào và bố trí khoang.", "2026-08-26T07:40:00+07:00"],
  ["finance-officer", "WI-FIN-002", "Có giao dịch cần ghi nhận", "Hóa đơn INV-2608-018 có thông tin thanh toán mới cần được đối chiếu.", "2026-08-26T07:35:00+07:00"],
  ["operations-manager", "WI-MGR-001", "Báo giá chờ phê duyệt", "Hồ sơ HĐ-26-1034 đã đủ thông tin chi phí và đang chờ quyết định.", "2026-08-26T08:00:00+07:00"],
  ["auditor", "WI-AUD-002", "Hồ sơ phân công cần rà soát", "Thay đổi liên quan DP-HH-118 đã được đưa vào kế hoạch kiểm tra.", "2026-08-26T08:10:00+07:00"],
];

if (workItems.length !== ROLE_IDS.length * 3) {
  throw new Error("Work center seed must contain exactly three work items per role.");
}
for (const role of ROLE_IDS) {
  if (workItems.filter((item) => item.assignedRole === role).length !== 3) {
    throw new Error(`Work center seed has an invalid task count for ${role}.`);
  }
}

const pool = new pg.Pool({
  connectionString,
  ssl,
  max: 1,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 60_000,
  application_name: "ksops-work-center-seed",
});

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const organization = await client.query(
      "SELECT id FROM public.organizations WHERE id = $1",
      [ORGANIZATION_ID],
    );
    if (organization.rowCount !== 1) {
      throw new Error("Run the relational operations seed before the work center seed.");
    }

    let insertedWorkItems = 0;
    for (const item of workItems) {
      const result = await client.query(
        `INSERT INTO public.work_items
           (id, organization_id, module, work_kind, title, description, resource_type,
            resource_id, route_path, priority, status, assigned_role, origin_role,
            assigned_to, due_at, completed_at, version, created_at, updated_at)
         VALUES
           ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, 1, $17, $18)
         ON CONFLICT (id) DO NOTHING`,
        [
          item.id, ORGANIZATION_ID, item.module, item.workKind, item.title, item.description,
          item.resourceType, item.resourceId, item.routePath, item.priority, item.status,
          item.assignedRole, item.originRole, item.assignedTo, item.dueAt, item.completedAt,
          item.createdAt, item.updatedAt,
        ],
      );
      insertedWorkItems += result.rowCount ?? 0;
    }

    let insertedEvents = 0;
    for (const event of initialEvents) {
      const result = await client.query(
        `INSERT INTO public.work_item_events
           (work_item_id, action, from_status, to_status, actor_role, actor_label, note, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        event,
      );
      insertedEvents += result.rowCount ?? 0;
    }

    let insertedNotifications = 0;
    for (const notification of initialNotifications) {
      const result = await client.query(
        `INSERT INTO public.role_notifications
           (recipient_role, work_item_id, title, message, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        notification,
      );
      insertedNotifications += result.rowCount ?? 0;
    }

    await client.query("COMMIT");
    process.stdout.write(
      `work center initialized: ${insertedWorkItems} work items, ${insertedEvents} events, ${insertedNotifications} notifications added\n`,
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
