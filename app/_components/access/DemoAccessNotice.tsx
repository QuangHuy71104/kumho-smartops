"use client";

import Link from "next/link";
import type { DemoRole, PortalPath } from "../../../lib/access-control";
import styles from "../PortalShell.module.css";

type DemoAccessNoticeProps = {
  role: DemoRole;
  routeLabel: string;
  fallbackPath: PortalPath;
};

export default function DemoAccessNotice({
  role,
  routeLabel,
  fallbackPath,
}: DemoAccessNoticeProps) {
  return (
    <section className={styles.accessNotice} aria-labelledby="access-title">
      <span className={styles.accessNoticeIcon} aria-hidden="true">RB</span>
      <div>
        <p>Phạm vi truy cập</p>
        <h2 id="access-title">{role.label} chưa được cấp quyền vào phân hệ {routeLabel}</h2>
        <p>
          Điều hướng được giới hạn theo chức năng và phạm vi công việc của vai trò hiện tại.
        </p>
        <dl>
          <div><dt>Phòng ban</dt><dd>{role.department}</dd></div>
          <div><dt>Phạm vi dữ liệu</dt><dd>{role.scopeLabel}</dd></div>
        </dl>
        <Link href={fallbackPath}>Mở phân hệ được phép đầu tiên</Link>
      </div>
    </section>
  );
}
