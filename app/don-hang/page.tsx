import type { Metadata } from "next";
import { Suspense } from "react";
import PortalShell from "../_components/PortalShell";
import OrderWorkspace from "./_components/OrderWorkspace";
import PilotOrderWorkspace from "./_components/PilotOrderWorkspace";

export const dynamic = "force-dynamic";

export function resolveCargoWorkspaceMode(value: string | undefined) {
  return value === "pilot" ? "pilot" as const : "demo" as const;
}

export function generateMetadata(): Metadata {
  const mode = resolveCargoWorkspaceMode(process.env.KSOPS_MODE);
  return {
    title: "Quản lý đơn vận tải",
    description: mode === "pilot"
      ? "Không gian pilot vận hành đơn hàng hóa với SSO, phân quyền nội bộ và PostgreSQL."
      : "Không gian quản lý đơn hàng hóa, tuyến tỉnh và last-mile bằng dữ liệu mô phỏng.",
  };
}

export default function TransportOrdersPage() {
  const mode = resolveCargoWorkspaceMode(process.env.KSOPS_MODE);

  return (
    <PortalShell
      activePath="/don-hang"
      eyebrow={mode === "pilot"
        ? "Vận hành đơn hàng · Pilot có kiểm soát"
        : "Vận hành đơn hàng · Phiên mô phỏng 21/08/2026"}
      title="Quản lý đơn vận tải"
      subtitle={mode === "pilot"
        ? "Cargo slice dùng SSO và PostgreSQL · các phân hệ khác vẫn là mẫu"
        : "SLA, tuyến hàng hóa và giao chặng cuối"}
    >
      {mode === "pilot" ? (
        <PilotOrderWorkspace />
      ) : (
        <Suspense fallback={<p role="status">Đang chuẩn bị không gian đơn hàng…</p>}>
          <OrderWorkspace />
        </Suspense>
      )}
    </PortalShell>
  );
}
