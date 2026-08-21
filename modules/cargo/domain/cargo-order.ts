import { ApplicationError } from "../../shared/application/errors.ts";

export const CARGO_ORDER_STATUSES = [
  "draft",
  "quoted",
  "confirmed",
  "received",
  "loaded",
  "in_transit",
  "arrived",
  "delivered",
  "reconciled",
  "exception",
  "cancelled",
] as const;

export const CARGO_SERVICE_LEVELS = [
  "standard",
  "same_day",
  "express",
  "full_trip",
] as const;

export type CargoOrderStatus = (typeof CARGO_ORDER_STATUSES)[number];
export type CargoServiceLevel = (typeof CARGO_SERVICE_LEVELS)[number];

export type CargoOrder = {
  id: string;
  organizationId: string;
  owningBranchId: string;
  publicCode: string;
  serviceLevel: CargoServiceLevel;
  status: CargoOrderStatus;
  originLocationId: string;
  destinationLocationId: string;
  packageCount: number;
  totalWeightGrams: number;
  declaredValueMinor: number | null;
  currency: string;
  slaDueAt: string;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

const transitionTargets: Record<CargoOrderStatus, readonly CargoOrderStatus[]> = {
  draft: ["quoted", "confirmed", "cancelled"],
  quoted: ["confirmed", "cancelled"],
  confirmed: ["received", "exception", "cancelled"],
  received: ["loaded", "exception", "cancelled"],
  loaded: ["in_transit", "exception"],
  in_transit: ["arrived", "exception"],
  arrived: ["delivered", "exception"],
  delivered: ["reconciled", "exception"],
  reconciled: [],
  exception: ["confirmed", "received", "loaded", "in_transit", "arrived", "delivered", "cancelled"],
  cancelled: [],
};

export function assertCargoOrderInvariants(order: CargoOrder) {
  if (!Number.isInteger(order.packageCount) || order.packageCount < 1 || order.packageCount > 10_000) {
    throw new ApplicationError("VALIDATION_FAILED", "Số kiện hàng không hợp lệ.", { field: "packageCount" });
  }
  if (!Number.isSafeInteger(order.totalWeightGrams) || order.totalWeightGrams < 1 || order.totalWeightGrams > 100_000_000) {
    throw new ApplicationError("VALIDATION_FAILED", "Khối lượng hàng hóa không hợp lệ.", { field: "totalWeightGrams" });
  }
  if (order.declaredValueMinor !== null &&
      (!Number.isSafeInteger(order.declaredValueMinor) || order.declaredValueMinor < 0)) {
    throw new ApplicationError("VALIDATION_FAILED", "Giá trị khai báo không hợp lệ.", { field: "declaredValueMinor" });
  }
  if (!/^[A-Z]{3}$/.test(order.currency)) {
    throw new ApplicationError("VALIDATION_FAILED", "Mã tiền tệ không hợp lệ.", { field: "currency" });
  }
  if (order.originLocationId === order.destinationLocationId) {
    throw new ApplicationError("VALIDATION_FAILED", "Điểm đi và điểm đến phải khác nhau.", { field: "destinationLocationId" });
  }
  if (Number.isNaN(Date.parse(order.slaDueAt)) || Date.parse(order.slaDueAt) <= Date.parse(order.createdAt)) {
    throw new ApplicationError("VALIDATION_FAILED", "Hạn SLA phải sau thời điểm tạo đơn.", { field: "slaDueAt" });
  }
}

export function assertCargoOrderTransition(
  from: CargoOrderStatus,
  to: CargoOrderStatus,
) {
  if (!transitionTargets[from].includes(to)) {
    throw new ApplicationError(
      "INVALID_TRANSITION",
      `Không thể chuyển đơn từ ${from} sang ${to}.`,
      { from, to },
    );
  }
}
