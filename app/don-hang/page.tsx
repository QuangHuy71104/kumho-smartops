import type { Metadata } from "next";
import { Suspense } from "react";
import PortalShell from "../_components/PortalShell";
import OrderWorkspace from "./_components/OrderWorkspace";
import PilotOrderWorkspace from "./_components/PilotOrderWorkspace";

export const dynamic = "force-dynamic";

function resolveCargoWorkspaceMode(value: string | undefined) {
  return value === "pilot" ? "pilot" as const : "demo" as const;
}

export function generateMetadata(): Metadata {
  const mode = resolveCargoWorkspaceMode(process.env.KSOPS_MODE);
  return {
    title: "Quản lý đơn vận tải",
    description: mode === "pilot"
      ? "Không gian vận hành đơn hàng hóa theo quyền truy cập nội bộ."
      : "Không gian quản lý đơn hàng hóa, tuyến tỉnh và giao chặng cuối.",
  };
}

export default function TransportOrdersPage() {
  const mode = resolveCargoWorkspaceMode(process.env.KSOPS_MODE);

  return (
    <PortalShell
      activePath="/don-hang"
      eyebrow={mode === "pilot"
        ? "Đơn hàng theo quyền truy cập"
        : "Vận hành đơn hàng"}
      title="Quản lý đơn vận tải"
      subtitle={mode === "pilot"
        ? "Dữ liệu theo phạm vi của bạn"
        : "SLA · Tuyến · Giao chặng cuối"}
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
