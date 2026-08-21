import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import QuickSearch from "./QuickSearch";
import styles from "./PortalShell.module.css";

const navigationSections = [
  {
    label: "Trung tâm vận hành",
    items: [
      { short: "TQ", label: "Tổng quan", href: "/" },
      { short: "ĐH", label: "Đơn hàng", href: "/don-hang" },
      { short: "ĐP", label: "Điều phối", href: "/dieu-phoi" },
      { short: "DX", label: "Đội xe", href: "/doi-xe" },
      { short: "TX", label: "Tài xế", href: "/tai-xe" },
    ],
  },
  {
    label: "Kinh doanh & dịch vụ",
    items: [
      { short: "VX", label: "Vé hành khách", href: "/ve-xe" },
      { short: "HĐ", label: "Hợp đồng xe", href: "/hop-dong" },
      { short: "KH", label: "Khách hàng", href: "/khach-hang" },
    ],
  },
  {
    label: "Kiểm soát",
    items: [
      { short: "BD", label: "Bảo dưỡng", href: "/bao-duong" },
      { short: "TC", label: "Tài chính", href: "/tai-chinh" },
      { short: "BC", label: "Báo cáo", href: "/bao-cao" },
    ],
  },
] as const;

type PortalPath = (typeof navigationSections)[number]["items"][number]["href"];

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

        <nav className={styles.navigation} aria-label="Điều hướng chính">
          {navigationSections.map((section, sectionIndex) => (
            <Fragment key={section.label}>
              <p className={`${styles.navLabel} ${sectionIndex > 0 ? styles.projectLabel : ""}`}>
                {section.label}
              </p>
              <div className={styles.navScroller}>
                {section.items.map((item) => {
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
            </Fragment>
          ))}
        </nav>

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
            {headerActions ? <div className={styles.headerActionsSlot}>{headerActions}</div> : null}
            <QuickSearch />
            <span className={styles.demoFlag}>
              <i aria-hidden="true" /> Demo
            </span>
            <span className={styles.avatar} title="Điều phối viên mẫu" aria-label="Điều phối viên mẫu">
              ĐP
            </span>
          </div>
        </header>

        <main className={styles.main} id="noi-dung-chinh">
          <div className={styles.mockBanner} role="note">
            <span className={styles.mockBadge}>MOCK DATA</span>
            <p>
              <strong>Môi trường trình diễn độc lập.</strong> Toàn bộ xe, tài xế, khách hàng, hành trình và doanh thu đều là dữ liệu giả lập.
            </p>
          </div>
          {children}
        </main>

        <footer className={styles.footer}>
          <p><strong>KSOps Transport Control</strong> · Đồ án thực tập lập trình viên, không phải hệ thống chính thức.</p>
          <span>Fleet & order demo</span>
        </footer>
      </div>
    </div>
  );
}
