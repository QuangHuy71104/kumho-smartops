import type { Metadata } from "next";
import PortalShell from "../_components/PortalShell";
import AssetInventory from "./AssetInventory";

export const metadata: Metadata = {
  title: "Quản lý tài sản",
  description: "Danh mục tài sản CNTT mô phỏng trong cổng KSOps.",
};

export default function AssetPage() {
  return (
    <PortalShell
      activePath="/tai-san"
      eyebrow="CMDB mô phỏng · Cập nhật 08:42, 21/08/2026"
      title="Quản lý tài sản"
      subtitle="Danh mục thiết bị và vòng đời"
    >
      <AssetInventory />
    </PortalShell>
  );
}
