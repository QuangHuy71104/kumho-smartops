import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import FleetDashboard from "./_components/FleetDashboard";

export const metadata: Metadata = {
  title: "Quản lý đội xe",
  description: "Bảng điều hành đội xe vận tải với dữ liệu phương tiện hoàn toàn mô phỏng.",
};

export default function FleetPage() {
  return (
    <PortalShell
      activePath="/doi-xe"
      eyebrow="Fleet control · Dữ liệu giả lập"
      title="Quản lý đội xe"
      subtitle="Theo dõi khả năng sẵn sàng, khai thác và bảo dưỡng phương tiện mẫu."
    >
      <FleetDashboard />
    </PortalShell>
  );
}
