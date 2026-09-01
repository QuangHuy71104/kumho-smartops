import Link from "next/link";
import type { CSSProperties } from "react";
import { demoDispatchTasks } from "../../dieu-phoi/_lib/dispatch";
import { workOrders } from "../../bao-duong/_lib/maintenance";
import {
  createOrderHref,
  dashboardFleetSummary,
  dashboardMetrics,
  recentOrders,
} from "../../../lib/dashboard-data";
import styles from "./DashboardOverview.module.css";

const METRIC_ICON: Record<(typeof dashboardMetrics)[number]["tone"], string> = {
  brand: "₫",
  success: "✓",
  warning: "!",
  info: "↗",
};

const STATUS_TONE: Record<string, string> = {
  "Đang chạy": styles.statusRunning,
  "Sẵn sàng": styles.statusReady,
  "Chờ điều phối": styles.statusWaiting,
  "Có xung đột": styles.statusRisk,
};

const currentDate = demoDispatchTasks[0]?.date;
const upcomingTrips = demoDispatchTasks
  .filter((task) => task.date === currentDate)
  .slice(0, 5);

const priorityItems = [
  {
    title: `${workOrders.find((order) => order.status === "Quá hạn")?.vehicleCode ?? "51B-254.97"} cần kiểm tra hệ thống phanh`,
    module: "Đội xe",
    due: "10 phút trước",
    label: "Khẩn cấp",
    tone: styles.priorityUrgent,
    href: "/bao-duong",
  },
  {
    title: `Xác nhận nguồn lực cho chuyến ${upcomingTrips.find((trip) => !trip.driverId)?.id ?? "DP-HD-207"}`,
    module: "Điều phối",
    due: "Hạn 09:00",
    label: "Ưu tiên",
    tone: styles.priorityHigh,
    href: "/dieu-phoi",
  },
  {
    title: "Duyệt đề xuất đổi ca của nhân viên vận hành",
    module: "Nhân sự",
    due: "Hạn hôm nay",
    label: "Bình thường",
    tone: styles.priorityNormal,
    href: "/cong-viec",
  },
] as const;

function MetricGrid() {
  const metrics = [...dashboardMetrics].sort((left, right) => {
    const order = ["Chuyến đang chạy", "Đúng giờ 7 ngày", "Đơn cần xử lý", "Xe sẵn sàng"];
    return order.indexOf(left.label) - order.indexOf(right.label);
  });

  return (
    <section className={styles.metricGrid} aria-label="Chỉ số vận hành chính">
      {metrics.map((metric) => (
        <article className={styles.metricCard} key={metric.label} data-tone={metric.tone}>
          <span className={styles.metricIcon} aria-hidden="true">{METRIC_ICON[metric.tone]}</span>
          <p>{metric.label}</p>
          <div>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </div>
        </article>
      ))}
    </section>
  );
}

function TripActivity() {
  return (
    <section className={`${styles.panel} ${styles.tripsPanel}`} aria-labelledby="trips-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="trips-title">Hoạt động tuyến</h2>
          <p>Các chuyến cần điều phối trong ca hiện tại</p>
        </div>
        <Link href="/dieu-phoi">Xem tất cả {demoDispatchTasks.length}</Link>
      </div>
      <div className={styles.tableWrap}>
        <table>
          <caption className="sr-only">Các chuyến cần điều phối trong ca hiện tại</caption>
          <thead>
            <tr>
              <th>Mã chuyến</th>
              <th>Tuyến</th>
              <th>Giờ</th>
              <th>Trạng thái</th>
              <th>Phụ trách</th>
            </tr>
          </thead>
          <tbody>
            {upcomingTrips.map((trip) => (
              <tr key={trip.id}>
                <td><Link href="/dieu-phoi">{trip.id}</Link></td>
                <td>{trip.origin} → {trip.destination}</td>
                <td>{trip.time.split("–")[0]}</td>
                <td><span className={`${styles.statusBadge} ${STATUS_TONE[trip.status] ?? styles.statusWaiting}`}>{trip.status}</span></td>
                <td>{trip.driverAlias.replace("Chưa gán tài xế", "Chưa phân công")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FleetPanel() {
  const readyPercent = Math.round((dashboardFleetSummary.ready / dashboardFleetSummary.total) * 100);
  const fleetStates = [
    { label: "Đang chạy", value: dashboardFleetSummary.running, tone: styles.legendRunning },
    { label: "Sẵn sàng", value: dashboardFleetSummary.ready, tone: styles.legendReady },
    { label: "Bảo trì", value: dashboardFleetSummary.maintenance, tone: styles.legendMaintenance },
  ];

  return (
    <aside className={`${styles.panel} ${styles.fleetPanel}`} aria-labelledby="fleet-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="fleet-title">Tình trạng đội xe</h2>
          <p>{dashboardFleetSummary.total} phương tiện</p>
        </div>
      </div>
      <div
        className={styles.fleetRing}
        style={{ "--fleet-score": `${readyPercent * 3.6}deg` } as CSSProperties}
        role="img"
        aria-label={`${readyPercent}% đội xe sẵn sàng`}
      >
        <strong>{readyPercent}%</strong>
        <span>sẵn sàng</span>
      </div>
      <div className={styles.fleetLegend}>
        {fleetStates.map((state) => (
          <div key={state.label}>
            <span><i className={state.tone} aria-hidden="true" />{state.label}</span>
            <strong>{state.value}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

function PriorityWork() {
  return (
    <section className={`${styles.panel} ${styles.priorityPanel}`} aria-labelledby="priority-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="priority-title">Việc cần xử lý</h2>
          <p>Ưu tiên theo rủi ro và thời hạn</p>
        </div>
        <div className={styles.panelLinks}>
          <Link href={createOrderHref}>Tạo đơn</Link>
          <Link href="/cong-viec">Mở không gian làm việc</Link>
        </div>
      </div>
      <div className={styles.priorityList}>
        {recentOrders.slice(0, 1).map((order) => (
          <Link href={order.href} key={order.id}>
            <i className={styles.priorityHigh} aria-hidden="true" />
            <strong>{order.title}</strong>
            <span>{order.service}</span>
            <small>{order.deadline}</small>
            <b className={styles.priorityHigh}>{order.status}</b>
            <em aria-hidden="true">›</em>
          </Link>
        ))}
        {priorityItems.map((item) => (
          <Link href={item.href} key={item.title}>
            <i className={item.tone} aria-hidden="true" />
            <strong>{item.title}</strong>
            <span>{item.module}</span>
            <small>{item.due}</small>
            <b className={item.tone}>{item.label}</b>
            <em aria-hidden="true">›</em>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function DashboardOverview() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardActionRow}>
        <p><span aria-hidden="true" /> Tình hình vận hành được cập nhật theo ca.</p>
        <Link className={styles.primaryButton} href="/cong-viec">+ Tạo công việc</Link>
      </div>
      <MetricGrid />
      <div className={styles.dashboardGrid}>
        <TripActivity />
        <FleetPanel />
      </div>
      <PriorityWork />
    </div>
  );
}
