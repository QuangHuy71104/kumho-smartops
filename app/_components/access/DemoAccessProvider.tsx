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
  DEMO_ROLE_STORAGE_KEY,
  decodeDemoRole,
  demoRoleCan,
  type DemoRole,
  type DemoRoleId,
  type Permission,
} from "../../../lib/access-control";
import { useLocalStorageState } from "../../_hooks/useLocalStorageState";

type DemoAccessContextValue = {
  roleId: DemoRoleId;
  role: DemoRole;
  selectRole: (roleId: DemoRoleId) => void;
  can: (permission: Permission) => boolean;
};

const DemoAccessContext = createContext<DemoAccessContextValue | null>(null);

export default function DemoAccessProvider({ children }: { children: ReactNode }) {
  const [roleId, setRoleId] = useLocalStorageState({
    key: DEMO_ROLE_STORAGE_KEY,
    initialValue: DEFAULT_DEMO_ROLE,
    decode: decodeDemoRole,
  });

  const selectRole = useCallback((nextRoleId: DemoRoleId) => {
    setRoleId(nextRoleId);
  }, [setRoleId]);

  const can = useCallback(
    (permission: Permission) => demoRoleCan(roleId, permission),
    [roleId],
  );

  const value = useMemo<DemoAccessContextValue>(() => ({
    roleId,
    role: DEMO_ROLES[roleId],
    selectRole,
    can,
  }), [can, roleId, selectRole]);

  return <DemoAccessContext.Provider value={value}>{children}</DemoAccessContext.Provider>;
}

export function useDemoAccess() {
  const context = useContext(DemoAccessContext);
  if (!context) {
    throw new Error("useDemoAccess must be used within DemoAccessProvider");
  }
  return context;
}
