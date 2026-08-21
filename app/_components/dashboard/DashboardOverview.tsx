import Link from "next/link";
import {
  dashboardMetrics,
  nextMaintenance,
  recentIncidents,
  serviceHealth,
} from "../../../lib/dashboard-data";
import styles from "./DashboardOverview.module.css";

function MetricGrid() {
  return (
    <section className={styles.metricGrid} aria-label="Chỉ số vận hành chính">
      {dashboardMetrics.map((metric) => (
        <article className={styles.metricCard} key={metric.label}>
          <span className={styles.metricAccent} data-tone={metric.tone} aria-hidden="true" />
          <p>{metric.label}</p>
          <strong>{metric.value}</strong>
          <small>{metric.note}</small>
        </article>
      ))}
    </section>
  );
}

function RecentIncidents() {
  return (
    <section className={`${styles.panel} ${styles.incidentsPanel}`} aria-labelledby="incidents-title">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.sectionKicker}>Cần hành động</span>
          <h2 id="incidents-title">Sự cố gần đây</h2>
        </div>
        <Link href="/su-co">Xem tất cả <span aria-hidden="true">→</span></Link>
      </div>
      <div className={styles.tableWrap}>
        <table>
          <caption className="sr-only">Ba sự cố gần đây nhất trong dữ liệu mô phỏng</caption>
          <thead>
            <tr>
              <th>Yêu cầu</th>
              <th>Ưu tiên</th>
              <th>Trạng thái</th>
              <th>Phụ trách</th>
            </tr>
          </thead>
          <tbody>
            {recentIncidents.map((incident) => (
              <tr key={incident.id}>
                <td>
                  <Link href={`/su-co?id=${incident.id}`}>{incident.title}</Link>
                  <span>{incident.id} · {incident.site}</span>
                </td>
                <td>
                  <span className={styles.priority} data-priority={incident.priority}>
                    {incident.priority}
                  </span>
                </td>
                <td>{incident.status}</td>
                <td>{incident.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ServiceHealthPanel() {
  return (
    <aside className={`${styles.panel} ${styles.healthPanel}`} aria-labelledby="health-title">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.sectionKicker}>30 ngày gần nhất</span>
          <h2 id="health-title">Sức khỏe dịch vụ</h2>
        </div>
        <span className={styles.statusOk}><i aria-hidden="true" /> Ổn định</span>
      </div>
      <div className={styles.healthScore}>
        <div className={styles.scoreRing} aria-label="Điểm sức khỏe dịch vụ 99,6 trên 100">
          <strong>99,6</strong>
          <span>điểm</span>
        </div>
        <div>
          <strong>Trong ngưỡng mục tiêu</strong>
          <p>Không ghi nhận gián đoạn nghiêm trọng.</p>
        </div>
      </div>
      <div className={styles.serviceList}>
        {serviceHealth.map((service) => (
          <div className={styles.serviceRow} key={service.name}>
            <div>
              <strong>{service.name}</strong>
              <span>{service.status}</span>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label={`Mức sức khỏe ${service.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={service.score}
            >
              <span style={{ width: `${service.score}%` }} />
            </div>
            <b>{service.uptime}</b>
          </div>
        ))}
      </div>
    </aside>
  );
}

function MaintenancePreview() {
  return (
    <section className={`${styles.panel} ${styles.maintenanceStrip}`} aria-labelledby="maintenance-title">
      <div>
        <span className={styles.dateTile} aria-hidden="true">
          <strong>{nextMaintenance.day}</strong>
          <small>{nextMaintenance.monthLabel}</small>
        </span>
        <div>
          <span className={styles.sectionKicker}>Lịch sắp tới</span>
          <h2 id="maintenance-title">{nextMaintenance.title}</h2>
          <p>{nextMaintenance.time} · {nextMaintenance.site} · {nextMaintenance.owner}</p>
        </div>
      </div>
      <Link className={`${styles.button} ${styles.buttonSecondary}`} href="/bao-tri">
        Chi tiết công việc
      </Link>
    </section>
  );
}

export default function DashboardOverview() {
  return (
    <div className={styles.dashboard}>
      <section className={styles.heroPanel} aria-labelledby="welcome-title">
        <div>
          <span className={styles.sectionKicker}>Tổng quan vận hành</span>
          <h2 id="welcome-title">Chào buổi sáng, đội ngũ IT.</h2>
          <p>Hệ thống đang hoạt động ổn định. Hai yêu cầu ưu tiên cao cần được phản hồi trong khung SLA hôm nay.</p>
        </div>
        <div className={styles.heroActions}>
          <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/su-co?new=1">+ Tạo yêu cầu</Link>
          <Link className={`${styles.button} ${styles.buttonSecondary}`} href="/bao-tri">Xem lịch bảo trì</Link>
        </div>
      </section>

      <MetricGrid />

      <div className={styles.dashboardGrid}>
        <RecentIncidents />
        <ServiceHealthPanel />
      </div>

      <MaintenancePreview />
    </div>
  );
}
