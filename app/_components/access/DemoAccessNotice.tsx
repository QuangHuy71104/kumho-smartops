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
        <h2 id="access-title">Bạn chưa có quyền truy cập {routeLabel}</h2>
        <p>Liên hệ quản trị viên nếu cần thêm quyền.</p>
        <dl>
          <div><dt>Phòng ban</dt><dd>{role.department}</dd></div>
          <div><dt>Phạm vi dữ liệu</dt><dd>{role.scopeLabel}</dd></div>
        </dl>
        <Link href={fallbackPath}>Về trang được phép</Link>
      </div>
    </section>
  );
}
