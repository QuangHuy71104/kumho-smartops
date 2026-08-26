import type { Metadata } from "next";
import PortalAction from "../_components/PortalAction";
import PortalShell from "../_components/PortalShell";
import ContractPipelineClient from "./_components/ContractPipelineClient";

export const metadata: Metadata = {
  title: "Hợp đồng thuê xe",
  description: "Quy trình tiếp nhận nhu cầu đoàn, lập báo giá và theo dõi hợp đồng thuê xe.",
};

export default function VehicleContractsPage() {
  return (
    <PortalShell
      activePath="/hop-dong"
      eyebrow="Kinh doanh hợp đồng"
      title="Hợp đồng xe"
      subtitle="Nhu cầu · Phương án xe · Báo giá"
      headerActions={<PortalAction href="#tao-yeu-cau">+ Yêu cầu báo giá</PortalAction>}
    >
      <ContractPipelineClient />
    </PortalShell>
  );
}
