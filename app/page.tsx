import type { Metadata } from "next";
import PortalShell from "./_components/PortalShell";
import DashboardOverview from "./_components/dashboard/DashboardOverview";

export const metadata: Metadata = {
  title: "Tổng quan vận tải · KSOps",
  description: "Bảng điều hành đội xe, đơn vận chuyển và chuyến đi theo thời gian thực.",
};

export default function HomePage() {
  return (
    <PortalShell
      activePath="/"
      eyebrow="Trung tâm điều hành"
      title="Tổng quan vận hành"
      subtitle="Theo dõi chuyến xe, doanh thu và chất lượng dịch vụ hôm nay."
    >
      <DashboardOverview />
    </PortalShell>
  );
}
