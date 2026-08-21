export const CONTRACT_STAGES = ["Mới tiếp nhận", "Đang khảo sát", "Chờ báo giá", "Đã gửi báo giá", "Đã xác nhận"] as const;
export type ContractStage = (typeof CONTRACT_STAGES)[number];
export type CustomerGroupType = "Đoàn thể mô phỏng" | "Doanh nghiệp mô phỏng" | "Nhóm khách mô phỏng";
export type VehicleOption = "Xe 16 chỗ" | "Xe 29 chỗ" | "Xe 45 chỗ";

export type ContractRequest = {
  id: string;
  title: string;
  groupType: CustomerGroupType;
  passengerCount: number;
  vehicleType: VehicleOption;
  vehicleCount: number;
  startDate: string;
  endDate: string;
  pickup: string;
  destination: string;
  status: ContractStage;
  owner: string;
  estimatedValue: number;
  createdAt: string;
};

export type ContractDraft = Pick<
  ContractRequest,
  "title" | "groupType" | "passengerCount" | "vehicleType" | "vehicleCount" | "startDate" | "endDate" | "pickup" | "destination"
>;

export const CONTRACT_STORAGE_KEY = "ksops-transport-demo-contract-requests-v1";
export const EMPTY_CREATED_REQUESTS: ContractRequest[] = [];
export const CONTRACT_FILTERS = ["Tất cả", ...CONTRACT_STAGES] as const;
export const PICKUP_OPTIONS = ["Điểm đón Thành Phố A (demo)", "Điểm tập kết Bắc A (demo)", "Trung tâm sự kiện A (demo)"] as const;
export const DESTINATION_OPTIONS = ["Khu sinh thái B (demo)", "Trung tâm hội nghị C (demo)", "Điểm tham quan D (demo)"] as const;

export const EMPTY_CONTRACT_DRAFT: ContractDraft = {
  title: "Hành trình đoàn demo",
  groupType: "Doanh nghiệp mô phỏng",
  passengerCount: 24,
  vehicleType: "Xe 29 chỗ",
  vehicleCount: 1,
  startDate: "2026-08-28",
  endDate: "2026-08-29",
  pickup: PICKUP_OPTIONS[0],
  destination: DESTINATION_OPTIONS[0],
};

export const contractRequests: ContractRequest[] = [
  { id: "HĐ-DEMO-1042", title: "Đoàn hội thảo nội bộ 02", groupType: "Doanh nghiệp mô phỏng", passengerCount: 72, vehicleType: "Xe 45 chỗ", vehicleCount: 2, startDate: "2026-08-26", endDate: "2026-08-27", pickup: "Trung tâm sự kiện A (demo)", destination: "Trung tâm hội nghị C (demo)", status: "Mới tiếp nhận", owner: "Nhóm Kinh doanh A", estimatedValue: 16800000, createdAt: "21/08/2026 · 08:30" },
  { id: "HĐ-DEMO-1039", title: "Chuyến tham quan tập thể 05", groupType: "Đoàn thể mô phỏng", passengerCount: 43, vehicleType: "Xe 45 chỗ", vehicleCount: 1, startDate: "2026-09-02", endDate: "2026-09-04", pickup: "Điểm đón Thành Phố A (demo)", destination: "Khu sinh thái B (demo)", status: "Đang khảo sát", owner: "Chuyên viên Demo 01", estimatedValue: 14400000, createdAt: "20/08/2026 · 14:15" },
  { id: "HĐ-DEMO-1037", title: "Đưa đón nhóm dự án 07", groupType: "Nhóm khách mô phỏng", passengerCount: 15, vehicleType: "Xe 16 chỗ", vehicleCount: 1, startDate: "2026-08-30", endDate: "2026-08-30", pickup: "Điểm tập kết Bắc A (demo)", destination: "Trung tâm hội nghị C (demo)", status: "Đang khảo sát", owner: "Chuyên viên Demo 02", estimatedValue: 3200000, createdAt: "20/08/2026 · 09:40" },
  { id: "HĐ-DEMO-1034", title: "Đoàn đào tạo khu vực 03", groupType: "Doanh nghiệp mô phỏng", passengerCount: 56, vehicleType: "Xe 29 chỗ", vehicleCount: 2, startDate: "2026-09-05", endDate: "2026-09-06", pickup: "Trung tâm sự kiện A (demo)", destination: "Điểm tham quan D (demo)", status: "Chờ báo giá", owner: "Nhóm Kinh doanh B", estimatedValue: 19200000, createdAt: "19/08/2026 · 16:05" },
  { id: "HĐ-DEMO-1028", title: "Sự kiện khách hàng mẫu 08", groupType: "Doanh nghiệp mô phỏng", passengerCount: 88, vehicleType: "Xe 45 chỗ", vehicleCount: 2, startDate: "2026-09-10", endDate: "2026-09-10", pickup: "Điểm đón Thành Phố A (demo)", destination: "Trung tâm hội nghị C (demo)", status: "Đã gửi báo giá", owner: "Chuyên viên Demo 03", estimatedValue: 11800000, createdAt: "18/08/2026 · 11:20" },
  { id: "HĐ-DEMO-1021", title: "Hành trình tập thể mẫu 04", groupType: "Đoàn thể mô phỏng", passengerCount: 27, vehicleType: "Xe 29 chỗ", vehicleCount: 1, startDate: "2026-08-25", endDate: "2026-08-26", pickup: "Điểm tập kết Bắc A (demo)", destination: "Khu sinh thái B (demo)", status: "Đã xác nhận", owner: "Nhóm Kinh doanh A", estimatedValue: 7600000, createdAt: "16/08/2026 · 10:10" },
];

export function vehicleCapacity(vehicle: VehicleOption) {
  return vehicle === "Xe 16 chỗ" ? 16 : vehicle === "Xe 29 chỗ" ? 29 : 45;
}

export function dayCount(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

export function estimateContractValue(draft: ContractDraft) {
  const dailyRate = draft.vehicleType === "Xe 16 chỗ" ? 3200000 : draft.vehicleType === "Xe 29 chỗ" ? 4800000 : 7200000;
  return dailyRate * draft.vehicleCount * dayCount(draft.startDate, draft.endDate);
}

export function formatContractValue(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function formatContractDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function mergeContractRequests(created: ContractRequest[]) {
  const createdIds = new Set(created.map((request) => request.id));
  return [...created, ...contractRequests.filter((request) => !createdIds.has(request.id))];
}

export function nextContractStage(stage: ContractStage): ContractStage | null {
  const index = CONTRACT_STAGES.indexOf(stage);
  return index < CONTRACT_STAGES.length - 1 ? CONTRACT_STAGES[index + 1] : null;
}

export function validateContractDraft(draft: ContractDraft) {
  if (draft.title.trim().length < 8) return "Tên hành trình demo cần ít nhất 8 ký tự.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(draft.endDate)) return "Hãy chọn đầy đủ ngày bắt đầu và kết thúc.";
  if (draft.endDate < draft.startDate) return "Ngày kết thúc không được trước ngày bắt đầu.";
  if (draft.passengerCount < 1 || draft.vehicleCount < 1) return "Quy mô đoàn và số xe phải lớn hơn 0.";
  if (draft.passengerCount > vehicleCapacity(draft.vehicleType) * draft.vehicleCount) return "Số ghế của phương án xe chưa đủ cho quy mô đoàn.";
  return null;
}

export function buildContractRequest(draft: ContractDraft, timestamp: number): ContractRequest {
  return {
    ...draft,
    id: `HĐ-DEMO-${String(timestamp).slice(-5)}`,
    title: draft.title.trim(),
    status: "Mới tiếp nhận",
    owner: "Chưa phân công",
    estimatedValue: estimateContractValue(draft),
    createdAt: "Vừa tạo trên thiết bị này",
  };
}

function isContractRequest(value: unknown): value is ContractRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Record<string, unknown>;
  const boundedStrings = ["title", "pickup", "destination", "owner", "createdAt"].every((key) => {
    const field = request[key];
    return typeof field === "string" && field.length > 0 && field.length <= 160;
  });
  const validDates = typeof request.startDate === "string"
    && typeof request.endDate === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(request.startDate)
    && /^\d{4}-\d{2}-\d{2}$/.test(request.endDate)
    && request.endDate >= request.startDate;
  const validNumbers = Number.isInteger(request.passengerCount)
    && Number.isInteger(request.vehicleCount)
    && typeof request.estimatedValue === "number"
    && Number.isFinite(request.estimatedValue)
    && (request.passengerCount as number) > 0
    && (request.passengerCount as number) <= 5_000
    && (request.vehicleCount as number) > 0
    && (request.vehicleCount as number) <= 100
    && request.estimatedValue >= 0;

  return typeof request.id === "string"
    && request.id.startsWith("HĐ-DEMO-")
    && boundedStrings
    && validDates
    && validNumbers
    && (CONTRACT_STAGES as readonly unknown[]).includes(request.status)
    && ["Đoàn thể mô phỏng", "Doanh nghiệp mô phỏng", "Nhóm khách mô phỏng"].includes(String(request.groupType))
    && ["Xe 16 chỗ", "Xe 29 chỗ", "Xe 45 chỗ"].includes(String(request.vehicleType));
}

export function decodeCreatedContractRequests(value: unknown): ContractRequest[] | null {
  return Array.isArray(value) && value.every(isContractRequest) ? value : null;
}
