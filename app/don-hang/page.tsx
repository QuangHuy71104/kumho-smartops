import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import OrderWorkspace from "./_components/OrderWorkspace";

export const metadata: Metadata = {
  title: "Quản lý đơn vận tải",
  description: "Không gian quản lý đơn hàng hóa, tuyến tỉnh và last-mile bằng dữ liệu mô phỏng.",
};

export default function TransportOrdersPage() {
  return (
    <PortalShell
      activePath="/don-hang"
      eyebrow="Vận hành đơn hàng · Phiên mô phỏng 21/08/2026"
      title="Quản lý đơn vận tải"
      subtitle="SLA, tuyến hàng hóa và giao chặng cuối"
    >
      <OrderWorkspace />
    </PortalShell>
  );
}
