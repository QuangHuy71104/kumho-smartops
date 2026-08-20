import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import MonitoringDashboard from "./MonitoringDashboard";

export const metadata: Metadata = {
  title: "Giám sát dịch vụ",
  description: "Bảng giám sát dịch vụ và mạng hoàn toàn mô phỏng trong KSOps.",
};

export default function MonitoringPage() {
  return (
    <PortalShell
      activePath="/giam-sat"
      eyebrow="Observability demo · Chu kỳ mẫu 30 giây"
      title="Giám sát dịch vụ"
      subtitle="Tín hiệu, cảnh báo và độ sẵn sàng"
    >
      <MonitoringDashboard />
    </PortalShell>
  );
}
