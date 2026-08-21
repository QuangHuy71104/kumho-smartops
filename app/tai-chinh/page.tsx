import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import FinanceDashboard from "./FinanceDashboard";

export const metadata: Metadata = {
  title: "Tài chính vận tải",
  description: "Theo dõi doanh thu, công nợ và chi phí khai thác bằng dữ liệu mô phỏng.",
};

export default function FinancePage() {
  return (
    <PortalShell activePath="/tai-chinh" eyebrow="Kiểm soát vận hành" title="Tài chính" subtitle="Doanh thu, công nợ và chi phí theo chuyến">
      <FinanceDashboard />
    </PortalShell>
  );
}
