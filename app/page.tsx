import type { Metadata } from "next";
import PortalShell from "./_components/PortalShell";
import DashboardOverview from "./_components/dashboard/DashboardOverview";

export const metadata: Metadata = {
  title: "Tổng quan vận tải · KSOps",
  description: "Bảng điều hành đội xe, đơn vận chuyển và chuyến đi mô phỏng.",
};

export default function HomePage() {
  return (
    <PortalShell
      activePath="/"
      eyebrow="Thứ Sáu, 21 tháng 08, 2026"
      title="Trung tâm điều phối vận tải"
      subtitle="Đội xe, đơn hàng và hành trình theo thời gian thực"
    >
      <DashboardOverview />
    </PortalShell>
  );
}
