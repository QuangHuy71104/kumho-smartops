import {
  incidentRecords,
  type IncidentPriority,
  type IncidentRecord,
  type IncidentStatus,
} from "../../../lib/demo-data.ts";

export type { IncidentPriority, IncidentRecord, IncidentStatus } from "../../../lib/demo-data.ts";

export const INCIDENT_STORAGE_KEY = "ksops-demo-incidents-v1";
export const INCIDENT_PRIORITIES = ["Khẩn cấp", "Cao", "Trung bình", "Thấp"] as const satisfies readonly IncidentPriority[];
export const INCIDENT_STATUSES = ["Mới", "Đang xử lý", "Chờ phản hồi", "Đã giải quyết"] as const satisfies readonly IncidentStatus[];
export const PRIORITY_FILTERS = ["Tất cả", ...INCIDENT_PRIORITIES] as const;
export const STATUS_FILTERS = ["Tất cả", ...INCIDENT_STATUSES] as const;
export const EMPTY_INCIDENTS: IncidentRecord[] = [];
export const INCIDENT_WORKFLOW_STEPS = [
  "Tiếp nhận và xác nhận phạm vi",
  "Khoanh vùng và chẩn đoán",
  "Khắc phục theo runbook",
  "Kiểm tra lại và cập nhật nhật ký",
] as const;

export type PriorityFilter = (typeof PRIORITY_FILTERS)[number];
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type DraftIncident = {
  title: string;
  category: string;
  priority: IncidentPriority;
  site: string;
};

export const EMPTY_INCIDENT_DRAFT: DraftIncident = {
  title: "",
  category: "Thiết bị đầu cuối",
  priority: "Trung bình",
  site: "Điểm vận hành demo",
};

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function isIncidentRecord(value: unknown): value is IncidentRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const stringFields = ["id", "title", "category", "site", "assignee", "createdAt", "sla", "summary"];

  return stringFields.every((field) => typeof record[field] === "string")
    && isOneOf(INCIDENT_PRIORITIES, record.priority)
    && isOneOf(INCIDENT_STATUSES, record.status);
}

export function decodeStoredIncidents(value: unknown): IncidentRecord[] | null {
  return Array.isArray(value) && value.every(isIncidentRecord) ? value : null;
}

export function mergeIncidentRecords(created: readonly IncidentRecord[]): IncidentRecord[] {
  const overriddenIds = new Set(created.map((incident) => incident.id));
  return [...created, ...incidentRecords.filter((incident) => !overriddenIds.has(incident.id))];
}

export function filterIncidentRecords(
  incidents: readonly IncidentRecord[],
  query: string,
  priority: PriorityFilter,
  status: StatusFilter,
) {
  const normalized = query.trim().toLocaleLowerCase("vi");

  return incidents.filter((incident) => {
    const matchesQuery = !normalized || [
      incident.id,
      incident.title,
      incident.category,
      incident.site,
      incident.assignee,
    ].join(" ").toLocaleLowerCase("vi").includes(normalized);

    return matchesQuery
      && (priority === "Tất cả" || incident.priority === priority)
      && (status === "Tất cả" || incident.status === status);
  });
}

export function summarizeIncidentRecords(incidents: readonly IncidentRecord[]) {
  return {
    open: incidents.filter((item) => item.status !== "Đã giải quyết").length,
    urgent: incidents.filter((item) => item.priority === "Khẩn cấp" || item.priority === "Cao").length,
    waiting: incidents.filter((item) => item.status === "Chờ phản hồi").length,
    resolved: incidents.filter((item) => item.status === "Đã giải quyết").length,
  };
}

export function buildIncidentRecord(draft: DraftIncident, timestamp: number): IncidentRecord {
  return {
    id: `INC-D${String(timestamp).slice(-4)}`,
    title: draft.title.trim(),
    category: draft.category,
    priority: draft.priority,
    status: "Mới",
    site: draft.site.trim(),
    assignee: "Chưa phân công",
    createdAt: "Vừa tạo · Trên thiết bị này",
    sla: draft.priority === "Cao" || draft.priority === "Khẩn cấp" ? "Còn 1 giờ" : "Còn 4 giờ",
    summary: "Sự cố demo do người xem tạo và chỉ được lưu trong trình duyệt hiện tại.",
  };
}

export function upsertIncidentRecord(records: readonly IncidentRecord[], incident: IncidentRecord) {
  return records.some((item) => item.id === incident.id)
    ? records.map((item) => item.id === incident.id ? incident : item)
    : [incident, ...records];
}

export function shouldOpenIncidentForm(search: string, hash: string) {
  return new URLSearchParams(search).get("new") === "1" || hash === "#tao-su-co";
}

export function urlWithoutIncidentFormTrigger({
  pathname,
  search,
  hash,
}: {
  pathname: string;
  search: string;
  hash: string;
}) {
  const searchParams = new URLSearchParams(search);
  if (searchParams.getAll("new").includes("1")) searchParams.delete("new");
  const nextSearch = searchParams.toString();
  const nextHash = hash === "#tao-su-co" ? "" : hash;
  return `${pathname}${nextSearch ? `?${nextSearch}` : ""}${nextHash}`;
}
