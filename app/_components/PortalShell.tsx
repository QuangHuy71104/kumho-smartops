import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./PortalShell.module.css";

const navigation = [
  { short: "TQ", label: "Tổng quan", href: "/" },
  { short: "TS", label: "Tài sản", href: "/tai-san" },
  { short: "SC", label: "Sự cố", href: "/su-co" },
  { short: "BT", label: "Bảo trì", href: "/bao-tri" },
  { short: "GS", label: "Giám sát", href: "/giam-sat" },
  { short: "TT", label: "Tri thức", href: "/tri-thuc" },
] as const;

type PortalShellProps = {
  activePath: string;
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
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#noi-dung-chinh">
        Bỏ qua điều hướng
      </a>

      <aside className={styles.sidebar} aria-label="Điều hướng KSOps">
        <Link className={styles.brand} href="/" aria-label="KSOps - Trang tổng quan">
          <span className={styles.brandMark} aria-hidden="true">KS</span>
          <span className={styles.brandCopy}>
            <strong>KSOps</strong>
            <small>IT Service Hub</small>
          </span>
        </Link>

        <div className={styles.environmentPill}>
          <span className={styles.pulseDot} aria-hidden="true" />
          Bản demo thực tập
        </div>

        <nav className={styles.navigation} aria-label="Điều hướng chính">
          <p className={styles.navLabel}>Vận hành</p>
          <div className={styles.navScroller}>
            {navigation.map((item) => {
              const isActive = item.href === activePath;
              return (
                <Link
                  className={isActive ? styles.navItemActive : styles.navItem}
                  href={item.href}
                  key={item.href}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className={styles.navIcon} aria-hidden="true">{item.short}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <p className={`${styles.navLabel} ${styles.projectLabel}`}>Dự án</p>
          <Link
            className={activePath === "/ke-hoach" ? styles.navItemActive : styles.navItem}
            href="/ke-hoach"
            aria-current={activePath === "/ke-hoach" ? "page" : undefined}
          >
            <span className={styles.navIcon} aria-hidden="true">KH</span>
            <span>Kế hoạch</span>
          </Link>
        </nav>

        <div className={styles.safetyNote}>
          <span className={styles.shield} aria-hidden="true">✓</span>
          <div>
            <strong>Dữ liệu an toàn</strong>
            <p>Mọi mã, vị trí và chỉ số đều được tạo riêng cho bản demo.</p>
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
            {headerActions ? <div className={styles.headerActionsSlot}>{headerActions}</div> : null}
            <Link className={styles.quickSearch} href="/tai-san" aria-label="Mở trang tìm kiếm tài sản">
              <span aria-hidden="true">⌕</span>
              <span>Tìm nhanh</span>
              <kbd>Ctrl K</kbd>
            </Link>
            <span className={styles.demoFlag}>
              <i aria-hidden="true" /> Demo
            </span>
            <button className={styles.avatar} type="button" aria-label="Tài khoản Demo Admin">
              DA
            </button>
          </div>
        </header>

        <main className={styles.main} id="noi-dung-chinh">
          <div className={styles.mockBanner} role="note">
            <span className={styles.mockBadge}>MOCK DATA</span>
            <p>
              <strong>Môi trường trình diễn độc lập.</strong> Không kết nối, đọc hoặc hiển thị dữ liệu hạ tầng thực tế của doanh nghiệp.
            </p>
          </div>
          {children}
        </main>

        <footer className={styles.footer}>
          <p><strong>KSOps</strong> · Đồ án thực tập lập trình viên, không phải hệ thống chính thức.</p>
          <span>Demo build 1.0</span>
        </footer>
      </div>
    </div>
  );
}
