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
            <small>Kumho Samco</small>
          </span>
        </Link>

        {pilotMode ? (
          <div className={styles.environmentPill}>
            <span className={styles.pulseDot} aria-hidden="true" />
            Kết nối nghiệp vụ
          </div>
        ) : null}

        {pilotMode
          ? <PilotNavigation activePath={activePath} />
          : <DemoNavigation activePath={activePath} />}

        {pilotMode ? (
          <div className={styles.safetyNote}>
            <span className={styles.shield} aria-hidden="true">✓</span>
            <div>
              <strong>Phạm vi có kiểm soát</strong>
              <p>Dữ liệu hiển thị theo quyền truy cập.</p>
            </div>
          </div>
        ) : null}
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.workspaceLabel}>
            <span aria-hidden="true" />
            <p>{eyebrow}</p>
          </div>
          <div className={styles.topbarActions}>
            {pilotMode ? null : <QuickSearch />}
            <span className={pilotMode ? styles.pilotFlag : styles.demoFlag}>
              <i aria-hidden="true" /> {pilotMode ? "Đã kết nối" : "Trực tuyến"}
            </span>
            {pilotMode ? (
              <nav className={styles.pilotSessionControls} aria-label="Điều khiển phiên đăng nhập">
                <a href={`/auth/login?returnTo=${encodeURIComponent(activePath)}`}>Đăng nhập</a>
                <a href={`/auth/logout?returnTo=${encodeURIComponent(activePath)}`}>Đăng xuất</a>
              </nav>
            ) : (
              <DemoRoleSwitcher />
            )}
          </div>
        </header>

        <main className={styles.main} id="noi-dung-chinh">
          <div className={styles.pageHeader}>
            <div className={styles.titleBlock}>
              <h1>{title}</h1>
              {subtitle ? <span>{subtitle}</span> : null}
            </div>
            {headerActions && pilotMode ? (
              <div className={styles.headerActionsSlot}>{headerActions}</div>
            ) : headerActions ? (
              <Can permission={headerPermission}>
                <div className={styles.headerActionsSlot}>{headerActions}</div>
              </Can>
            ) : null}
          </div>
          {pilotMode ? (
            <div className={activePath === "/don-hang" ? styles.pilotBanner : styles.mockBanner} role="note">
              <span className={activePath === "/don-hang" ? styles.pilotBadge : styles.mockBadge}>
                {activePath === "/don-hang" ? "ĐÃ KẾT NỐI" : "TÁC NGHIỆP"}
              </span>
              <p>{activePath === "/don-hang"
                ? "Dữ liệu đơn hàng đã đồng bộ."
                : "Dữ liệu hiển thị theo quyền truy cập."}</p>
            </div>
          ) : null}
          {pilotMode
            ? children
            : <DemoRouteBoundary activePath={activePath}>{children}</DemoRouteBoundary>}
        </main>

        <footer className={styles.footer}>
          <p><strong>KSOps</strong> · Điều hành vận tải tập trung</p>
          <span>{pilotMode ? "Kết nối theo quyền truy cập" : "Dữ liệu cập nhật liên tục"}</span>
        </footer>
      </div>
    </div>
  );
}
