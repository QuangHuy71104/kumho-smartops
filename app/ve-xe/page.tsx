import type { Metadata } from "next";
import PortalAction from "../_components/PortalAction";
import PortalShell from "../_components/PortalShell";
import TicketBookingClient from "./_components/TicketBookingClient";

export const metadata: Metadata = {
  title: "Vé hành khách",
  description: "Tra cứu chuyến, chọn ghế và quản lý đặt chỗ hành khách.",
};

export default function PassengerTicketsPage() {
  return (
    <PortalShell
      activePath="/ve-xe"
      eyebrow="Kinh doanh hành khách · Booking desk"
      title="Vé hành khách"
      subtitle="Tra cứu chuyến, chọn ghế và quản lý đặt chỗ theo hành trình"
      headerActions={<PortalAction href="#dat-cho">Đặt chỗ mới</PortalAction>}
    >
      <TicketBookingClient />
    </PortalShell>
  );
}
