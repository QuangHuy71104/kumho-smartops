import Link from "next/link";
import {
  ALERTS,
  type Alert,
  type AlertLevel,
} from "../_lib/monitoring";
import styles from "../page.module.css";
import { PanelHeading } from "./PanelHeading";

const ALERT_ICON_CLASS: Record<AlertLevel, string> = {
  Cao: styles.alertHigh,
  "Trung bình": styles.alertMedium,
  "Thông tin": styles.alertInfo,
};

function AlertRow({ alert }: { alert: Alert }) {
  return (
    <article className={styles.alertRow}>
      <div className={ALERT_ICON_CLASS[alert.level]} aria-hidden="true">
        !
      </div>
      <div className={styles.alertCopy}>
        <strong>{alert.title}</strong>
        <span>
          {alert.code} · {alert.detail}
        </span>
      </div>
      <span className={styles.alertLevel}>{alert.level}</span>
      <time dateTime={`2026-08-21T${alert.time}:00+07:00`}>{alert.time}</time>
    </article>
  );
}

export function AlertsPanel() {
  return (
    <section className={styles.panel} aria-labelledby="alerts-title">
      <PanelHeading
        kicker="Cần phản hồi"
        title="Cảnh báo gần đây"
        titleId="alerts-title"
        description="Luồng sự kiện tổng hợp từ môi trường mô phỏng."
        accessory={<span className={styles.alertCount}>03 đang mở</span>}
      />
      <div className={styles.alertList}>
        {ALERTS.map((alert) => (
          <AlertRow key={alert.code} alert={alert} />
        ))}
      </div>
      <div className={styles.alertFooter}>
        <span>
          <i /> Tự động làm mới đang bật
        </span>
        <Link href="/su-co">Mở trung tâm sự cố →</Link>
      </div>
    </section>
  );
}
