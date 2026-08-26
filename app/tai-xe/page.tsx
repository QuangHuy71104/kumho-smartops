import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import DriversDashboard from "./_components/DriversDashboard";

export const metadata: Metadata = {
  title: "Điều hành tài xế",
  description: "Lịch ca, khả năng sẵn sàng và hồ sơ tuân thủ của đội ngũ tài xế.",
};

export default function DriversPage() {
  return (
    <PortalShell
      activePath="/tai-xe"
      eyebrow="Nguồn lực vận hành"
      title="Điều hành tài xế"
      subtitle="Ca trực · Hồ sơ · Sẵn sàng"
    >
      <DriversDashboard />
    </PortalShell>
  );
}
