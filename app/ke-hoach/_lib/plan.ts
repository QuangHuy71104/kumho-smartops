export type RoadmapStatus = "Hoàn tất" | "Đang thực hiện" | "Sắp tới";

export type RoadmapPhase = {
  weeks: string;
  name: string;
  outcome: string;
  status: RoadmapStatus;
};

export type ArchitectureLayer = {
  code: string;
  title: string;
  text: string;
};

export type QualityGate = {
  title: string;
  description: string;
};

export type Deliverable = readonly [name: string, description: string];

export type RiskImpact = "Trung bình" | "Cao" | "Rất cao";

export type PlanRisk = {
  risk: string;
  impact: RiskImpact;
  control: string;
};

export type DeliveryCadence = {
  schedule: string;
  title: string;
  description: string;
};

export type PlanStat = {
  label: string;
  value: string;
};

export const pilotOutcomes = [
  "100% tài sản mẫu có owner",
  "≥ 92% công việc đúng hạn",
  "Giảm 20% MTTR",
] as const;

export const planStats = [
  { label: "Thời lượng", value: "12 tuần" },
  { label: "Nhân sự lõi", value: "5 vai trò" },
  { label: "Release", value: "6 mốc" },
  { label: "Go-live", value: "Pilot" },
] satisfies readonly PlanStat[];

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
] satisfies readonly RoadmapPhase[];

export const architecture = [
  { code: "UX", title: "Web app", text: "Next.js, TypeScript, thiết kế responsive, WCAG 2.2 AA." },
  { code: "API", title: "Application API", text: "REST/OpenAPI, validation, rate limit, idempotency và audit context." },
  { code: "IAM", title: "Identity", text: "SSO OIDC, MFA, RBAC, nguyên tắc quyền tối thiểu và session ngắn hạn." },
  { code: "DB", title: "Data layer", text: "PostgreSQL, migration có phiên bản, mã hóa, backup và restore drill." },
  { code: "OBS", title: "Observability", text: "Log có cấu trúc, metric, tracing, alert routing và SLO dashboard." },
] satisfies readonly ArchitectureLayer[];

export const qualityGates = [
  { title: "Code quality", description: "Review bắt buộc, lint, typecheck, unit/integration test và build đều xanh." },
  { title: "Security", description: "Không secret/PII, dependency scan đạt, RBAC và audit được kiểm thử." },
  { title: "Reliability", description: "SLO/alert rõ, backup được xác minh, rollback diễn tập thành công." },
  { title: "Product", description: "Acceptance criteria đạt, accessibility pass, UAT owner ký xác nhận." },
  { title: "Operations", description: "Runbook, dashboard, release note và on-call handover hoàn chỉnh." },
] satisfies readonly QualityGate[];

export const deliverables = [
  ["Product", "PRD, user story, acceptance criteria, prototype và quyết định phạm vi pilot."],
  ["Engineering", "Mã nguồn, API spec, schema, migration, seed data, test và CI/CD pipeline."],
  ["Security", "Threat model, RBAC matrix, secret handling, dependency scan và penetration checklist."],
  ["Operations", "Runbook, dashboard, alert, backup/restore, rollback và tài liệu xử lý sự cố."],
  ["Handover", "UAT sign-off, training, changelog, release note và kế hoạch hypercare 2 tuần."],
] satisfies readonly Deliverable[];

export const risks = [
  { risk: "Dữ liệu tài sản thiếu chuẩn", impact: "Cao", control: "Data dictionary, owner, import dry-run và báo cáo ngoại lệ." },
  { risk: "Phạm vi tích hợp tăng", impact: "Cao", control: "Pilot không tích hợp thật; mọi connector qua ADR và change control." },
  { risk: "Rò rỉ cấu hình nội bộ", impact: "Rất cao", control: "Synthetic data, secret scan, review lịch sử Git và public-data gate." },
  { risk: "Người dùng không tiếp nhận", impact: "Trung bình", control: "Discovery sớm, champion theo phòng ban, UAT theo kịch bản thực tế." },
] satisfies readonly PlanRisk[];

export const deliveryCadence = [
  { schedule: "Thứ Hai", title: "Planning & risk review", description: "Ưu tiên sprint, dependency, risk và decision log." },
  { schedule: "Hằng ngày", title: "Stand-up 15 phút", description: "Tiến độ, blocker và hành động trong 24 giờ." },
  { schedule: "Thứ Sáu", title: "Demo & retro", description: "Demo cho stakeholder, ghi feedback và cải tiến quy trình." },
  { schedule: "Mỗi release", title: "Change review", description: "Security, test evidence, rollback và owner phê duyệt." },
] satisfies readonly DeliveryCadence[];
