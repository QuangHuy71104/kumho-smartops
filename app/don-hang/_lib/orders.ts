export const ORDER_STORAGE_KEY = "ksops.transport-orders.demo.v1";

export const ORDER_STATUSES = [
  "Mới tiếp nhận",
  "Đã xác nhận",
  "Đang lấy hàng",
  "Đang vận chuyển",
  "Hoàn tất",
  "Cần xử lý",
] as const;

export const SERVICE_TYPES = [
  "Hàng ghép liên tỉnh",
  "Nguyên chuyến",
  "Last-mile",
] as const;

export const CARGO_TYPES = [
  "Kiện tổng hợp",
  "Hàng tiêu dùng",
  "Linh kiện đóng thùng",
  "Thực phẩm khô",
  "Hàng cồng kềnh",
] as const;

export const SLA_STATES = ["Trong SLA", "Sắp đến hạn", "Trễ SLA"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type ServiceType = (typeof SERVICE_TYPES)[number];
export type CargoType = (typeof CARGO_TYPES)[number];
export type SlaState = (typeof SLA_STATES)[number];

export type TransportOrder = {
  id: string;
  customerAlias: string;
  service: ServiceType;
  cargo: CargoType;
  origin: string;
  destination: string;
  distanceLabel: string;
  createdAt: string;
  pickupWindow: string;
  slaDeadline: string;
  slaState: SlaState;
  status: OrderStatus;
  packageCount: number;
  weightKg: number;
  assigneeAlias: string;
  note: string;
  source: "seed" | "local-demo";
};

export type OrderFilters = {
  query: string;
  status: OrderStatus | "Tất cả trạng thái";
  service: ServiceType | "Tất cả dịch vụ";
};

export type CreateOrderInput = {
  customerAlias: string;
  service: ServiceType;
  cargo: CargoType;
  origin: string;
  destination: string;
  pickupWindow: string;
  packageCount: number;
  weightKg: number;
  note: string;
};

export const demoOrders: TransportOrder[] = [
  {
    id: "DH-260823-2408",
    customerAlias: "Công ty TNHH An Phú Logistics",
    service: "Hàng ghép liên tỉnh",
    cargo: "Hàng tiêu dùng",
    origin: "TP. Hồ Chí Minh",
    destination: "Đồng Nai",
    distanceLabel: "48 km",
    createdAt: "2026-08-23T07:15:00+07:00",
    pickupWindow: "23/08 · 09:00–10:00",
    slaDeadline: "2026-08-23T15:30:00+07:00",
    slaState: "Trong SLA",
    status: "Đang lấy hàng",
    packageCount: 18,
    weightKg: 460,
    assigneeAlias: "Tổ giao nhận Thủ Đức",
    note: "Gom hàng tại kho Thủ Đức, yêu cầu kiểm đếm đủ 18 kiện trước khi xuất bến.",
    source: "seed",
  },
  {
    id: "DH-260823-2411",
    customerAlias: "Công ty CP Thương mại Minh Hà",
    service: "Last-mile",
    cargo: "Kiện tổng hợp",
    origin: "Kho trung chuyển Thủ Đức",
    destination: "Quận 7, TP. Hồ Chí Minh",
    distanceLabel: "26 km",
    createdAt: "2026-08-23T06:45:00+07:00",
    pickupWindow: "23/08 · 08:30–09:30",
    slaDeadline: "2026-08-23T11:45:00+07:00",
    slaState: "Sắp đến hạn",
    status: "Đang vận chuyển",
    packageCount: 9,
    weightKg: 128,
    assigneeAlias: "Tổ last-mile Quận 7",
    note: "Ưu tiên giao theo cụm tuyến Nguyễn Hữu Thọ, hoàn tất trước 11:45.",
    source: "seed",
  },
  {
    id: "DH-260822-2415",
    customerAlias: "Công ty Điện tử Đông Nam",
    service: "Nguyên chuyến",
    cargo: "Linh kiện đóng thùng",
    origin: "Bình Dương",
    destination: "Tây Ninh",
    distanceLabel: "92 km",
    createdAt: "2026-08-22T16:20:00+07:00",
    pickupWindow: "23/08 · 06:00–07:00",
    slaDeadline: "2026-08-23T10:30:00+07:00",
    slaState: "Trễ SLA",
    status: "Cần xử lý",
    packageCount: 32,
    weightKg: 2750,
    assigneeAlias: "Chờ tổ điều phối",
    note: "Chậm xác nhận tại cổng kho 35 phút; cần cập nhật lại thời gian giao dự kiến.",
    source: "seed",
  },
  {
    id: "DH-260823-2419",
    customerAlias: "Công ty Thực phẩm Lam Sơn",
    service: "Hàng ghép liên tỉnh",
    cargo: "Thực phẩm khô",
    origin: "Long An",
    destination: "Tiền Giang",
    distanceLabel: "64 km",
    createdAt: "2026-08-23T08:05:00+07:00",
    pickupWindow: "23/08 · 10:00–11:30",
    slaDeadline: "2026-08-23T17:00:00+07:00",
    slaState: "Trong SLA",
    status: "Đã xác nhận",
    packageCount: 24,
    weightKg: 820,
    assigneeAlias: "Tổ giao nhận Long An",
    note: "Hàng khô đóng bao, xếp riêng khỏi khu vực có độ ẩm cao.",
    source: "seed",
  },
  {
    id: "DH-260823-2422",
    customerAlias: "Nội thất Sông Xanh",
    service: "Last-mile",
    cargo: "Hàng cồng kềnh",
    origin: "Kho Bình Tân",
    destination: "Hóc Môn, TP. Hồ Chí Minh",
    distanceLabel: "31 km",
    createdAt: "2026-08-23T08:25:00+07:00",
    pickupWindow: "23/08 · 11:00–12:00",
    slaDeadline: "2026-08-23T16:00:00+07:00",
    slaState: "Trong SLA",
    status: "Mới tiếp nhận",
    packageCount: 4,
    weightKg: 310,
    assigneeAlias: "Chưa phân công",
    note: "Cần xe thùng kín có dây chằng và chăn lót chống trầy bề mặt.",
    source: "seed",
  },
  {
    id: "DH-260822-2426",
    customerAlias: "Công ty Phân phối Phương Nam",
    service: "Nguyên chuyến",
    cargo: "Hàng tiêu dùng",
    origin: "Đồng Nai",
    destination: "Bà Rịa – Vũng Tàu",
    distanceLabel: "78 km",
    createdAt: "2026-08-22T13:40:00+07:00",
    pickupWindow: "22/08 · 15:00–16:00",
    slaDeadline: "2026-08-23T08:00:00+07:00",
    slaState: "Trong SLA",
    status: "Hoàn tất",
    packageCount: 41,
    weightKg: 3380,
    assigneeAlias: "Tổ đường dài Đông Nam Bộ",
    note: "Đã bàn giao đủ 41 kiện, biên bản điện tử được xác nhận lúc 07:46.",
    source: "seed",
  },
  {
    id: "DH-260823-2429",
    customerAlias: "Đại lý Vật tư Đại Lộc",
    service: "Hàng ghép liên tỉnh",
    cargo: "Kiện tổng hợp",
    origin: "Tây Ninh",
    destination: "Bình Phước",
    distanceLabel: "116 km",
    createdAt: "2026-08-23T05:50:00+07:00",
    pickupWindow: "23/08 · 07:30–08:30",
    slaDeadline: "2026-08-23T14:15:00+07:00",
    slaState: "Sắp đến hạn",
    status: "Đang vận chuyển",
    packageCount: 27,
    weightKg: 1060,
    assigneeAlias: "Tổ đường dài Tây Bắc",
    note: "Theo dõi mốc bàn giao tại trạm Chơn Thành trước 12:30.",
    source: "seed",
  },
  {
    id: "DH-260823-2433",
    customerAlias: "Công ty Cơ khí Bình Minh",
    service: "Last-mile",
    cargo: "Linh kiện đóng thùng",
    origin: "Kho Biên Hòa",
    destination: "Long Khánh, Đồng Nai",
    distanceLabel: "57 km",
    createdAt: "2026-08-23T08:35:00+07:00",
    pickupWindow: "23/08 · 13:00–14:00",
    slaDeadline: "2026-08-23T18:00:00+07:00",
    slaState: "Trong SLA",
    status: "Mới tiếp nhận",
    packageCount: 12,
    weightKg: 245,
    assigneeAlias: "Chưa phân công",
    note: "Kiện có tem hướng đặt; không xếp chồng quá ba lớp trong khoang xe.",
    source: "seed",
  },
];

const statusFlow: Partial<Record<OrderStatus, OrderStatus>> = {
  "Mới tiếp nhận": "Đã xác nhận",
  "Đã xác nhận": "Đang lấy hàng",
  "Đang lấy hàng": "Đang vận chuyển",
  "Đang vận chuyển": "Hoàn tất",
  "Cần xử lý": "Đã xác nhận",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength = 180): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isOneOf<const T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.some((option) => option === value);
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function decodeOrder(value: unknown): TransportOrder | null {
  if (!isRecord(value)) return null;
  if (!isBoundedString(value.id, 32) || !value.id.startsWith("DH-")) return null;
  if (!isBoundedString(value.customerAlias, 80)) return null;
  if (!isOneOf(value.service, SERVICE_TYPES) || !isOneOf(value.cargo, CARGO_TYPES)) return null;
  if (!isBoundedString(value.origin, 80) || !isBoundedString(value.destination, 80)) return null;
  if (!isBoundedString(value.distanceLabel, 50)) return null;
  if (!isValidDate(value.createdAt) || !isBoundedString(value.pickupWindow, 70)) return null;
  if (!isValidDate(value.slaDeadline) || !isOneOf(value.slaState, SLA_STATES)) return null;
  if (!isOneOf(value.status, ORDER_STATUSES)) return null;
  if (typeof value.packageCount !== "number" || !Number.isInteger(value.packageCount) || value.packageCount < 1 || value.packageCount > 9999) return null;
  if (typeof value.weightKg !== "number" || !Number.isFinite(value.weightKg) || value.weightKg <= 0 || value.weightKg > 50000) return null;
  if (!isBoundedString(value.assigneeAlias, 80) || !isBoundedString(value.note, 300)) return null;
  if (value.source !== "seed" && value.source !== "local-demo") return null;

  return {
    id: value.id,
    customerAlias: value.customerAlias,
    service: value.service,
    cargo: value.cargo,
    origin: value.origin,
    destination: value.destination,
    distanceLabel: value.distanceLabel,
    createdAt: value.createdAt,
    pickupWindow: value.pickupWindow,
    slaDeadline: value.slaDeadline,
    slaState: value.slaState,
    status: value.status,
    packageCount: value.packageCount,
    weightKg: value.weightKg,
    assigneeAlias: value.assigneeAlias,
    note: value.note,
    source: value.source,
  };
}

export function decodeStoredOrders(value: unknown): TransportOrder[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 60) return null;
  const orders = value.map(decodeOrder);
  if (orders.some((order) => order === null)) return null;
  return orders as TransportOrder[];
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

export function filterOrders(orders: TransportOrder[], filters: OrderFilters) {
  const query = normalizeSearch(filters.query);
  return orders.filter((order) => {
    const matchesStatus = filters.status === "Tất cả trạng thái" || order.status === filters.status;
    const matchesService = filters.service === "Tất cả dịch vụ" || order.service === filters.service;
    const searchable = normalizeSearch([
      order.id,
      order.customerAlias,
      order.cargo,
      order.origin,
      order.destination,
    ].join(" "));
    return matchesStatus && matchesService && (!query || searchable.includes(query));
  });
}

export function getOrderSummary(orders: TransportOrder[]) {
  return {
    total: orders.length,
    active: orders.filter((order) => !["Hoàn tất", "Cần xử lý"].includes(order.status)).length,
    atRisk: orders.filter((order) => order.slaState !== "Trong SLA" || order.status === "Cần xử lý").length,
    lastMile: orders.filter((order) => order.service === "Last-mile").length,
  };
}

export function getNextOrderStatus(status: OrderStatus) {
  return statusFlow[status] ?? null;
}

export function createDemoOrder(input: CreateOrderInput, now = new Date()): TransportOrder {
  const slaHours = input.service === "Last-mile" ? 5 : input.service === "Nguyên chuyến" ? 16 : 9;
  const deadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000);
  const sequence = now.getTime().toString().slice(-7);

  return {
    id: `DH-${now.toISOString().slice(2, 10).replaceAll("-", "")}-${sequence.slice(-4)}`,
    customerAlias: input.customerAlias.trim(),
    service: input.service,
    cargo: input.cargo,
    origin: input.origin.trim(),
    destination: input.destination.trim(),
    distanceLabel: "Chờ tính tuyến",
    createdAt: now.toISOString(),
    pickupWindow: input.pickupWindow,
    slaDeadline: deadline.toISOString(),
    slaState: "Trong SLA",
    status: "Mới tiếp nhận",
    packageCount: input.packageCount,
    weightKg: input.weightKg,
    assigneeAlias: "Chưa phân công",
    note: input.note.trim() || "Đơn mới đang chờ điều phối xác nhận phương án lấy hàng.",
    source: "local-demo",
  };
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function formatWeight(weightKg: number) {
  return weightKg >= 1000
    ? `${(weightKg / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tấn`
    : `${weightKg.toLocaleString("vi-VN")} kg`;
}
