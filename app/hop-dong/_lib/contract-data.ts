export const CONTRACT_STAGES = ["Mới tiếp nhận", "Đang khảo sát", "Chờ báo giá", "Đã gửi báo giá", "Đã xác nhận"] as const;
export type ContractStage = (typeof CONTRACT_STAGES)[number];
export type CustomerGroupType = "Đoàn thể" | "Doanh nghiệp" | "Nhóm khách";
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
export const PICKUP_OPTIONS = ["Nhà Văn hóa Thanh niên TP.HCM", "KCN VSIP I, Bình Dương", "Trung tâm Hội nghị White Palace"] as const;
export const DESTINATION_OPTIONS = ["Khu du lịch Hồ Tràm", "Trung tâm Hội nghị GEM Center", "Khu du lịch Đại Nam"] as const;

export const EMPTY_CONTRACT_DRAFT: ContractDraft = {
  title: "Đưa đón đoàn hội nghị khách hàng",
  groupType: "Doanh nghiệp",
  passengerCount: 24,
  vehicleType: "Xe 29 chỗ",
  vehicleCount: 1,
  startDate: "2026-08-28",
  endDate: "2026-08-29",
  pickup: PICKUP_OPTIONS[0],
  destination: DESTINATION_OPTIONS[0],
};

export const contractRequests: ContractRequest[] = [
  { id: "HĐ-26-1042", title: "Hội nghị đối tác Minh Long 2026", groupType: "Doanh nghiệp", passengerCount: 72, vehicleType: "Xe 45 chỗ", vehicleCount: 2, startDate: "2026-08-26", endDate: "2026-08-27", pickup: "Trung tâm Hội nghị White Palace", destination: "Trung tâm Hội nghị GEM Center", status: "Mới tiếp nhận", owner: "Nhóm Kinh doanh A", estimatedValue: 16800000, createdAt: "21/08/2026 · 08:30" },
  { id: "HĐ-26-1039", title: "Chuyến nghỉ dưỡng Công ty An Phú", groupType: "Đoàn thể", passengerCount: 43, vehicleType: "Xe 45 chỗ", vehicleCount: 1, startDate: "2026-09-02", endDate: "2026-09-04", pickup: "Nhà Văn hóa Thanh niên TP.HCM", destination: "Khu du lịch Hồ Tràm", status: "Đang khảo sát", owner: "Nguyễn Ngọc Anh", estimatedValue: 14400000, createdAt: "20/08/2026 · 14:15" },
  { id: "HĐ-26-1037", title: "Đưa đón nhóm kỹ sư VSIP", groupType: "Nhóm khách", passengerCount: 15, vehicleType: "Xe 16 chỗ", vehicleCount: 1, startDate: "2026-08-30", endDate: "2026-08-30", pickup: "KCN VSIP I, Bình Dương", destination: "Trung tâm Hội nghị GEM Center", status: "Đang khảo sát", owner: "Trần Khánh Linh", estimatedValue: 3200000, createdAt: "20/08/2026 · 09:40" },
  { id: "HĐ-26-1034", title: "Đào tạo đại lý khu vực phía Nam", groupType: "Doanh nghiệp", passengerCount: 56, vehicleType: "Xe 29 chỗ", vehicleCount: 2, startDate: "2026-09-05", endDate: "2026-09-06", pickup: "Trung tâm Hội nghị White Palace", destination: "Khu du lịch Đại Nam", status: "Chờ báo giá", owner: "Nhóm Kinh doanh B", estimatedValue: 19200000, createdAt: "19/08/2026 · 16:05" },
  { id: "HĐ-26-1028", title: "Sự kiện khách hàng Phương Nam", groupType: "Doanh nghiệp", passengerCount: 88, vehicleType: "Xe 45 chỗ", vehicleCount: 2, startDate: "2026-09-10", endDate: "2026-09-10", pickup: "Nhà Văn hóa Thanh niên TP.HCM", destination: "Trung tâm Hội nghị GEM Center", status: "Đã gửi báo giá", owner: "Lê Minh Châu", estimatedValue: 11800000, createdAt: "18/08/2026 · 11:20" },
  { id: "HĐ-26-1021", title: "Chuyến công đoàn quý III", groupType: "Đoàn thể", passengerCount: 27, vehicleType: "Xe 29 chỗ", vehicleCount: 1, startDate: "2026-08-25", endDate: "2026-08-26", pickup: "KCN VSIP I, Bình Dương", destination: "Khu du lịch Hồ Tràm", status: "Đã xác nhận", owner: "Nhóm Kinh doanh A", estimatedValue: 7600000, createdAt: "16/08/2026 · 10:10" },
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
  if (draft.title.trim().length < 8) return "Tên hành trình cần ít nhất 8 ký tự.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(draft.endDate)) return "Hãy chọn đầy đủ ngày bắt đầu và kết thúc.";
  if (draft.endDate < draft.startDate) return "Ngày kết thúc không được trước ngày bắt đầu.";
  if (draft.passengerCount < 1 || draft.vehicleCount < 1) return "Quy mô đoàn và số xe phải lớn hơn 0.";
  if (draft.passengerCount > vehicleCapacity(draft.vehicleType) * draft.vehicleCount) return "Số ghế của phương án xe chưa đủ cho quy mô đoàn.";
  return null;
}

export function buildContractRequest(draft: ContractDraft, timestamp: number): ContractRequest {
  return {
    ...draft,
    id: `HĐ-26-${String(timestamp).slice(-5)}`,
    title: draft.title.trim(),
    status: "Mới tiếp nhận",
    owner: "Chưa phân công",
    estimatedValue: estimateContractValue(draft),
    createdAt: "Vừa tạo",
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
    && request.id.startsWith("HĐ-26-")
    && boundedStrings
    && validDates
    && validNumbers
    && (CONTRACT_STAGES as readonly unknown[]).includes(request.status)
    && ["Đoàn thể", "Doanh nghiệp", "Nhóm khách"].includes(String(request.groupType))
    && ["Xe 16 chỗ", "Xe 29 chỗ", "Xe 45 chỗ"].includes(String(request.vehicleType));
}

export function decodeCreatedContractRequests(value: unknown): ContractRequest[] | null {
  return Array.isArray(value) && value.every(isContractRequest) ? value : null;
}
