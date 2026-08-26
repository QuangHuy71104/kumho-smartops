import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import MaintenanceDashboard from "./_components/MaintenanceDashboard";

export const metadata: Metadata = {
  title: "Bảo dưỡng đội xe",
  description: "Lịch bảo dưỡng, cảnh báo quãng đường và lệnh công việc kỹ thuật của đội xe.",
};

export default function MaintenancePage() {
  return (
    <PortalShell
      activePath="/bao-duong"
      eyebrow="Điều hành kỹ thuật"
      title="Bảo dưỡng đội xe"
      subtitle="Quãng đường · Lịch xưởng · Kiểm tra"
    >
      <MaintenanceDashboard />
    </PortalShell>
  );
}
