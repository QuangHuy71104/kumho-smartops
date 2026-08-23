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
      eyebrow="Fleet control · Cập nhật 08:42"
      title="Quản lý đội xe"
      subtitle="Theo dõi khả năng sẵn sàng, khai thác và bảo dưỡng phương tiện"
    >
      <FleetDashboard />
    </PortalShell>
  );
}
