import type { Metadata } from "next";
import PortalAction from "../_components/PortalAction";
import PortalShell from "../_components/PortalShell";
import MaintenanceClient from "./MaintenanceClient";

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
      headerActions={<PortalAction href="#lich-cong-viec" variant="secondary">Xem lịch tháng</PortalAction>}
    >
      <MaintenanceClient />
    </PortalShell>
  );
}
