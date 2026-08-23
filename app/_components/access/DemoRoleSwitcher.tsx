"use client";

import {
  DEMO_ROLE_IDS,
  DEMO_ROLES,
  decodeDemoRole,
} from "../../../lib/access-control";
import styles from "../PortalShell.module.css";
import { useDemoAccess } from "./DemoAccessProvider";

export default function DemoRoleSwitcher() {
  const { role, roleId, selectRole } = useDemoAccess();

  return (
    <div className={styles.demoRoleControl}>
      <label className={styles.demoRoleSwitcher} htmlFor="role-selector">
        <span>Vai trò làm việc</span>
        <select
          id="role-selector"
          value={roleId}
          aria-describedby="role-disclaimer"
          onChange={(event) => {
            const nextRole = decodeDemoRole(event.target.value);
            if (nextRole) selectRole(nextRole);
          }}
        >
          {DEMO_ROLE_IDS.map((id) => (
            <option value={id} key={id}>{DEMO_ROLES[id].label}</option>
          ))}
        </select>
        <small id="role-disclaimer">Phạm vi: {role.scopeLabel}</small>
      </label>
      <span
        className={styles.avatar}
        title={`${role.label} · ${role.department}`}
        aria-label={`Vai trò hiện tại: ${role.label}`}
      >
        {role.short}
      </span>
    </div>
  );
}
