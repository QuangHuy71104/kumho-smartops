import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import MaintenanceDashboard from "./_components/MaintenanceDashboard";

export const metadata: Metadata = {
  title: "Bảo dưỡng đội xe",
  description: "Lịch bảo dưỡng, cảnh báo quãng đường và work order với dữ liệu vận tải mô phỏng.",
};

export default function MaintenancePage() {
  return (
    <PortalShell
      activePath="/bao-duong"
      eyebrow="Maintenance control · Work order demo"
      title="Bảo dưỡng đội xe"
      subtitle="Chủ động theo quãng đường, lịch xưởng và checklist kỹ thuật mẫu."
    >
      <MaintenanceDashboard />
    </PortalShell>
  );
}
