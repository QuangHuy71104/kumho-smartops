import type { Metadata } from "next";
import PortalAction from "../_components/PortalAction";
import PortalShell from "../_components/PortalShell";
import ContractPipelineClient from "./_components/ContractPipelineClient";

export const metadata: Metadata = {
  title: "Hợp đồng thuê xe",
  description: "Pipeline yêu cầu báo giá và thuê xe bằng dữ liệu đoàn, xe và hành trình mô phỏng.",
};

export default function VehicleContractsPage() {
  return (
    <PortalShell
      activePath="/hop-dong"
      eyebrow="Kinh doanh hợp đồng · Pipeline demo"
      title="Hợp đồng xe"
      subtitle="Tiếp nhận nhu cầu đoàn, lập phương án xe và theo dõi báo giá"
      headerActions={<PortalAction href="#tao-yeu-cau">+ Yêu cầu báo giá</PortalAction>}
    >
      <ContractPipelineClient />
    </PortalShell>
  );
}
