import { z } from "zod";
import { ApplicationError } from "../../shared/application/errors.ts";
import {
  CARGO_ORDER_STATUSES,
  CARGO_SERVICE_LEVELS,
  type CargoOrder,
} from "../domain/cargo-order.ts";

export const createCargoOrderBodySchema = z.strictObject({
  owningBranchId: z.uuid(),
  serviceLevel: z.enum(CARGO_SERVICE_LEVELS),
  originLocationId: z.uuid(),
  destinationLocationId: z.uuid(),
  packageCount: z.int().min(1).max(10_000),
  totalWeightGrams: z.int().min(1).max(100_000_000),
  declaredValueMinor: z.int().min(0).max(Number.MAX_SAFE_INTEGER).nullable().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/u).default("VND"),
  slaDueAt: z.iso.datetime({ offset: true }),
});

export const transitionCargoOrderBodySchema = z.strictObject({
  toStatus: z.enum(CARGO_ORDER_STATUSES),
  reasonCode: z.string().trim().min(3).max(60).regex(/^[A-Z][A-Z0-9_:-]*$/u),
});

export type CreateCargoOrderBody = z.infer<typeof createCargoOrderBodySchema>;
export type TransitionCargoOrderBody = z.infer<typeof transitionCargoOrderBodySchema>;

export function parseCargoOrderListQuery(url: string) {
  const parameters = new URL(url).searchParams;
  const allowed = new Set(["status", "limit"]);
  for (const key of parameters.keys()) {
    if (!allowed.has(key)) {
      throw new ApplicationError("BAD_REQUEST", `Tham số truy vấn không được hỗ trợ: ${key}.`);
    }
  }
  const rawStatuses = parameters.getAll("status");
  const statusResult = z.array(z.enum(CARGO_ORDER_STATUSES)).max(20).safeParse(rawStatuses);
  const rawLimit = parameters.get("limit") ?? "50";
  const limitResult = z.coerce.number().int().min(1).max(100).safeParse(rawLimit);
  if (!statusResult.success || !limitResult.success) {
    throw new ApplicationError("BAD_REQUEST", "Bộ lọc danh sách đơn hàng không hợp lệ.");
  }
  return {
    statuses: statusResult.data.length ? statusResult.data : undefined,
    limit: limitResult.data,
  } as const;
}

export function requireCargoOrderId(value: string) {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new ApplicationError("BAD_REQUEST", "Mã định danh đơn hàng không hợp lệ.");
  return result.data;
}

export function parseCreateCargoOrderBody(value: unknown): CreateCargoOrderBody {
  const result = createCargoOrderBodySchema.safeParse(value);
  if (!result.success) {
    throw new ApplicationError("VALIDATION_FAILED", "Payload tạo đơn hàng không hợp lệ.", {
      fields: result.error.issues.map((issue) => issue.path.join(".")).filter(Boolean),
    });
  }
  return result.data;
}

export function parseTransitionCargoOrderBody(value: unknown): TransitionCargoOrderBody {
  const result = transitionCargoOrderBodySchema.safeParse(value);
  if (!result.success) {
    throw new ApplicationError("VALIDATION_FAILED", "Payload chuyển trạng thái không hợp lệ.", {
      fields: result.error.issues.map((issue) => issue.path.join(".")).filter(Boolean),
    });
  }
  return result.data;
}

export function requireIdempotencyKey(value: string | null) {
  const key = value?.trim() ?? "";
  if (key.length < 16 || key.length > 200 || !/^[A-Za-z0-9._:-]+$/u.test(key)) {
    throw new ApplicationError(
      "BAD_REQUEST",
      "Header Idempotency-Key phải có 16–200 ký tự an toàn.",
    );
  }
  return key;
}

export function cargoOrderEtag(version: number) {
  return `"cargo-order-v${version}"`;
}

export function requireCargoOrderVersion(value: string | null) {
  if (!value) {
    throw new ApplicationError(
      "PRECONDITION_REQUIRED",
      "Thiếu If-Match; hãy tải lại đơn hàng trước khi cập nhật.",
    );
  }
  const match = /^"cargo-order-v([1-9][0-9]*)"$/u.exec(value.trim());
  const version = match ? Number(match[1]) : Number.NaN;
  if (!Number.isSafeInteger(version)) {
    throw new ApplicationError("BAD_REQUEST", "Header If-Match không hợp lệ.");
  }
  return version;
}

export function presentCargoOrder(order: CargoOrder) {
  return {
    id: order.id,
    publicCode: order.publicCode,
    owningBranchId: order.owningBranchId,
    serviceLevel: order.serviceLevel,
    status: order.status,
    originLocationId: order.originLocationId,
    destinationLocationId: order.destinationLocationId,
    packageCount: order.packageCount,
    totalWeightGrams: order.totalWeightGrams,
    declaredValueMinor: order.declaredValueMinor,
    currency: order.currency,
    slaDueAt: order.slaDueAt,
    version: order.version,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  } as const;
}
