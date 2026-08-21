import type { ReactNode } from "react";
import Link from "next/link";
import { portalRouteFor, type PortalPath } from "../../lib/access-control";
import Can from "./access/Can";
import DemoNavigation from "./access/DemoNavigation";
import PilotNavigation from "./access/PilotNavigation";
import DemoRoleSwitcher from "./access/DemoRoleSwitcher";
import DemoRouteBoundary from "./access/DemoRouteBoundary";
import QuickSearch from "./QuickSearch";
import styles from "./PortalShell.module.css";

type PortalShellProps = {
  activePath: PortalPath;
  eyebrow: string;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

export default function PortalShell({
  activePath,
  eyebrow,
  title,
  subtitle,
  headerActions,
  children,
}: PortalShellProps) {
  const pilotMode = process.env.KSOPS_MODE === "pilot";
  const activeRoute = portalRouteFor(activePath);
  const headerPermission = "primaryActionPermission" in activeRoute
    ? activeRoute.primaryActionPermission
    : activeRoute.viewPermission;

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#noi-dung-chinh">
        Bỏ qua điều hướng
      </a>

      <aside className={styles.sidebar} aria-label="Điều hướng KSOps Transport Control">
        <Link className={styles.brand} href="/" aria-label="KSOps Transport Control - Trang tổng quan">
          <span className={styles.brandMark} aria-hidden="true">KS</span>
          <span className={styles.brandCopy}>
            <strong>KSOps</strong>
            <small>Transport Control</small>
          </span>
        </Link>

        <div className={styles.environmentPill}>
          <span className={styles.pulseDot} aria-hidden="true" />
          {pilotMode ? "Pilot nghiệp vụ đơn hàng" : "Trung tâm điều phối demo"}
        </div>

        {pilotMode
          ? <PilotNavigation activePath={activePath} />
          : <DemoNavigation activePath={activePath} />}

        <div className={styles.safetyNote}>
          <span className={styles.shield} aria-hidden="true">✓</span>
          <div>
            <strong>{pilotMode ? "Phạm vi pilot giới hạn" : "Dữ liệu mô phỏng"}</strong>
            <p>{pilotMode
              ? "Chỉ phân hệ Đơn hàng dùng SSO và PostgreSQL. Các phân hệ khác vẫn là dữ liệu mẫu."
              : "Không sử dụng thông tin xe, khách hàng hoặc hành trình thực tế."}</p>
          </div>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.titleBlock}>
            <p>{eyebrow}</p>
            <h1>{title}</h1>
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
          <div className={styles.topbarActions}>
            {headerActions && pilotMode ? (
              <div className={styles.headerActionsSlot}>{headerActions}</div>
            ) : headerActions ? (
              <Can permission={headerPermission}>
                <div className={styles.headerActionsSlot}>{headerActions}</div>
              </Can>
            ) : null}
            {pilotMode ? null : <QuickSearch />}
            <span className={pilotMode ? styles.pilotFlag : styles.demoFlag}>
              <i aria-hidden="true" /> {pilotMode ? "Pilot" : "Demo"}
            </span>
            {pilotMode ? (
              <nav className={styles.pilotSessionControls} aria-label="Điều khiển phiên SSO">
                <a href={`/auth/login?returnTo=${encodeURIComponent(activePath)}`}>Đăng nhập SSO</a>
                <a href={`/auth/logout?returnTo=${encodeURIComponent(activePath)}`}>Kết thúc phiên</a>
              </nav>
            ) : (
              <DemoRoleSwitcher />
            )}
          </div>
        </header>

        <main className={styles.main} id="noi-dung-chinh">
          {pilotMode ? (
            <div className={activePath === "/don-hang" ? styles.pilotBanner : styles.mockBanner} role="note">
              <span className={activePath === "/don-hang" ? styles.pilotBadge : styles.mockBadge}>
                {activePath === "/don-hang" ? "PILOT CARGO" : "DỮ LIỆU MẪU"}
              </span>
              <p>{activePath === "/don-hang" ? (
                <><strong>Lát cắt nghiệp vụ có backend.</strong> API đơn hàng dùng SSO nội bộ, tenant RLS, PostgreSQL và kiểm soát phiên bản.</>
              ) : (
                <><strong>Phân hệ chưa chuyển sang pilot.</strong> Nội dung tại đây vẫn là dữ liệu giả lập và không được ghi vào PostgreSQL.</>
              )}</p>
            </div>
          ) : (
            <div className={styles.mockBanner} role="note">
              <span className={styles.mockBadge}>MOCK DATA</span>
              <p>
                <strong>Môi trường trình diễn độc lập.</strong> Toàn bộ xe, tài xế, khách hàng, hành trình và doanh thu đều là dữ liệu giả lập.
              </p>
            </div>
          )}
          {pilotMode
            ? children
            : <DemoRouteBoundary activePath={activePath}>{children}</DemoRouteBoundary>}
        </main>

        <footer className={styles.footer}>
          <p><strong>KSOps Transport Control</strong> · {pilotMode
            ? "Pilot có kiểm soát; chỉ lát cắt Đơn hàng kết nối hệ thống doanh nghiệp."
            : "Đồ án thực tập lập trình viên, không phải hệ thống chính thức."}</p>
          <span>{pilotMode ? "Cargo pilot · Other modules synthetic" : "Fleet & order demo"}</span>
        </footer>
      </div>
    </div>
  );
}
