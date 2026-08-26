import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import FleetDashboard from "./_components/FleetDashboard";

export const metadata: Metadata = {
  title: "Quản lý đội xe",
  description: "Bảng điều hành phương tiện, trạng thái khai thác và kế hoạch bảo dưỡng đội xe.",
};

export default function FleetPage() {
  return (
    <PortalShell
      activePath="/doi-xe"
      eyebrow="Điều hành phương tiện"
      title="Quản lý đội xe"
      subtitle="Sẵn sàng · Khai thác · Bảo dưỡng"
    >
      <FleetDashboard />
    </PortalShell>
  );
}
