"use client";

import {
  DEMO_ROLE_IDS,
  DEMO_ROLES,
  decodeDemoRole,
  type DemoRoleId,
} from "../../../lib/access-control";
import styles from "../PortalShell.module.css";
import { useDemoAccess } from "./DemoAccessProvider";

const PRIMARY_ROLE_IDS = new Set<DemoRoleId>([
  "dispatcher",
  "operations-manager",
  "auditor",
]);

const presentationRoles = DEMO_ROLE_IDS.filter((id) => PRIMARY_ROLE_IDS.has(id));
const specialistRoles = DEMO_ROLE_IDS.filter((id) => !PRIMARY_ROLE_IDS.has(id));

export default function DemoRoleSwitcher() {
  const { role, roleId, selectRole } = useDemoAccess();

  return (
    <div className={styles.demoRoleControl}>
      <label className={styles.demoRoleSwitcher} htmlFor="role-selector">
        <span>Chế độ vai trò</span>
        <select
          id="role-selector"
          value={roleId}
          aria-describedby="role-disclaimer"
          onChange={(event) => {
            const nextRole = decodeDemoRole(event.target.value);
            if (nextRole) selectRole(nextRole);
          }}
        >
          <optgroup label="Vai trò trình bày">
            {presentationRoles.map((id) => (
              <option value={id} key={id}>{DEMO_ROLES[id].label}</option>
            ))}
          </optgroup>
          <optgroup label="Vai trò chuyên môn">
            {specialistRoles.map((id) => (
              <option value={id} key={id}>{DEMO_ROLES[id].label}</option>
            ))}
          </optgroup>
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
