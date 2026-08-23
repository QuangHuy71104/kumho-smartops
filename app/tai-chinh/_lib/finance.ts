export type InvoiceStatus = "Đã thanh toán" | "Chờ thanh toán" | "Quá hạn";

export type Invoice = {
  id: string;
  customer: string;
  reference: string;
  service: "Hàng hóa" | "Vé hành khách" | "Xe hợp đồng";
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
};

export const invoices = [
  { id: "INV-2608-018", customer: "Công ty TNHH Minh Long", reference: "HĐ-26-0188", service: "Xe hợp đồng", amount: 28_600_000, dueDate: "24/08/2026", status: "Chờ thanh toán" },
  { id: "INV-2608-017", customer: "Công ty CP An Phú Logistics", reference: "DH-2608-1034", service: "Hàng hóa", amount: 8_450_000, dueDate: "20/08/2026", status: "Quá hạn" },
  { id: "INV-2608-016", customer: "Nhóm Hành Trình Xanh", reference: "HĐ-26-0182", service: "Xe hợp đồng", amount: 16_800_000, dueDate: "22/08/2026", status: "Chờ thanh toán" },
  { id: "INV-2608-015", customer: "Khách lẻ tổng hợp", reference: "BK-2608-2108", service: "Vé hành khách", amount: 42_380_000, dueDate: "21/08/2026", status: "Đã thanh toán" },
  { id: "INV-2608-014", customer: "Cửa hàng Nội thất Nam Sơn", reference: "DH-2608-1028", service: "Hàng hóa", amount: 5_920_000, dueDate: "19/08/2026", status: "Đã thanh toán" },
] satisfies readonly Invoice[];

export const cashFlow = [
  { day: "15/08", income: 54, expense: 31 },
  { day: "16/08", income: 68, expense: 40 },
  { day: "17/08", income: 46, expense: 28 },
  { day: "18/08", income: 82, expense: 51 },
  { day: "19/08", income: 74, expense: 43 },
  { day: "20/08", income: 91, expense: 56 },
  { day: "21/08", income: 78, expense: 48 },
] as const;

export const expenseBreakdown = [
  { label: "Nhiên liệu", value: 46, amount: "386,4 triệu" },
  { label: "Nhân sự & phụ cấp", value: 27, amount: "226,8 triệu" },
  { label: "Bảo dưỡng", value: 17, amount: "142,8 triệu" },
  { label: "Cầu đường & khác", value: 10, amount: "84,0 triệu" },
] as const;

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function decodePaidInvoiceIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && /^INV-\d{4}-\d{3}$/.test(item))) {
    return null;
  }
  return [...new Set(value)];
}
