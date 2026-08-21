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
    <section className={styles.accessNotice} aria-labelledby="demo-access-title">
      <span className={styles.accessNoticeIcon} aria-hidden="true">RB</span>
      <div>
        <p>Phạm vi vai trò mô phỏng</p>
        <h2 id="demo-access-title">{role.label} không sử dụng phân hệ {routeLabel}</h2>
        <p>
          Navigation được lọc theo nghiệp vụ để trình diễn operating model. Đây chỉ là
          kiểm soát giao diện demo, không phải cơ chế xác thực hoặc phân quyền production.
        </p>
        <dl>
          <div><dt>Phòng ban</dt><dd>{role.department}</dd></div>
          <div><dt>Phạm vi mẫu</dt><dd>{role.scopeLabel}</dd></div>
        </dl>
        <Link href={fallbackPath}>Mở phân hệ được phép đầu tiên</Link>
      </div>
    </section>
  );
}
