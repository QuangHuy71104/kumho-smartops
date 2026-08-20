import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tổng quan · KSOps",
  description:
    "Bảng điều hành IT Ops mô phỏng dành cho hoạt động thực tập lập trình viên tại Kumho Samco.",
};

const navItems = [
  ["TQ", "Tổng quan", "/"],
  ["TS", "Tài sản", "/tai-san"],
  ["SC", "Sự cố", "/su-co"],
  ["BT", "Bảo trì", "/bao-tri"],
  ["GS", "Giám sát", "/giam-sat"],
  ["TT", "Tri thức", "/tri-thuc"],
  ["KH", "Kế hoạch", "/ke-hoach"],
] as const;

const metrics = [
  { label: "Tài sản được quản lý", value: "148", note: "+12 trong 30 ngày", tone: "red" },
  { label: "Thiết bị đạt chuẩn", value: "96,8%", note: "+1,4% so với tháng trước", tone: "green" },
  { label: "Sự cố đang mở", value: "07", note: "2 yêu cầu ưu tiên cao", tone: "amber" },
  { label: "Bảo trì sắp đến hạn", value: "05", note: "Trong 7 ngày tới", tone: "blue" },
] as const;

const incidents = [
  {
    id: "INC-2048",
    title: "Mất kết nối máy in tại quầy điều hành",
    site: "Điểm vận hành A (mô phỏng)",
    priority: "Cao",
    status: "Đang xử lý",
    assignee: "Nhóm Hạ tầng",
  },
  {
    id: "INC-2046",
    title: "Ứng dụng nghiệp vụ phản hồi chậm",
    site: "Văn phòng trung tâm (mô phỏng)",
    priority: "Trung bình",
    status: "Đang phân tích",
    assignee: "Nhóm Ứng dụng",
  },
  {
    id: "INC-2043",
    title: "Yêu cầu cấp quyền tài khoản nhân sự mới",
    site: "Chi nhánh B (mô phỏng)",
    priority: "Thấp",
    status: "Chờ duyệt",
    assignee: "Service Desk",
  },
] as const;

const services = [
  ["Mạng văn phòng", "99,98%", "Ổn định", 99],
  ["Hệ thống bán vé", "99,92%", "Ổn định", 96],
  ["Đồng bộ dữ liệu", "98,70%", "Theo dõi", 78],
  ["Sao lưu định kỳ", "100%", "Hoàn tất", 100],
] as const;

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="KSOps - Trang tổng quan">
          <span className="brand-mark">KS</span>
          <span>
            <strong>KSOps</strong>
            <small>IT Service Hub</small>
          </span>
        </Link>

        <div className="environment-pill">
          <span className="pulse-dot" />
          Bản demo thực tập
        </div>

        <nav className="primary-nav" aria-label="Điều hướng chính">
          <p className="nav-label">Vận hành</p>
          {navItems.slice(0, 6).map(([short, label, href], index) => (
            <Link className={index === 0 ? "active" : ""} href={href} key={href}>
              <span className="nav-icon" aria-hidden="true">{short}</span>
              {label}
            </Link>
          ))}
          <p className="nav-label nav-label-spaced">Dự án</p>
          {navItems.slice(6).map(([short, label, href]) => (
            <Link href={href} key={href}>
              <span className="nav-icon" aria-hidden="true">{short}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-note">
          <strong>Dữ liệu an toàn</strong>
          <p>Toàn bộ tên, mã thiết bị và chỉ số trên bản demo đều là dữ liệu mô phỏng.</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Thứ Sáu, 21 tháng 08, 2026</p>
            <h1>Trung tâm điều hành IT</h1>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <span className="sr-only">Tìm kiếm nhanh</span>
              <span aria-hidden="true">⌕</span>
              <input placeholder="Tìm tài sản, sự cố..." type="search" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="avatar-button" type="button" aria-label="Tài khoản Demo Admin">DA</button>
          </div>
        </header>

        <section className="hero-panel" aria-labelledby="welcome-title">
          <div>
            <span className="section-kicker">Tổng quan vận hành</span>
            <h2 id="welcome-title">Chào buổi sáng, đội ngũ IT.</h2>
            <p>
              Hệ thống đang hoạt động ổn định. Hai yêu cầu ưu tiên cao cần được
              phản hồi trong khung SLA hôm nay.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/su-co?new=1">+ Tạo yêu cầu</Link>
            <Link className="button button-secondary" href="/bao-tri">Xem lịch bảo trì</Link>
          </div>
        </section>

        <section className="metric-grid" aria-label="Chỉ số vận hành chính">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <div className={`metric-accent ${metric.tone}`} />
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <small>{metric.note}</small>
            </article>
          ))}
        </section>

        <div className="dashboard-grid">
          <section className="panel incidents-panel" aria-labelledby="incidents-title">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Cần hành động</span>
                <h2 id="incidents-title">Sự cố gần đây</h2>
              </div>
              <Link href="/su-co">Xem tất cả <span aria-hidden="true">→</span></Link>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Yêu cầu</th><th>Ưu tiên</th><th>Trạng thái</th><th>Phụ trách</th></tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident.id}>
                      <td>
                        <Link href={`/su-co?id=${incident.id}`}>{incident.title}</Link>
                        <span>{incident.id} · {incident.site}</span>
                      </td>
                      <td><span className={`priority priority-${incident.priority === "Cao" ? "cao" : "normal"}`}>{incident.priority}</span></td>
                      <td>{incident.status}</td>
                      <td>{incident.assignee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="panel health-panel" aria-labelledby="health-title">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">30 ngày gần nhất</span>
                <h2 id="health-title">Sức khỏe dịch vụ</h2>
              </div>
              <span className="status-ok"><i /> Ổn định</span>
            </div>
            <div className="health-score">
              <div className="score-ring"><strong>99,6</strong><span>điểm</span></div>
              <div><strong>Trong ngưỡng mục tiêu</strong><p>Không ghi nhận gián đoạn nghiêm trọng.</p></div>
            </div>
            <div className="service-list">
              {services.map(([name, uptime, status, width]) => (
                <div className="service-row" key={name}>
                  <div><strong>{name}</strong><span>{status}</span></div>
                  <div className="progress-track"><span style={{ width: `${width}%` }} /></div>
                  <b>{uptime}</b>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section className="panel maintenance-strip" aria-labelledby="maintenance-title">
          <div>
            <span className="date-tile"><strong>24</strong><small>THÁNG 8</small></span>
            <div>
              <span className="section-kicker">Lịch sắp tới</span>
              <h2 id="maintenance-title">Kiểm tra sao lưu và cập nhật thiết bị mạng</h2>
              <p>09:00–11:30 · Điểm vận hành A · Nhóm Hạ tầng</p>
            </div>
          </div>
          <Link className="button button-secondary" href="/bao-tri">Chi tiết công việc</Link>
        </section>

        <footer className="app-footer">
          <p><strong>KSOps</strong> · Đồ án thực tập lập trình viên, không phải hệ thống chính thức của doanh nghiệp.</p>
          <span>Phiên bản demo 1.0</span>
        </footer>
      </main>
    </div>
  );
}
