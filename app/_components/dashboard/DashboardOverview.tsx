import Link from "next/link";
import {
  createOrderHref,
  dashboardFleetSummary,
  dashboardMetrics,
  fleetReadiness,
  nextMaintenance,
  recentOrders,
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

function RecentOrders() {
  return (
    <section className={`${styles.panel} ${styles.ordersPanel}`} aria-labelledby="orders-title">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.sectionKicker}>Luồng công việc hôm nay</span>
          <h2 id="orders-title">Đơn hàng cần theo dõi</h2>
        </div>
        <Link href="/don-hang">Xem tất cả <span aria-hidden="true">→</span></Link>
      </div>
      <div className={styles.tableWrap}>
        <table>
          <caption className="sr-only">Ba đơn vận chuyển gần đây nhất trong dữ liệu mô phỏng</caption>
          <thead>
            <tr>
              <th>Đơn vận chuyển</th>
              <th>Dịch vụ</th>
              <th>Trạng thái</th>
              <th>Hạn SLA</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link href={order.href}>{order.title}</Link>
                  <span>{order.id} · {order.assignee}</span>
                </td>
                <td>
                  <span className={styles.priority}>
                    {order.service}
                  </span>
                </td>
                <td>{order.status}</td>
                <td>{order.deadline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FleetReadinessPanel() {
  return (
    <aside className={`${styles.panel} ${styles.healthPanel}`} aria-labelledby="health-title">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.sectionKicker}>Năng lực khai thác</span>
          <h2 id="health-title">Mức sẵn sàng đội xe</h2>
        </div>
        <span className={styles.statusOk}><i aria-hidden="true" /> Ổn định</span>
      </div>
      <div className={styles.healthScore}>
        <div className={styles.scoreRing} aria-label={`${dashboardFleetSummary.ready} trên ${dashboardFleetSummary.total} xe sẵn sàng`}>
          <strong>{dashboardFleetSummary.ready}/{dashboardFleetSummary.total}</strong>
          <span>xe sẵn sàng</span>
        </div>
        <div>
          <strong>{dashboardFleetSummary.running} xe đang khai thác</strong>
          <p>{dashboardFleetSummary.maintenance} xe bảo dưỡng · điểm sẵn sàng bình quân {dashboardFleetSummary.averageReadiness}%.</p>
        </div>
      </div>
      <div className={styles.serviceList}>
        {fleetReadiness.map((service) => (
          <div className={styles.serviceRow} key={service.name}>
            <div>
              <strong>{service.name}</strong>
              <span>{service.status}</span>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label={`Mức sẵn sàng ${service.name}`}
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
      <Link className={`${styles.button} ${styles.buttonSecondary}`} href="/bao-duong">
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
          <span className={styles.sectionKicker}>Ca vận hành 21/08</span>
          <h2 id="welcome-title">Điều phối mọi chuyến đi từ một màn hình.</h2>
          <p>Theo dõi đội xe, đơn hàng, tài xế và cam kết giao nhận trong cùng một luồng vận hành minh bạch.</p>
        </div>
        <div className={styles.heroActions}>
          <Link className={`${styles.button} ${styles.buttonPrimary}`} href={createOrderHref}>+ Tạo đơn hàng</Link>
          <Link className={`${styles.button} ${styles.buttonSecondary}`} href="/dieu-phoi">Mở bàn điều phối</Link>
        </div>
      </section>

      <MetricGrid />

      <div className={styles.dashboardGrid}>
        <RecentOrders />
        <FleetReadinessPanel />
      </div>

      <MaintenancePreview />
    </div>
  );
}
