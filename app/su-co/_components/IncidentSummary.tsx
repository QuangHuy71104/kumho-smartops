import type { IncidentRecord } from "../_lib/incidents";
import { summarizeIncidentRecords } from "../_lib/incidents";
import styles from "../Incidents.module.css";

export function IncidentSummary({ incidents }: { incidents: IncidentRecord[] }) {
  const stats = summarizeIncidentRecords(incidents);

  return (
    <section className={styles.stats} aria-label="Tổng hợp sự cố">
      <article><span>Đang mở</span><strong>{String(stats.open).padStart(2, "0")}</strong><small>Toàn bộ hàng đợi</small></article>
      <article><span>Ưu tiên cao</span><strong>{String(stats.urgent).padStart(2, "0")}</strong><small>Cần phản hồi sớm</small></article>
      <article><span>Chờ phản hồi</span><strong>{String(stats.waiting).padStart(2, "0")}</strong><small>Từ người yêu cầu</small></article>
      <article><span>Đã giải quyết</span><strong>{String(stats.resolved).padStart(2, "0")}</strong><small>Trong dữ liệu hiện tại</small></article>
    </section>
  );
}
