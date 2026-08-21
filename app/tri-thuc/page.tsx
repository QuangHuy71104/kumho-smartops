import type { Metadata } from "next";
import PortalAction from "../_components/PortalAction";
import PortalShell from "../_components/PortalShell";
import KnowledgeClient from "./KnowledgeClient";

export const metadata: Metadata = {
  title: "Kho tri thức",
  description: "Runbook và quy trình vận hành đã chuẩn hóa, sử dụng dữ liệu và ví dụ mô phỏng.",
};

export default function KnowledgePage() {
  return (
    <PortalShell
      activePath="/tri-thuc"
      eyebrow="Knowledge management"
      title="Kho tri thức vận hành"
      subtitle="Runbook có phiên bản, người sở hữu và checklist xác nhận sau xử lý."
      headerActions={<PortalAction href="#danh-sach-runbook">Duyệt runbook</PortalAction>}
    >
      <KnowledgeClient />
    </PortalShell>
  );
}
