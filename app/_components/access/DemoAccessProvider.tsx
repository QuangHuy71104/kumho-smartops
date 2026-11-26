"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  DEFAULT_DEMO_ROLE,
  DEMO_ROLES,
  demoRoleCan,
  type DemoRole,
  type DemoRoleId,
  type Permission,
} from "../../../lib/access-control";

type DemoAccessContextValue = {
  roleId: DemoRoleId;
  role: DemoRole;
  can: (permission: Permission) => boolean;
};

const DemoAccessContext = createContext<DemoAccessContextValue | null>(null);

export default function DemoAccessProvider({ children }: { children: ReactNode }) {
  const roleId = DEFAULT_DEMO_ROLE;

  const can = useCallback(
    (permission: Permission) => demoRoleCan(roleId, permission),
    [roleId],
  );

  const value = useMemo<DemoAccessContextValue>(() => ({
    roleId,
    role: DEMO_ROLES[roleId],
    can,
  }), [can, roleId]);

  return <DemoAccessContext.Provider value={value}>{children}</DemoAccessContext.Provider>;
}

export function useDemoAccess() {
  const context = useContext(DemoAccessContext);
  if (!context) {
    throw new Error("useDemoAccess must be used within DemoAccessProvider");
  }
  return context;
}
