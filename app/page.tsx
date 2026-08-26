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
      eyebrow="Hôm nay"
      title="Tổng quan vận hành"
      subtitle="Đội xe · Đơn hàng · Hành trình"
    >
      <DashboardOverview />
    </PortalShell>
  );
}
