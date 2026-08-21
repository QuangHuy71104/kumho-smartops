import type { ReactNode } from "react";
import Link from "next/link";
import { portalRouteFor, type PortalPath } from "../../lib/access-control";
import Can from "./access/Can";
import DemoNavigation from "./access/DemoNavigation";
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
          Trung tâm điều phối demo
        </div>

        <DemoNavigation activePath={activePath} />

        <div className={styles.safetyNote}>
          <span className={styles.shield} aria-hidden="true">✓</span>
          <div>
            <strong>Dữ liệu mô phỏng</strong>
            <p>Không sử dụng thông tin xe, khách hàng hoặc hành trình thực tế.</p>
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
            {headerActions ? (
              <Can permission={headerPermission}>
                <div className={styles.headerActionsSlot}>{headerActions}</div>
              </Can>
            ) : null}
            <QuickSearch />
            <span className={styles.demoFlag}>
              <i aria-hidden="true" /> Demo
            </span>
            <DemoRoleSwitcher />
          </div>
        </header>

        <main className={styles.main} id="noi-dung-chinh">
          <div className={styles.mockBanner} role="note">
            <span className={styles.mockBadge}>MOCK DATA</span>
            <p>
              <strong>Môi trường trình diễn độc lập.</strong> Toàn bộ xe, tài xế, khách hàng, hành trình và doanh thu đều là dữ liệu giả lập.
            </p>
          </div>
          <DemoRouteBoundary activePath={activePath}>{children}</DemoRouteBoundary>
        </main>

        <footer className={styles.footer}>
          <p><strong>KSOps Transport Control</strong> · Đồ án thực tập lập trình viên, không phải hệ thống chính thức.</p>
          <span>Fleet & order demo</span>
        </footer>
      </div>
    </div>
  );
}
