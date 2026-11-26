import type { Metadata } from "next";
import PortalShell from "./_components/PortalShell";
import DashboardOverview from "./_components/dashboard/DashboardOverview";

export const metadata: Metadata = {
  title: "Bàn điều hành bán vé · KSOps",
  description: "Theo dõi bán vé, lấp đầy và chuyến xe trong một không gian vận hành.",
};

export default function HomePage() {
  return (
    <PortalShell
      activePath="/"
      eyebrow="Trung tâm bán vé & điều hành"
      title="Bàn điều hành"
      subtitle="Một tài khoản, toàn bộ công việc trong ca."
    >
      <DashboardOverview />
    </PortalShell>
  );
}
