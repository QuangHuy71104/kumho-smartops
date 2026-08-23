import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import ReportsDashboard from "./ReportsDashboard";

export const metadata: Metadata = {
  title: "Báo cáo vận tải",
  description: "Phân tích doanh thu, hiệu suất đội xe, đúng giờ và trải nghiệm khách hàng bằng dữ liệu vận hành.",
};

export default function ReportsPage() {
  return (
    <PortalShell activePath="/bao-cao" eyebrow="Kiểm soát vận hành" title="Báo cáo" subtitle="KPI và khuyến nghị điều hành">
      <ReportsDashboard />
    </PortalShell>
  );
}
