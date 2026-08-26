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
      eyebrow="Trung tâm công việc · Theo vai trò"
      title="Công việc của tôi"
      subtitle="Ưu tiên, phối hợp và hoàn thành đầu việc trong ca"
    >
      <WorkCenterClient />
    </PortalShell>
  );
}
