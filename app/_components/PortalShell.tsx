import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { type PortalPath } from "../../lib/access-control";
import { isCustomerAuthConfigured } from "../../lib/supabase/config.ts";
import { getCurrentAppUser } from "../../lib/supabase/server.ts";
import DemoNavigation from "./access/DemoNavigation";
import PilotNavigation from "./access/PilotNavigation";
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

export default async function PortalShell({
  activePath,
  eyebrow,
  title,
  subtitle,
  headerActions,
  children,
}: PortalShellProps) {
  const pilotMode = process.env.KSOPS_MODE === "pilot";
  const supabaseAdminAuth = isCustomerAuthConfigured();
  const appUser = supabaseAdminAuth ? await getCurrentAppUser() : null;
  if (supabaseAdminAuth && appUser?.role !== "admin") {
    redirect(`/quan-tri/dang-nhap?next=${encodeURIComponent(activePath)}`);
  }

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
            {supabaseAdminAuth && appUser ? (
              <div className={styles.operatorProfile}>
                <span><strong>{appUser.displayName}</strong><small>Quản trị viên · KSOps</small></span>
                <form action="/auth/admin/signout" method="post"><button type="submit" aria-label="Đăng xuất quản trị">ĐX</button></form>
              </div>
            ) : pilotMode ? (
              <nav className={styles.pilotSessionControls} aria-label="Điều khiển phiên đăng nhập">
                <a href={`/auth/login?returnTo=${encodeURIComponent(activePath)}`}>Đăng nhập</a>
                <a href={`/auth/logout?returnTo=${encodeURIComponent(activePath)}`}>Đăng xuất</a>
              </nav>
            ) : <div className={styles.operatorProfile}>
              <span><strong>Nhân viên vận hành</strong><small>Ca sáng · Bến Miền Đông</small></span>
              <b aria-label="Tài khoản nhân viên vận hành">NV</b>
            </div>}
          </div>
        </header>

        <main className={styles.main} id="noi-dung-chinh">
          <div className={styles.pageHeader}>
            <div className={styles.titleBlock}>
              <h1>{title}</h1>
              {subtitle ? <span>{subtitle}</span> : null}
            </div>
            {headerActions ? <div className={styles.headerActionsSlot}>{headerActions}</div> : null}
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
          {children}
        </main>

        <footer className={styles.footer}>
          <p><strong>KSOps</strong> · Điều hành vận tải tập trung</p>
          <span>{pilotMode ? "Kết nối theo quyền truy cập" : "Dữ liệu cập nhật liên tục"}</span>
        </footer>
      </div>
    </div>
  );
}
