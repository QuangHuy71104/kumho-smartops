import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import WorkCenterClient from "./_components/WorkCenterClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Công việc của tôi",
  description: "Hàng đợi tác nghiệp, phối hợp liên phòng ban và theo dõi SLA theo vai trò.",
};

export default function WorkCenterPage() {
  return (
    <PortalShell
      activePath="/cong-viec"
      eyebrow="Không gian làm việc"
      title="Công việc của tôi"
      subtitle="Tập trung vào việc cần làm, cập nhật kết quả ngay tại đây."
    >
      <WorkCenterClient />
    </PortalShell>
  );
}
