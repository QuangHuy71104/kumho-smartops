import type { Metadata } from "next";
import PortalAction from "../_components/PortalAction";
import PortalShell from "../_components/PortalShell";
import TicketBookingClient from "./_components/TicketBookingClient";

export const metadata: Metadata = {
  title: "Vé hành khách",
  description: "Tra cứu chuyến, chọn ghế và tạo bản ghi đặt chỗ hoàn toàn mô phỏng.",
};

export default function PassengerTicketsPage() {
  return (
    <PortalShell
      activePath="/ve-xe"
      eyebrow="Kinh doanh hành khách · Dữ liệu mô phỏng"
      title="Vé hành khách"
      subtitle="Tra cứu chuyến, chọn ghế và giữ chỗ demo trên thiết bị này"
      headerActions={<PortalAction href="#dat-cho-demo">Đặt chỗ demo</PortalAction>}
    >
      <TicketBookingClient />
    </PortalShell>
  );
}
