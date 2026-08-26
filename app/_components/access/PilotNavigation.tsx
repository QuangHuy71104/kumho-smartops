"use client";

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";
import {
  PORTAL_ROUTES,
  PORTAL_SECTIONS,
  type PortalPath,
} from "../../../lib/access-control";
import styles from "../PortalShell.module.css";

/**
 * This navigation is intentionally not permission-filtered. It describes which
 * slice is connected to the pilot backend; API authorization remains decisive.
 */
export default function PilotNavigation({ activePath }: { activePath: PortalPath }) {
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    const activeItem = navigationRef.current?.querySelector<HTMLElement>("[aria-current='page']");
    activeItem?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
  }, [activePath]);

  return (
    <nav ref={navigationRef} className={styles.navigation} aria-label="Điều hướng môi trường kết nối">
      {PORTAL_SECTIONS.map((section, sectionIndex) => (
        <Fragment key={section.id}>
          <p className={`${styles.navLabel} ${sectionIndex > 0 ? styles.projectLabel : ""}`}>
            {section.label}
          </p>
          <div className={styles.navScroller}>
            {PORTAL_ROUTES.filter((route) => route.section === section.id).map((route) => {
              const isActive = route.path === activePath;
              const isCargoPilot = route.path === "/don-hang";
              return (
                <Link
                  className={isActive ? styles.navItemActive : styles.navItem}
                  href={route.path}
                  key={route.path}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className={styles.navIcon} aria-hidden="true">{route.short}</span>
                  <span className={styles.pilotNavCopy}>
                    <span>{route.label}</span>
                    <small className={isCargoPilot ? styles.pilotNavLive : styles.pilotNavMock}>
                      {isCargoPilot ? "Đã kết nối" : "Tác nghiệp"}
                    </small>
                  </span>
                </Link>
              );
            })}
          </div>
        </Fragment>
      ))}
    </nav>
  );
}
