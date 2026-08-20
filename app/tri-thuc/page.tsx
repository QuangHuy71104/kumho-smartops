import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import KnowledgeClient from "./KnowledgeClient";
import styles from "./Knowledge.module.css";

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
      headerActions={<a className={styles.headerButton} href="#danh-sach-runbook">Duyệt runbook</a>}
    >
      <KnowledgeClient />
    </PortalShell>
  );
}
