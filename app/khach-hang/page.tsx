import type { Metadata } from "next";
import PortalAction from "../_components/PortalAction";
import PortalShell from "../_components/PortalShell";
import CustomerCrmClient from "./_components/CustomerCrmClient";

export const metadata: Metadata = {
  title: "Khách hàng vận tải",
  description: "CRM khách hàng cá nhân và doanh nghiệp với lịch sử giao dịch, mức độ hài lòng và rủi ro.",
};

export default function CustomersPage() {
  return (
    <PortalShell
      activePath="/khach-hang"
      eyebrow="Hồ sơ khách hàng"
      title="Khách hàng"
      subtitle="Phân khúc · Dịch vụ · Lịch sử"
      headerActions={<PortalAction href="#danh-sach-khach-hang">Xem danh sách</PortalAction>}
    >
      <CustomerCrmClient />
    </PortalShell>
  );
}
