"use client";

import type { ReactNode } from "react";
import type { Permission } from "../../../lib/access-control";
import { useDemoAccess } from "./DemoAccessProvider";

type CanProps = {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Presentation-only capability gate for the nghiệp vụ vận hành.
 * It must never replace server-side authorization in a real deployment.
 */
export default function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = useDemoAccess();
  return can(permission) ? children : fallback;
}
