import type { Metadata } from "next";
import PortalAction from "../_components/PortalAction";
import PortalShell from "../_components/PortalShell";
import PlanContent from "./_components/PlanContent";

export const metadata: Metadata = {
  title: "Kế hoạch phát triển",
  description: "Roadmap 12 tuần, kiến trúc mục tiêu, quản trị rủi ro và tiêu chí bàn giao KSOps.",
};

export default function RoadmapPage() {
  return (
    <PortalShell
      activePath="/ke-hoach"
      eyebrow="Delivery blueprint"
      title="Kế hoạch phát triển 12 tuần"
      subtitle="Từ prototype thực tập đến pilot có thể đánh giá trong môi trường doanh nghiệp."
      headerActions={<PortalAction href="#roadmap">Xem roadmap</PortalAction>}
    >
      <PlanContent />
    </PortalShell>
  );
}
