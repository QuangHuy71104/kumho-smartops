import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import { roadmapPhases } from "../../lib/demo-data";
import styles from "./Roadmap.module.css";

export const metadata: Metadata = {
  title: "Kế hoạch phát triển",
  description: "Roadmap 12 tuần, kiến trúc mục tiêu, quản trị rủi ro và tiêu chí bàn giao KSOps.",
};

const architecture = [
  { code: "UX", title: "Web app", text: "Next.js, TypeScript, thiết kế responsive, WCAG 2.2 AA." },
  { code: "API", title: "Application API", text: "REST/OpenAPI, validation, rate limit, idempotency và audit context." },
  { code: "IAM", title: "Identity", text: "SSO OIDC, MFA, RBAC, nguyên tắc quyền tối thiểu và session ngắn hạn." },
  { code: "DB", title: "Data layer", text: "PostgreSQL, migration có phiên bản, mã hóa, backup và restore drill." },
  { code: "OBS", title: "Observability", text: "Log có cấu trúc, metric, tracing, alert routing và SLO dashboard." },
] as const;

const deliverables = [
  ["Product", "PRD, user story, acceptance criteria, prototype và quyết định phạm vi pilot."],
  ["Engineering", "Mã nguồn, API spec, schema, migration, seed data, test và CI/CD pipeline."],
  ["Security", "Threat model, RBAC matrix, secret handling, dependency scan và penetration checklist."],
  ["Operations", "Runbook, dashboard, alert, backup/restore, rollback và tài liệu xử lý sự cố."],
  ["Handover", "UAT sign-off, training, changelog, release note và kế hoạch hypercare 2 tuần."],
] as const;

const risks = [
  { risk: "Dữ liệu tài sản thiếu chuẩn", impact: "Cao", control: "Data dictionary, owner, import dry-run và báo cáo ngoại lệ." },
  { risk: "Phạm vi tích hợp tăng", impact: "Cao", control: "Pilot không tích hợp thật; mọi connector qua ADR và change control." },
  { risk: "Rò rỉ cấu hình nội bộ", impact: "Rất cao", control: "Synthetic data, secret scan, review lịch sử Git và public-data gate." },
  { risk: "Người dùng không tiếp nhận", impact: "Trung bình", control: "Discovery sớm, champion theo phòng ban, UAT theo kịch bản thực tế." },
] as const;

export default function RoadmapPage() {
  return (
    <PortalShell
      activePath="/ke-hoach"
      eyebrow="Delivery blueprint"
      title="Kế hoạch phát triển 12 tuần"
      subtitle="Từ prototype thực tập đến pilot có thể đánh giá trong môi trường doanh nghiệp."
      headerActions={<a className={styles.headerButton} href="#roadmap">Xem roadmap</a>}
    >
      <div className={styles.module}>
        <section className={styles.executive}>
          <div>
            <span>Đề xuất triển khai</span>
            <h2>KSOps — IT Service Hub & CMDB</h2>
            <p>Một cổng tập trung để quản lý tài sản, sự cố, bảo trì, cảnh báo và tri thức vận hành. Bản công khai hiện tại dùng dữ liệu tổng hợp; production chỉ bắt đầu sau discovery, phê duyệt bảo mật và data migration rehearsal.</p>
            <div className={styles.outcomes}><strong>Mục tiêu pilot</strong><span>100% tài sản mẫu có owner</span><span>≥ 92% công việc đúng hạn</span><span>Giảm 20% MTTR</span></div>
          </div>
          <aside>
            <p>Quy mô kế hoạch</p>
            <dl><div><dt>Thời lượng</dt><dd>12 tuần</dd></div><div><dt>Nhân sự lõi</dt><dd>5 vai trò</dd></div><div><dt>Release</dt><dd>6 mốc</dd></div><div><dt>Go-live</dt><dd>Pilot</dd></div></dl>
            <span>Không kết nối hạ tầng thật trong bản demo công khai.</span>
          </aside>
        </section>

        <section className={styles.roadmap} id="roadmap" aria-labelledby="roadmap-title">
          <div className={styles.sectionHeading}><div><span>Workstream theo tuần</span><h2 id="roadmap-title">Roadmap triển khai</h2></div><p>Stage-gate ở cuối mỗi giai đoạn</p></div>
          <div className={styles.phaseList}>
            {roadmapPhases.map((phase, index) => (
              <article key={phase.weeks} data-status={phase.status}>
                <span className={styles.phaseIndex}>{String(index + 1).padStart(2,"0")}</span>
                <div><span>{phase.weeks}</span><h3>{phase.name}</h3><p>{phase.outcome}</p></div>
                <i>{phase.status}</i>
              </article>
            ))}
          </div>
        </section>

        <div className={styles.twoColumn}>
          <section className={styles.architecture} aria-labelledby="architecture-title">
            <div className={styles.sectionHeading}><div><span>Target state</span><h2 id="architecture-title">Kiến trúc production đề xuất</h2></div><p>API-first · Zero trust · Observable</p></div>
            <div className={styles.archStack}>
              {architecture.map((layer, index) => <article key={layer.code}><span>{layer.code}</span><div><strong>{layer.title}</strong><p>{layer.text}</p></div><i>{index < architecture.length - 1 ? "↓" : "✓"}</i></article>)}
            </div>
          </section>

          <section className={styles.gates} aria-labelledby="gates-title">
            <div className={styles.sectionHeading}><div><span>Quality gates</span><h2 id="gates-title">Definition of Done</h2></div><p>Mọi release</p></div>
            <ul>
              <li><span>01</span><div><strong>Code quality</strong><p>Review bắt buộc, lint, typecheck, unit/integration test và build đều xanh.</p></div></li>
              <li><span>02</span><div><strong>Security</strong><p>Không secret/PII, dependency scan đạt, RBAC và audit được kiểm thử.</p></div></li>
              <li><span>03</span><div><strong>Reliability</strong><p>SLO/alert rõ, backup được xác minh, rollback diễn tập thành công.</p></div></li>
              <li><span>04</span><div><strong>Product</strong><p>Acceptance criteria đạt, accessibility pass, UAT owner ký xác nhận.</p></div></li>
              <li><span>05</span><div><strong>Operations</strong><p>Runbook, dashboard, release note và on-call handover hoàn chỉnh.</p></div></li>
            </ul>
          </section>
        </div>

        <section className={styles.deliverables} aria-labelledby="deliverables-title">
          <div className={styles.sectionHeading}><div><span>Bộ bàn giao</span><h2 id="deliverables-title">Deliverables theo chuẩn doanh nghiệp</h2></div><p>Owner và bằng chứng rõ ràng</p></div>
          <div>{deliverables.map(([name,text],index) => <article key={name}><span>{String(index+1).padStart(2,"0")}</span><strong>{name}</strong><p>{text}</p><i>Ready gate</i></article>)}</div>
        </section>

        <section className={styles.risks} aria-labelledby="risks-title">
          <div className={styles.sectionHeading}><div><span>Risk register</span><h2 id="risks-title">Rủi ro và kiểm soát</h2></div><p>Review hàng tuần</p></div>
          <div className={styles.riskTable} role="table" aria-label="Danh sách rủi ro">
            <div role="row" className={styles.riskHeader}><span role="columnheader">Rủi ro</span><span role="columnheader">Mức độ</span><span role="columnheader">Kiểm soát chính</span></div>
            {risks.map((item) => <div role="row" key={item.risk}><strong role="cell">{item.risk}</strong><span role="cell" data-impact={item.impact}>{item.impact}</span><p role="cell">{item.control}</p></div>)}
          </div>
        </section>

        <section className={styles.cadence}>
          <div><span>Thứ Hai</span><strong>Planning & risk review</strong><p>Ưu tiên sprint, dependency, risk và decision log.</p></div>
          <div><span>Hằng ngày</span><strong>Stand-up 15 phút</strong><p>Tiến độ, blocker và hành động trong 24 giờ.</p></div>
          <div><span>Thứ Sáu</span><strong>Demo & retro</strong><p>Demo cho stakeholder, ghi feedback và cải tiến quy trình.</p></div>
          <div><span>Mỗi release</span><strong>Change review</strong><p>Security, test evidence, rollback và owner phê duyệt.</p></div>
        </section>
      </div>
    </PortalShell>
  );
}
