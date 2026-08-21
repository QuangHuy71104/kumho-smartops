import type { Metadata } from "next";
import PortalAction from "../_components/PortalAction";
import PortalShell from "../_components/PortalShell";
import CustomerCrmClient from "./_components/CustomerCrmClient";

export const metadata: Metadata = {
  title: "Khách hàng vận tải",
  description: "CRM khách hàng cá nhân và doanh nghiệp với lịch sử đơn, satisfaction và risk mô phỏng.",
};

export default function CustomersPage() {
  return (
    <PortalShell
      activePath="/khach-hang"
      eyebrow="Customer operations · Hồ sơ synthetic"
      title="Khách hàng"
      subtitle="Phân khúc, chất lượng dịch vụ và lịch sử đơn trên một màn hình"
      headerActions={<PortalAction href="#danh-sach-khach-hang">Xem danh sách</PortalAction>}
    >
      <CustomerCrmClient />
    </PortalShell>
  );
}
