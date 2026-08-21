import { pilotOutcomes, planStats } from "../_lib/plan";
import styles from "../Roadmap.module.css";

export default function ExecutiveSummary() {
  return (
    <section className={styles.executive} aria-labelledby="plan-summary-title">
      <div>
        <span>Đề xuất triển khai</span>
        <h2 id="plan-summary-title">KSOps — IT Service Hub & CMDB</h2>
        <p>Một cổng tập trung để quản lý tài sản, sự cố, bảo trì, cảnh báo và tri thức vận hành. Bản công khai hiện tại dùng dữ liệu tổng hợp; production chỉ bắt đầu sau discovery, phê duyệt bảo mật và data migration rehearsal.</p>
        <div className={styles.outcomes}>
          <strong>Mục tiêu pilot</strong>
          {pilotOutcomes.map((outcome) => <span key={outcome}>{outcome}</span>)}
        </div>
      </div>
      <aside aria-label="Quy mô kế hoạch">
        <p>Quy mô kế hoạch</p>
        <dl>
          {planStats.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}
        </dl>
        <span>Không kết nối hạ tầng thật trong bản demo công khai.</span>
      </aside>
    </section>
  );
}
