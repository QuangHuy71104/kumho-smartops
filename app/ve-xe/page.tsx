import type { Metadata } from "next";
import PortalAction from "../_components/PortalAction";
import PortalShell from "../_components/PortalShell";
import TicketBookingClient from "./_components/TicketBookingClient";

export const metadata: Metadata = {
  title: "Bán vé & đặt chỗ",
  description: "Tra cứu chuyến, chọn ghế và quản lý giao dịch bán vé.",
};

export default function PassengerTicketsPage() {
  return (
    <PortalShell
      activePath="/ve-xe"
      eyebrow="Bán vé & hành khách"
      title="Bán vé & đặt chỗ"
      subtitle="Tìm chuyến, chọn ghế và theo dõi giao dịch trong một luồng."
      headerActions={<PortalAction href="#dat-cho">+ Bán vé mới</PortalAction>}
    >
      <TicketBookingClient />
    </PortalShell>
  );
}
