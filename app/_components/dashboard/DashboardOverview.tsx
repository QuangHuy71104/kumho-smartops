import Link from "next/link";
import {
  DEFAULT_TRAVEL_DATE,
  formatDemoPrice,
  formatTravelDate,
  routeForTrip,
  ticketTrips,
} from "../../ve-xe/_lib/ticket-data";
import styles from "./DashboardOverview.module.css";

const todayTrips = ticketTrips.filter((trip) => trip.date === DEFAULT_TRAVEL_DATE);
const soldSeats = todayTrips.reduce((total, trip) => total + trip.reservedSeats.length, 0);
const totalSeats = todayTrips.reduce((total, trip) => total + trip.capacity, 0);
const occupancy = Math.round((soldSeats / totalSeats) * 100);
const ticketRevenue = todayTrips.reduce(
  (total, trip) => total + trip.reservedSeats.length * trip.price,
  0,
);

const metrics = [
  {
    label: "Doanh thu hôm nay",
    value: formatDemoPrice(ticketRevenue).replace("₫", "").trim(),
    unit: "₫",
    note: "+8,4% so với cùng kỳ",
    tone: "brand",
  },
  {
    label: "Vé đã bán",
    value: String(soldSeats),
    unit: `/${totalSeats} ghế`,
    note: `${totalSeats - soldSeats} ghế còn trống`,
    tone: "blue",
  },
  {
    label: "Hệ số lấp đầy",
    value: `${occupancy}%`,
    unit: "",
    note: "Mục tiêu ca 75%",
    tone: "success",
  },
  {
    label: "Chuyến mở bán",
    value: String(todayTrips.length),
    unit: "chuyến",
    note: "1 chuyến sắp khởi hành",
    tone: "warning",
  },
] as const;

const quickActions = [
  { label: "Bán vé mới", detail: "Tìm chuyến & chọn ghế", href: "/ve-xe#dat-cho", icon: "+" },
  { label: "Danh sách khách", detail: "Tra cứu hành khách", href: "/khach-hang", icon: "KH" },
  { label: "Điều hành chuyến", detail: "Xe, tài xế & giờ chạy", href: "/dieu-phoi", icon: "CX" },
  { label: "Xem báo cáo", detail: "Doanh thu & hiệu suất", href: "/bao-cao", icon: "BC" },
] as const;

function MetricCards() {
  return (
    <section className={styles.metricGrid} aria-label="Chỉ số bán vé trong ngày">
      {metrics.map((metric) => (
        <article className={styles.metricCard} data-tone={metric.tone} key={metric.label}>
          <div className={styles.metricHeading}>
            <span>{metric.label}</span>
            <i aria-hidden="true" />
          </div>
          <div className={styles.metricValue}>
            <strong>{metric.value}</strong>
            {metric.unit ? <small>{metric.unit}</small> : null}
          </div>
          <p>{metric.note}</p>
        </article>
      ))}
    </section>
  );
}

function TodayTrips() {
  return (
    <section className={`${styles.panel} ${styles.tripsPanel}`} aria-labelledby="today-trips-title">
      <div className={styles.panelHeading}>
        <div>
          <span>Lịch chạy hôm nay</span>
          <h2 id="today-trips-title">Chuyến sắp khởi hành</h2>
        </div>
        <Link href="/dieu-phoi">Xem điều hành <span aria-hidden="true">→</span></Link>
      </div>
      <div className={styles.tripList}>
        {todayTrips.map((trip, index) => {
          const route = routeForTrip(trip);
          const fill = Math.round((trip.reservedSeats.length / trip.capacity) * 100);
          return (
            <article className={styles.tripRow} key={trip.id}>
              <time dateTime={`${trip.date}T${trip.departure}`}>
                <strong>{trip.departure}</strong>
                <span>{index === 0 ? "Sắp chạy" : "Hôm nay"}</span>
              </time>
              <div className={styles.tripRoute}>
                <div>
                  <strong>{route.origin}</strong>
                  <span aria-hidden="true">→</span>
                  <strong>{route.destination}</strong>
                </div>
                <small>{trip.id} · {trip.vehicle} · {trip.serviceClass}</small>
              </div>
              <div className={styles.occupancy}>
                <div><span>{trip.reservedSeats.length}/{trip.capacity} ghế</span><strong>{fill}%</strong></div>
                <div className={styles.progress} role="progressbar" aria-label={`Lấp đầy chuyến ${trip.id}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill}>
                  <span style={{ width: `${fill}%` }} />
                </div>
              </div>
              <Link aria-label={`Mở bán vé chuyến ${trip.id}`} href="/ve-xe#dat-cho">Bán vé</Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <aside className={`${styles.panel} ${styles.quickPanel}`} aria-labelledby="quick-actions-title">
      <div className={styles.panelHeading}>
        <div>
          <span>Thao tác nhanh</span>
          <h2 id="quick-actions-title">Bắt đầu công việc</h2>
        </div>
      </div>
      <div className={styles.quickList}>
        {quickActions.map((action) => (
          <Link href={action.href} key={action.label}>
            <i aria-hidden="true">{action.icon}</i>
            <span><strong>{action.label}</strong><small>{action.detail}</small></span>
            <b aria-hidden="true">›</b>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function AttentionPanel() {
  return (
    <section className={`${styles.panel} ${styles.attentionPanel}`} aria-labelledby="attention-title">
      <div className={styles.panelHeading}>
        <div>
          <span>Cần xử lý</span>
          <h2 id="attention-title">Ưu tiên trong ca</h2>
        </div>
        <strong>3 việc</strong>
      </div>
      <div className={styles.attentionList}>
        <Link href="/ve-xe">
          <i data-tone="warning" aria-hidden="true">!</i>
          <span><strong>3 đặt chỗ sắp hết thời gian giữ</strong><small>Xác nhận thanh toán trước 09:10</small></span>
          <em>Vé xe</em>
        </Link>
        <Link href="/dieu-phoi">
          <i data-tone="danger" aria-hidden="true">!</i>
          <span><strong>Chuyến 14:00 chưa hoàn tất danh sách khách</strong><small>TRP-D2203 · TP.HCM → Vũng Tàu</small></span>
          <em>Chuyến xe</em>
        </Link>
        <Link href="/khach-hang">
          <i data-tone="info" aria-hidden="true">i</i>
          <span><strong>1 phản hồi khách hàng cần gọi lại</strong><small>Hạn xử lý trong ca sáng</small></span>
          <em>CSKH</em>
        </Link>
      </div>
    </section>
  );
}

function SalesMix() {
  const channels = [
    { label: "Quầy vé", value: 52, amount: "5,8 tr" },
    { label: "Trực tuyến", value: 34, amount: "3,8 tr" },
    { label: "Đại lý", value: 14, amount: "1,5 tr" },
  ];

  return (
    <aside className={`${styles.panel} ${styles.salesPanel}`} aria-labelledby="sales-mix-title">
      <div className={styles.panelHeading}>
        <div>
          <span>Kênh bán</span>
          <h2 id="sales-mix-title">Cơ cấu doanh thu</h2>
        </div>
      </div>
      <div className={styles.salesList}>
        {channels.map((channel) => (
          <div key={channel.label}>
            <div><span>{channel.label}</span><strong>{channel.amount} · {channel.value}%</strong></div>
            <div className={styles.channelBar}><span style={{ width: `${channel.value}%` }} /></div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function DashboardOverview() {
  return (
    <div className={styles.dashboard}>
      <section className={styles.welcome} aria-labelledby="shift-overview-title">
        <div>
          <span className={styles.live}><i aria-hidden="true" /> Đang trong ca</span>
          <h2 id="shift-overview-title">Chào buổi sáng, Minh</h2>
          <p>{formatTravelDate(DEFAULT_TRAVEL_DATE)} · Theo dõi bán vé và chuyến xe trên một màn hình.</p>
        </div>
        <div className={styles.welcomeActions}>
          <Link href="/dieu-phoi">Mở điều hành</Link>
          <Link href="/ve-xe#dat-cho">+ Bán vé mới</Link>
        </div>
      </section>
      <MetricCards />
      <div className={styles.primaryGrid}>
        <TodayTrips />
        <QuickActions />
      </div>
      <div className={styles.secondaryGrid}>
        <AttentionPanel />
        <SalesMix />
      </div>
    </div>
  );
}
