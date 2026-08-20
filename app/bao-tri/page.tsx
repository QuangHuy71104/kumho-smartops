import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import MaintenanceClient from "./MaintenanceClient";
import styles from "./Maintenance.module.css";

export const metadata: Metadata = {
  title: "Lịch bảo trì",
  description: "Lập lịch, checklist và theo dõi công việc bảo trì CNTT bằng dữ liệu mô phỏng.",
};

export default function MaintenancePage() {
  return (
    <PortalShell
      activePath="/bao-tri"
      eyebrow="Preventive maintenance"
      title="Bảo trì & thay đổi"
      subtitle="Quản lý lịch định kỳ, cửa sổ thay đổi và bằng chứng nghiệm thu."
      headerActions={<a className={styles.headerButton} href="#lich-cong-viec">Xem lịch tháng</a>}
    >
      <MaintenanceClient />
    </PortalShell>
  );
}
