import type { Metadata } from "next";
import PortalAction from "../_components/PortalAction";
import PortalShell from "../_components/PortalShell";
import IncidentsClient from "./IncidentsClient";

export const metadata: Metadata = {
  title: "Quản lý sự cố",
  description: "Quản lý ticket, SLA và luồng xử lý sự cố bằng dữ liệu hoàn toàn mô phỏng.",
};

export default function IncidentsPage() {
  return (
    <PortalShell
      activePath="/su-co"
      eyebrow="IT Service Management"
      title="Sự cố & yêu cầu"
      subtitle="Tiếp nhận, ưu tiên và theo dõi SLA trong một luồng thống nhất."
      headerActions={<PortalAction href="#tao-su-co">+ Tạo sự cố</PortalAction>}
    >
      <IncidentsClient />
    </PortalShell>
  );
}
