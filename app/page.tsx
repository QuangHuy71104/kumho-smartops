import type { Metadata } from "next";
import PortalShell from "./_components/PortalShell";
import DashboardOverview from "./_components/dashboard/DashboardOverview";

export const metadata: Metadata = {
  title: "Tổng quan · KSOps",
  description: "Bảng điều hành IT Ops mô phỏng dành cho đồ án thực tập lập trình viên.",
};

export default function HomePage() {
  return (
    <PortalShell
      activePath="/"
      eyebrow="Thứ Sáu, 21 tháng 08, 2026"
      title="Trung tâm điều hành IT"
      subtitle="Tình trạng vận hành tổng hợp"
    >
      <DashboardOverview />
    </PortalShell>
  );
}
