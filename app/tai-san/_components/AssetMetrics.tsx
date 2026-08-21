import type { AssetSummary } from "../_lib/assets";
import styles from "../page.module.css";

type AssetMetricsProps = {
  summary: AssetSummary;
  total: number;
};

export default function AssetMetrics({ summary, total }: AssetMetricsProps) {
  return (
    <section className={styles.metrics} aria-label="Tổng quan danh mục tài sản">
      <article className={styles.metricCard}>
        <span className={`${styles.metricIcon} ${styles.iconRed}`} aria-hidden="true">TS</span>
        <div><p>Tổng tài sản</p><strong>{total}</strong><small>100% bản ghi mô phỏng</small></div>
        <span className={styles.metricTrend}>+12 quý này</span>
      </article>
      <article className={styles.metricCard}>
        <span className={`${styles.metricIcon} ${styles.iconGreen}`} aria-hidden="true">✓</span>
        <div><p>Đang hoạt động</p><strong>{summary.active}</strong><small>{Math.round(summary.active / total * 100)}% danh mục</small></div>
        <span className={styles.metricTrendGood}>Ổn định</span>
      </article>
      <article className={styles.metricCard}>
        <span className={`${styles.metricIcon} ${styles.iconAmber}`} aria-hidden="true">!</span>
        <div><p>Cần theo dõi</p><strong>{summary.attention}</strong><small>Cần đánh giá kỹ thuật</small></div>
        <span className={styles.metricTrendWarn}>Ưu tiên</span>
      </article>
      <article className={styles.metricCard}>
        <span className={`${styles.metricIcon} ${styles.iconBlue}`} aria-hidden="true">BT</span>
        <div><p>Đang bảo trì</p><strong>{summary.maintenance}</strong><small>{summary.verified} thiết bị đạt chuẩn</small></div>
        <span className={styles.metricTrend}>Theo lịch</span>
      </article>
    </section>
  );
}
