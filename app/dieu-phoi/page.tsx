import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import DispatchBoard from "./_components/DispatchBoard";

export const metadata: Metadata = {
  title: "Bảng điều phối vận tải",
  description: "Bảng điều phối chuyến cố định, xe hợp đồng và hàng hóa bằng dữ liệu vận hành.",
};

export default function DispatchPage() {
  return (
    <PortalShell
      activePath="/dieu-phoi"
      eyebrow="Kế hoạch vận hành"
      title="Bảng điều phối vận tải"
      subtitle="Ca trực · Nguồn lực · Xung đột"
    >
      <DispatchBoard />
    </PortalShell>
  );
}
