export const PILOT_ORDER_STATUSES = [
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

export const PILOT_SERVICE_LEVELS = [
  "standard",
  "same_day",
  "express",
  "full_trip",
] as const;

export type PilotOrderStatus = (typeof PILOT_ORDER_STATUSES)[number];
export type PilotServiceLevel = (typeof PILOT_SERVICE_LEVELS)[number];

export type PilotCargoOrder = Readonly<{
  id: string;
  publicCode: string;
  owningBranchId: string;
  serviceLevel: PilotServiceLevel;
  status: PilotOrderStatus;
  originLocationId: string;
  destinationLocationId: string;
  packageCount: number;
  totalWeightGrams: number;
  declaredValueMinor: number | null;
  currency: string;
  slaDueAt: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}>;

export type PilotPrincipal = Readonly<{
  id: string;
  organizationId: string;
  permissions: readonly string[];
  permissionScopes: Readonly<Record<string, "*" | readonly string[]>>;
  authenticationMethod: "oidc";
}>;

export type PilotBranch = Readonly<{
  id: string;
  code: string;
  name: string;
  kind: "branch" | "station" | "office" | "depot" | "warehouse";
  timezone: string;
}>;

export type PilotLocation = Readonly<{
  id: string;
  branchId: string;
  publicCode: string;
  kind: "branch" | "station" | "office" | "depot" | "warehouse" | "service_zone";
  displayName: string;
}>;

export type PilotReferenceData = Readonly<{
  branches: readonly PilotBranch[];
  locations: readonly PilotLocation[];
}>;

export type PilotProblem = Readonly<{
  status: number;
  code: string;
  title: string;
  detail: string;
  requestId?: string;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PERMISSION_PATTERN = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/u;
const SAFE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._:-]*$/u;

const statusLabels: Record<PilotOrderStatus, string> = {
  draft: "Bản nháp",
  quoted: "Đã báo giá",
  confirmed: "Đã xác nhận",
  received: "Đã nhận hàng",
  loaded: "Đã xếp hàng",
  in_transit: "Đang vận chuyển",
  arrived: "Đã đến điểm giao",
  delivered: "Đã giao",
  reconciled: "Đã đối soát",
  exception: "Cần xử lý",
  cancelled: "Đã hủy",
};

const serviceLabels: Record<PilotServiceLevel, string> = {
  standard: "Tiêu chuẩn",
  same_day: "Trong ngày",
  express: "Hỏa tốc",
  full_trip: "Nguyên chuyến",
};

const transitions: Record<PilotOrderStatus, readonly PilotOrderStatus[]> = {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maximum: number) {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum) return null;
  const sanitized = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 ? " " : character;
  }).join("").trim();
  return sanitized || null;
}

function uuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function safeInteger(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= minimum
    && value <= maximum
    ? value
    : null;
}

function isoDate(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function member<T extends readonly string[]>(values: T, value: unknown): T[number] | null {
  return typeof value === "string" && values.includes(value) ? value as T[number] : null;
}

function envelopeData(value: unknown) {
  if (!isRecord(value) || !isRecord(value.data)) throw new Error("INVALID_API_PAYLOAD");
  return value.data;
}

export function decodePilotPrincipalEnvelope(value: unknown): PilotPrincipal {
  const data = envelopeData(value);
  const id = uuid(data.id);
  const organizationId = uuid(data.organizationId);
  const permissions = Array.isArray(data.permissions)
    ? data.permissions.filter((permission): permission is string => (
      typeof permission === "string" && PERMISSION_PATTERN.test(permission)
    ))
    : null;
  const rawScopes = isRecord(data.permissionScopes) ? data.permissionScopes : null;
  const permissionScopes: Record<string, "*" | readonly string[]> = {};
  if (rawScopes) {
    for (const [permission, rawScope] of Object.entries(rawScopes)) {
      if (!PERMISSION_PATTERN.test(permission)) throw new Error("INVALID_PRINCIPAL_PAYLOAD");
      if (rawScope === "*") {
        permissionScopes[permission] = "*";
      } else if (Array.isArray(rawScope)) {
        const scopeIds = rawScope.map(uuid);
        if (scopeIds.some((scopeId) => !scopeId)) throw new Error("INVALID_PRINCIPAL_PAYLOAD");
        permissionScopes[permission] = Object.freeze(scopeIds as string[]);
      } else {
        throw new Error("INVALID_PRINCIPAL_PAYLOAD");
      }
    }
  }
  if (!id || !organizationId || !permissions || !rawScopes
    || permissions.some((permission) => !permissionScopes[permission])
    || data.authenticationMethod !== "oidc") {
    throw new Error("INVALID_PRINCIPAL_PAYLOAD");
  }
  return Object.freeze({
    id,
    organizationId,
    permissions: Object.freeze([...new Set(permissions)]),
    permissionScopes: Object.freeze(permissionScopes),
    authenticationMethod: "oidc",
  });
}

function decodeBranch(value: unknown): PilotBranch {
  if (!isRecord(value)) throw new Error("INVALID_BRANCH_PAYLOAD");
  const id = uuid(value.id);
  const code = boundedString(value.code, 32);
  const name = boundedString(value.name, 160);
  const kind = member(["branch", "station", "office", "depot", "warehouse"] as const, value.kind);
  const timezone = boundedString(value.timezone, 64);
  if (!id || !code || !name || !kind || !timezone) throw new Error("INVALID_BRANCH_PAYLOAD");
  return Object.freeze({ id, code, name, kind, timezone });
}

function decodeLocation(value: unknown): PilotLocation {
  if (!isRecord(value)) throw new Error("INVALID_LOCATION_PAYLOAD");
  const id = uuid(value.id);
  const branchId = uuid(value.branchId);
  const publicCode = boundedString(value.publicCode, 40);
  const displayName = boundedString(value.displayName, 180);
  const kind = member(
    ["branch", "station", "office", "depot", "warehouse", "service_zone"] as const,
    value.kind,
  );
  if (!id || !branchId || !publicCode || !displayName || !kind) {
    throw new Error("INVALID_LOCATION_PAYLOAD");
  }
  return Object.freeze({ id, branchId, publicCode, displayName, kind });
}

export function decodePilotReferenceEnvelope(value: unknown): PilotReferenceData {
  const data = envelopeData(value);
  if (!Array.isArray(data.branches) || !Array.isArray(data.locations)
    || data.branches.length > 500 || data.locations.length > 2000) {
    throw new Error("INVALID_REFERENCE_PAYLOAD");
  }
  const branches = data.branches.map(decodeBranch);
  const locations = data.locations.map(decodeLocation);
  const branchIds = new Set(branches.map((branch) => branch.id));
  const locationIds = new Set(locations.map((location) => location.id));
  if (branchIds.size !== branches.length
    || locationIds.size !== locations.length
    || locations.some((location) => !branchIds.has(location.branchId))) {
    throw new Error("INVALID_REFERENCE_PAYLOAD");
  }
  return Object.freeze({
    branches: Object.freeze(branches),
    locations: Object.freeze(locations),
  });
}

export function decodePilotOrder(value: unknown): PilotCargoOrder {
  if (!isRecord(value)) throw new Error("INVALID_ORDER_PAYLOAD");
  const id = uuid(value.id);
  const publicCode = boundedString(value.publicCode, 48);
  const owningBranchId = uuid(value.owningBranchId);
  const serviceLevel = member(PILOT_SERVICE_LEVELS, value.serviceLevel);
  const status = member(PILOT_ORDER_STATUSES, value.status);
  const originLocationId = uuid(value.originLocationId);
  const destinationLocationId = uuid(value.destinationLocationId);
  const packageCount = safeInteger(value.packageCount, 1, 10_000);
  const totalWeightGrams = safeInteger(value.totalWeightGrams, 1, 100_000_000);
  const declaredValueMinor = value.declaredValueMinor === null
    ? null
    : safeInteger(value.declaredValueMinor, 0, Number.MAX_SAFE_INTEGER);
  const currency = typeof value.currency === "string" && /^[A-Z]{3}$/u.test(value.currency)
    ? value.currency
    : null;
  const slaDueAt = isoDate(value.slaDueAt);
  const version = safeInteger(value.version, 1, Number.MAX_SAFE_INTEGER);
  const createdAt = isoDate(value.createdAt);
  const updatedAt = isoDate(value.updatedAt);
  if (!id || !publicCode || !owningBranchId || !serviceLevel || !status
    || !originLocationId || !destinationLocationId || packageCount === null
    || totalWeightGrams === null
    || (value.declaredValueMinor !== null && declaredValueMinor === null)
    || !currency || !slaDueAt || version === null || !createdAt || !updatedAt) {
    throw new Error("INVALID_ORDER_PAYLOAD");
  }
  return Object.freeze({
    id,
    publicCode,
    owningBranchId,
    serviceLevel,
    status,
    originLocationId,
    destinationLocationId,
    packageCount,
    totalWeightGrams,
    declaredValueMinor,
    currency,
    slaDueAt,
    version,
    createdAt,
    updatedAt,
  });
}

export function decodePilotOrdersEnvelope(value: unknown): readonly PilotCargoOrder[] {
  if (!isRecord(value) || !Array.isArray(value.data) || value.data.length > 100) {
    throw new Error("INVALID_ORDERS_PAYLOAD");
  }
  return Object.freeze(value.data.map(decodePilotOrder));
}

export function decodePilotOrderEnvelope(value: unknown): PilotCargoOrder {
  return decodePilotOrder(envelopeData(value));
}

export function decodePilotProblem(value: unknown, status: number): PilotProblem {
  const record = isRecord(value) ? value : {};
  const code = boundedString(record.code, 64) ?? "REQUEST_FAILED";
  const title = boundedString(record.title, 120) ?? "Không thể hoàn tất yêu cầu";
  const detail = boundedString(record.detail, 500) ?? "Hệ thống không thể hoàn tất yêu cầu. Hãy thử lại.";
  const requestId = boundedString(record.requestId, 128) ?? undefined;
  return Object.freeze({ status, code, title, detail, ...(requestId ? { requestId } : {}) });
}

export function pilotOrderStatusLabel(status: PilotOrderStatus) {
  return statusLabels[status];
}

export function pilotServiceLevelLabel(level: PilotServiceLevel) {
  return serviceLabels[level];
}

export function pilotTransitionTargets(status: PilotOrderStatus) {
  return transitions[status];
}

export function pilotIdempotencyKey(operation: "create" | "transition") {
  return `ksops-ui:${operation}:${globalThis.crypto.randomUUID()}`;
}

export function formatPilotWeight(totalWeightGrams: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(totalWeightGrams / 1000) + " kg";
}

export function formatPilotMoney(value: number | null, currency: string) {
  if (value === null) return "Không khai báo";
  try {
    const formatter = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
    });
    const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format(value / (10 ** fractionDigits));
  } catch {
    return `${new Intl.NumberFormat("vi-VN").format(value)} ${currency}`;
  }
}

export function formatPilotDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function isSafeReasonCode(value: string) {
  return value.length >= 3
    && value.length <= 60
    && SAFE_CODE_PATTERN.test(value);
}
