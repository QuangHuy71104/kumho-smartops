"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  PORTAL_ROUTES,
  PORTAL_SECTIONS,
  type PortalPath,
} from "../../../lib/access-control";
import styles from "../PortalShell.module.css";
import { useDemoAccess } from "./DemoAccessProvider";

export default function DemoNavigation({ activePath }: { activePath: PortalPath }) {
  const { can } = useDemoAccess();
  const visibleSections = PORTAL_SECTIONS.map((section) => ({
    ...section,
    routes: PORTAL_ROUTES.filter(
      (route) => route.section === section.id && can(route.viewPermission),
    ),
  })).filter((section) => section.routes.length > 0);

  return (
    <nav className={styles.navigation} aria-label="Điều hướng chính theo vai trò demo">
      {visibleSections.map((section, sectionIndex) => (
        <Fragment key={section.id}>
          <p className={`${styles.navLabel} ${sectionIndex > 0 ? styles.projectLabel : ""}`}>
            {section.label}
          </p>
          <div className={styles.navScroller}>
            {section.routes.map((route) => {
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
        </Fragment>
      ))}
    </nav>
  );
}
