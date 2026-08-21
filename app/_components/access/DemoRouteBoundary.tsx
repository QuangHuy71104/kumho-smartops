"use client";

import type { ReactNode } from "react";
import {
  firstAccessiblePortalPath,
  portalRouteFor,
  type PortalPath,
} from "../../../lib/access-control";
import DemoAccessNotice from "./DemoAccessNotice";
import { useDemoAccess } from "./DemoAccessProvider";

type DemoRouteBoundaryProps = {
  activePath: PortalPath;
  children: ReactNode;
};

/**
 * Demo-only UI boundary. The children are server-rendered synthetic content, so
 * this component must not be treated as a security boundary for production data.
 */
export default function DemoRouteBoundary({
  activePath,
  children,
}: DemoRouteBoundaryProps) {
  const { can, role, roleId } = useDemoAccess();
  const route = portalRouteFor(activePath);

  if (can(route.viewPermission)) return children;

  return (
    <DemoAccessNotice
      role={role}
      routeLabel={route.label}
      fallbackPath={firstAccessiblePortalPath(roleId)}
    />
  );
}
