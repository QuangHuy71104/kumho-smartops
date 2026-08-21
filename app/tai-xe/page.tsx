import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import DriversDashboard from "./_components/DriversDashboard";

export const metadata: Metadata = {
  title: "Điều hành tài xế",
  description: "Lịch ca, khả năng sẵn sàng và hồ sơ tuân thủ tài xế bằng dữ liệu mô phỏng.",
};

export default function DriversPage() {
  return (
    <PortalShell
      activePath="/tai-xe"
      eyebrow="Driver operations · Hồ sơ demo"
      title="Điều hành tài xế"
      subtitle="Xếp ca, kiểm soát giấy tờ và mức độ sẵn sàng của đội ngũ mẫu."
    >
      <DriversDashboard />
    </PortalShell>
  );
}
