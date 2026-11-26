"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  PORTAL_ROUTES,
  type PortalPath,
} from "../../../lib/access-control";
import styles from "../PortalShell.module.css";

const OPERATOR_SECTIONS = [
  {
    label: "Bán vé & chuyến xe",
    paths: ["/", "/ve-xe", "/dieu-phoi", "/khach-hang"],
  },
  {
    label: "Khai thác",
    paths: ["/doi-xe", "/tai-xe", "/bao-cao"],
  },
] as const satisfies readonly { label: string; paths: readonly PortalPath[] }[];

export default function DemoNavigation({ activePath }: { activePath: PortalPath }) {
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    const activeItem = navigationRef.current?.querySelector<HTMLElement>("[aria-current='page']");
    activeItem?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
  }, [activePath]);

  return (
    <nav ref={navigationRef} className={styles.navigation} aria-label="Điều hướng nghiệp vụ">
      {OPERATOR_SECTIONS.map((section, sectionIndex) => {
        const routes = section.paths.map((path) => PORTAL_ROUTES.find((route) => route.path === path)).filter((route) => route !== undefined);
        return (
        <div className={styles.navGroup} key={section.label}>
          <p className={`${styles.navLabel} ${sectionIndex > 0 ? styles.projectLabel : ""}`}>
            {section.label}
          </p>
          <div className={styles.navScroller}>
            {routes.map((route) => {
              const isActive = route.path === activePath;
              return (
                <Link
                  className={isActive ? styles.navItemActive : styles.navItem}
                  href={route.path}
                  key={route.path}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className={styles.navIcon} aria-hidden="true">{route.short}</span>
                  <span>{route.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )})}
    </nav>
  );
}
