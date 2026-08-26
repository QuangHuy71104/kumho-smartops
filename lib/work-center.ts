import { ApplicationError } from "../modules/shared/application/errors.ts";

export const WORK_CENTER_ROLE_IDS = [
  "dispatcher",
  "cargo-agent",
  "ticket-agent",
  "contract-sales",
  "maintenance-technician",
  "finance-officer",
  "operations-manager",
  "auditor",
] as const;

export type WorkCenterRoleId = (typeof WORK_CENTER_ROLE_IDS)[number];

export const WORK_CENTER_ROLE_LABELS: Readonly<Record<WorkCenterRoleId, string>> = {
  dispatcher: "Điều phối viên",
  "cargo-agent": "Nhân viên hàng hóa",
  "ticket-agent": "Nhân viên bán vé",
  "contract-sales": "Kinh doanh hợp đồng",
  "maintenance-technician": "Kỹ thuật bảo dưỡng",
  "finance-officer": "Kế toán vận tải",
  "operations-manager": "Quản lý vận hành",
  auditor: "Kiểm soát nội bộ",
};

export const WORK_ITEM_STATUSES = [
  "new",
  "claimed",
  "in_progress",
  "waiting_approval",
  "waiting_evidence",
  "completed",
  "rejected",
] as const;

export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export const WORK_ITEM_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type WorkItemPriority = (typeof WORK_ITEM_PRIORITIES)[number];

export const WORK_ITEM_KINDS = ["standard", "approval", "audit"] as const;
export type WorkItemKind = (typeof WORK_ITEM_KINDS)[number];

export const WORK_ITEM_MODULES = [
  "cargo",
  "dispatch",
  "passenger",
  "contract",
  "maintenance",
  "billing",
  "reporting",
  "audit",
] as const;

export type WorkItemModule = (typeof WORK_ITEM_MODULES)[number];

export const WORK_ITEM_ACTIONS = [
  "claim",
  "start",
  "complete",
  "submit-approval",
  "approve",
  "reject",
  "escalate",
  "request-evidence",
  "resolve-evidence",
  "comment",
] as const;

export type WorkItemAction = (typeof WORK_ITEM_ACTIONS)[number];

export type WorkItemComment = Readonly<{
  id: number;
  authorRole: WorkCenterRoleId;
  authorLabel: string;
  body: string;
  createdAt: string;
}>;

export type WorkItemEvent = Readonly<{
  id: number;
  action: string;
  fromStatus: WorkItemStatus | null;
  toStatus: WorkItemStatus | null;
  actorRole: WorkCenterRoleId;
  actorLabel: string;
  note: string;
  occurredAt: string;
}>;

export type WorkItem = Readonly<{
  id: string;
  organizationId: string;
  module: WorkItemModule;
  workKind: WorkItemKind;
  title: string;
  description: string;
  resourceType: string;
  resourceId: string | null;
  routePath: string;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  assignedRole: WorkCenterRoleId;
  originRole: WorkCenterRoleId;
  assignedTo: string | null;
  dueAt: string;
  completedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  comments: readonly WorkItemComment[];
  events: readonly WorkItemEvent[];
}>;

export type WorkItemSummary = Readonly<{
  total: number;
  new: number;
  claimed: number;
  inProgress: number;
  waitingApproval: number;
  waitingEvidence: number;
  completed: number;
  rejected: number;
  overdue: number;
}>;

export type RoleNotification = Readonly<{
  id: number;
  recipientRole: WorkCenterRoleId;
  workItemId: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}>;

export type WorkItemActionInput = Readonly<{ action: WorkItemAction; note?: string }>;
export type NotificationReadInput = Readonly<{ all: true } | { ids: readonly number[] }>;

export type CreateWorkItemInput = Readonly<{
  module: WorkItemModule;
  workKind: WorkItemKind;
  title: string;
  description: string;
  resourceType: string;
  resourceId: string | null;
  routePath: string;
  priority: WorkItemPriority;
  assignedRole: WorkCenterRoleId;
  dueAt: string;
}>;

export type WorkItemPolicySubject = Readonly<Pick<
  WorkItem,
  "assignedRole" | "originRole" | "status" | "workKind"
>>;

export type WorkItemTransitionSubject = WorkItemPolicySubject & Readonly<Pick<WorkItem, "assignedTo">>;

export type WorkItemTransitionPlan = Readonly<{
  status: WorkItemStatus;
  assignedRole: WorkCenterRoleId;
  assignedTo: string | null;
  completed: boolean;
  notificationRoles: readonly WorkCenterRoleId[];
}>;

const utf8 = new TextEncoder();
const WORK_ITEM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,31}$/u;
const RESOURCE_TYPE_PATTERN = /^[a-z][a-z0-9_-]{1,39}$/u;
const INTERNAL_PATH_PATTERN = /^\/(?:[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*)?$/u;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/u;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function boundedText(
  value: unknown,
  field: string,
  maximumCharacters: number,
  maximumBytes: number,
  allowEmpty = false,
) {
  if (typeof value !== "string") {
    throw new ApplicationError("BAD_REQUEST", `${field} phải là chuỗi ký tự.`);
  }
  const normalized = value.replaceAll("\r\n", "\n").trim();
  if ((!allowEmpty && !normalized) || normalized.length > maximumCharacters || utf8.encode(normalized).byteLength > maximumBytes) {
    throw new ApplicationError("BAD_REQUEST", `${field} vượt giới hạn cho phép.`);
  }
  for (const character of normalized) {
    const codePoint = character.codePointAt(0) ?? 0;
    if ((codePoint < 32 && ![9, 10, 13].includes(codePoint)) || codePoint === 127) {
      throw new ApplicationError("BAD_REQUEST", `${field} chứa ký tự không hợp lệ.`);
    }
  }
  return normalized;
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  values: T,
  field: string,
): T[number] {
  if (typeof value !== "string" || !(values as readonly string[]).includes(value)) {
    throw new ApplicationError("BAD_REQUEST", `${field} không hợp lệ.`);
  }
  return value as T[number];
}

export function decodeWorkCenterRole(value: unknown): WorkCenterRoleId | null {
  return typeof value === "string" && (WORK_CENTER_ROLE_IDS as readonly string[]).includes(value)
    ? value as WorkCenterRoleId
    : null;
}

export function requireWorkCenterRole(headers: Pick<Headers, "get">): WorkCenterRoleId {
  const raw = headers.get("x-ksops-role");
  if (!raw) throw new ApplicationError("AUTHENTICATION_REQUIRED", "Thiếu vai trò làm việc.");
  const role = decodeWorkCenterRole(raw);
  if (!role) throw new ApplicationError("FORBIDDEN", "Vai trò làm việc không hợp lệ.");
  return role;
}

export function decodeWorkCenterActorLabel(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  try {
    return boundedText(decoded, "Tên người thao tác", 120, 400);
  } catch {
    return null;
  }
}

export function resolveWorkCenterActor(headers: Pick<Headers, "get">) {
  const role = requireWorkCenterRole(headers);
  const rawLabel = headers.get("x-ksops-role-label");
  const actorLabel = rawLabel === null
    ? WORK_CENTER_ROLE_LABELS[role]
    : decodeWorkCenterActorLabel(rawLabel);
  if (!actorLabel) throw new ApplicationError("BAD_REQUEST", "Tên người thao tác không hợp lệ.");
  return Object.freeze({ role, actorLabel });
}

export function decodeWorkItemId(value: unknown): string | null {
  return typeof value === "string" && WORK_ITEM_ID_PATTERN.test(value) ? value : null;
}

export function decodeWorkItemActionBody(value: unknown): WorkItemActionInput {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ["action", "note"])) {
    throw new ApplicationError("BAD_REQUEST", "Nội dung thao tác công việc không hợp lệ.");
  }
  const action = enumValue(value.action, WORK_ITEM_ACTIONS, "Thao tác");
  const note = value.note === undefined
    ? undefined
    : boundedText(value.note, "Ghi chú", 4000, 4000);
  if (action === "comment" && !note) {
    throw new ApplicationError("BAD_REQUEST", "Bình luận không được để trống.");
  }
  return Object.freeze({ action, ...(note ? { note } : {}) });
}

export function decodeNotificationReadBody(value: unknown): NotificationReadInput {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ["all", "ids"])) {
    throw new ApplicationError("BAD_REQUEST", "Yêu cầu cập nhật thông báo không hợp lệ.");
  }
  if (value.all === true && value.ids === undefined) return Object.freeze({ all: true });
  if (value.all !== undefined || !Array.isArray(value.ids) || value.ids.length < 1 || value.ids.length > 100) {
    throw new ApplicationError("BAD_REQUEST", "Hãy chọn từ 1 đến 100 thông báo, hoặc đánh dấu tất cả.");
  }
  const ids = [...new Set(value.ids)];
  if (!ids.every((id) => typeof id === "number" && Number.isSafeInteger(id) && id > 0)) {
    throw new ApplicationError("BAD_REQUEST", "Mã thông báo không hợp lệ.");
  }
  return Object.freeze({ ids: Object.freeze(ids as number[]) });
}

export function decodeCreateWorkItemBody(value: unknown): CreateWorkItemInput {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, [
    "module", "workKind", "title", "description", "resourceType", "resourceId",
    "routePath", "priority", "assignedRole", "dueAt",
  ])) {
    throw new ApplicationError("BAD_REQUEST", "Nội dung giao việc không hợp lệ.");
  }
  const workModule = enumValue(value.module, WORK_ITEM_MODULES, "Phân hệ");
  const workKind = value.workKind === undefined
    ? (value.assignedRole === "auditor" ? "audit" : "standard")
    : enumValue(value.workKind, WORK_ITEM_KINDS, "Loại công việc");
  const title = boundedText(value.title, "Tiêu đề", 200, 800);
  const description = boundedText(value.description, "Mô tả", 4000, 4000);
  const resourceType = boundedText(value.resourceType, "Loại hồ sơ", 40, 40);
  if (!RESOURCE_TYPE_PATTERN.test(resourceType)) {
    throw new ApplicationError("BAD_REQUEST", "Loại hồ sơ chỉ gồm chữ thường, số, gạch nối hoặc gạch dưới.");
  }
  const resourceId = value.resourceId === undefined || value.resourceId === null
    ? null
    : boundedText(value.resourceId, "Mã hồ sơ", 64, 128);
  const routePath = boundedText(value.routePath, "Đường dẫn", 180, 300);
  if (!INTERNAL_PATH_PATTERN.test(routePath)) {
    throw new ApplicationError("BAD_REQUEST", "Đường dẫn công việc không hợp lệ.");
  }
  const priority = enumValue(value.priority, WORK_ITEM_PRIORITIES, "Mức ưu tiên");
  const assignedRole = enumValue(value.assignedRole, WORK_CENTER_ROLE_IDS, "Vai trò nhận việc");
  const dueAt = boundedText(value.dueAt, "Hạn xử lý", 40, 40);
  if (!ISO_INSTANT_PATTERN.test(dueAt) || Number.isNaN(Date.parse(dueAt))) {
    throw new ApplicationError("BAD_REQUEST", "Hạn xử lý phải là thời điểm ISO 8601 hợp lệ.");
  }
  if (workKind === "audit" && assignedRole !== "auditor") {
    throw new ApplicationError("BAD_REQUEST", "Công việc kiểm soát phải giao cho Kiểm soát nội bộ.");
  }
  return Object.freeze({
    module: workModule,
    workKind,
    title,
    description,
    resourceType,
    resourceId,
    routePath,
    priority,
    assignedRole,
    dueAt: new Date(dueAt).toISOString(),
  });
}

export function workItemActionsFor(
  item: WorkItemPolicySubject,
  role: WorkCenterRoleId,
): readonly WorkItemAction[] {
  const assigned = item.assignedRole === role;
  const visible = assigned
    || (role === "operations-manager" && item.status === "waiting_approval")
    || (role === "auditor" && item.workKind === "audit");
  if (!visible) return Object.freeze([]);

  if (role === "auditor") {
    if (item.workKind !== "audit") return Object.freeze(["comment"]);
    const actions: WorkItemAction[] = ["comment"];
    if (["new", "claimed", "in_progress", "rejected"].includes(item.status)) {
      actions.push("request-evidence");
    }
    if (item.status === "waiting_evidence") actions.push("resolve-evidence");
    if (["new", "in_progress"].includes(item.status)) actions.push("complete");
    return Object.freeze(actions);
  }

  if (role === "operations-manager" && item.status === "waiting_approval") {
    return Object.freeze(["approve", "reject", "comment"]);
  }
  if (!assigned) return Object.freeze([]);

  const actions: WorkItemAction[] = ["comment"];
  if (["new", "rejected"].includes(item.status)) actions.push("claim");
  if (item.status === "claimed") actions.push("start");
  if (item.status === "in_progress") {
    if (item.workKind !== "approval") actions.push("complete");
    actions.push("submit-approval");
  }
  if (item.status === "waiting_evidence") actions.push("resolve-evidence");
  if (!["completed", "waiting_approval"].includes(item.status)) actions.push("escalate");
  return Object.freeze(actions);
}

export function workItemApprovalOwnerRole(item: WorkItemPolicySubject): WorkCenterRoleId {
  return item.assignedRole === "operations-manager" ? item.originRole : item.assignedRole;
}

function invalidWorkItemTransition(message: string): never {
  throw new ApplicationError("INVALID_TRANSITION", message);
}

function routineNotificationRole(item: WorkItemPolicySubject, actorRole: WorkCenterRoleId) {
  return item.originRole !== actorRole ? item.originRole : "operations-manager";
}

function notificationRoles(...roles: WorkCenterRoleId[]): readonly WorkCenterRoleId[] {
  return Object.freeze(roles);
}

function commentNotificationRole(
  item: WorkItemPolicySubject,
  actorRole: WorkCenterRoleId,
  assigned: boolean,
): WorkCenterRoleId {
  if (item.workKind !== "audit") {
    return assigned ? routineNotificationRole(item, actorRole) : item.assignedRole;
  }
  if (actorRole !== "auditor") return "auditor";
  const counterpart = item.assignedRole !== "auditor" ? item.assignedRole : item.originRole;
  return counterpart !== "auditor" ? counterpart : "operations-manager";
}

export function planWorkItemTransition(
  item: WorkItemTransitionSubject,
  actorRole: WorkCenterRoleId,
  actorLabel: string,
  action: WorkItemAction,
): WorkItemTransitionPlan {
  const assigned = item.assignedRole === actorRole;
  const visible = assigned
    || (actorRole === "operations-manager" && item.status === "waiting_approval")
    || (actorRole === "auditor" && item.workKind === "audit");
  if (!visible) throw new ApplicationError("FORBIDDEN", "Công việc này không thuộc phạm vi của vai trò hiện tại.");

  if (action === "comment") {
    return Object.freeze({
      status: item.status,
      assignedRole: item.assignedRole,
      assignedTo: item.assignedTo,
      completed: item.status === "completed",
      notificationRoles: notificationRoles(commentNotificationRole(item, actorRole, assigned)),
    });
  }

  if (actorRole === "auditor") {
    if (item.workKind !== "audit") {
      throw new ApplicationError("FORBIDDEN", "Kiểm soát nội bộ chỉ thao tác trên hồ sơ kiểm tra.");
    }
    if (action === "request-evidence") {
      if (!["new", "claimed", "in_progress", "rejected"].includes(item.status)) {
        return invalidWorkItemTransition("Chỉ có thể yêu cầu chứng từ khi hồ sơ kiểm tra đang được xử lý.");
      }
      return Object.freeze({
        status: "waiting_evidence",
        assignedRole: item.originRole,
        assignedTo: null,
        completed: false,
        notificationRoles: notificationRoles(item.originRole),
      });
    }
    if (action === "resolve-evidence") {
      if (item.status !== "waiting_evidence") return invalidWorkItemTransition("Hồ sơ không ở trạng thái chờ chứng từ.");
      return Object.freeze({
        status: "in_progress",
        assignedRole: "auditor",
        assignedTo: actorLabel,
        completed: false,
        notificationRoles: notificationRoles(item.originRole),
      });
    }
    if (action === "complete") {
      if (!["new", "in_progress"].includes(item.status)) {
        return invalidWorkItemTransition("Hồ sơ kiểm tra chưa thể hoàn thành ở trạng thái hiện tại.");
      }
      return Object.freeze({
        status: "completed",
        assignedRole: "auditor",
        assignedTo: actorLabel,
        completed: true,
        notificationRoles: notificationRoles(item.originRole),
      });
    }
    throw new ApplicationError("FORBIDDEN", "Vai trò kiểm soát không được thực hiện thao tác này.");
  }

  if (action === "approve" || action === "reject") {
    if (actorRole !== "operations-manager") {
      throw new ApplicationError("FORBIDDEN", "Chỉ Quản lý vận hành được phê duyệt công việc.");
    }
    if (item.status !== "waiting_approval") {
      return invalidWorkItemTransition("Công việc không ở trạng thái chờ phê duyệt.");
    }
    const ownerRole = workItemApprovalOwnerRole(item);
    if (action === "approve") {
      return Object.freeze({
        status: "completed",
        assignedRole: item.assignedRole,
        assignedTo: item.assignedTo,
        completed: true,
        notificationRoles: notificationRoles(ownerRole),
      });
    }
    return Object.freeze({
      status: "rejected",
      assignedRole: ownerRole,
      assignedTo: null,
      completed: false,
      notificationRoles: notificationRoles(ownerRole),
    });
  }

  if (!assigned) throw new ApplicationError("FORBIDDEN", "Công việc chưa được giao cho vai trò hiện tại.");

  switch (action) {
    case "claim":
      if (!["new", "rejected"].includes(item.status)) {
        return invalidWorkItemTransition("Công việc không thể tiếp nhận ở trạng thái hiện tại.");
      }
      return Object.freeze({
        status: "claimed",
        assignedRole: actorRole,
        assignedTo: actorLabel,
        completed: false,
        notificationRoles: notificationRoles(routineNotificationRole(item, actorRole)),
      });
    case "start":
      if (item.status !== "claimed") return invalidWorkItemTransition("Hãy tiếp nhận công việc trước khi bắt đầu.");
      return Object.freeze({
        status: "in_progress",
        assignedRole: actorRole,
        assignedTo: item.assignedTo ?? actorLabel,
        completed: false,
        notificationRoles: notificationRoles(routineNotificationRole(item, actorRole)),
      });
    case "complete":
      if (item.status !== "in_progress") return invalidWorkItemTransition("Công việc chưa ở trạng thái đang xử lý.");
      if (item.workKind === "approval") {
        return invalidWorkItemTransition("Công việc này phải được trình Quản lý vận hành phê duyệt.");
      }
      return Object.freeze({
        status: "completed",
        assignedRole: actorRole,
        assignedTo: item.assignedTo ?? actorLabel,
        completed: true,
        notificationRoles: notificationRoles(routineNotificationRole(item, actorRole)),
      });
    case "submit-approval":
      if (item.status !== "in_progress") {
        return invalidWorkItemTransition("Chỉ công việc đang xử lý mới có thể trình duyệt.");
      }
      return Object.freeze({
        status: "waiting_approval",
        assignedRole: item.assignedRole,
        assignedTo: item.assignedTo,
        completed: false,
        notificationRoles: notificationRoles("operations-manager"),
      });
    case "escalate":
      if (["completed", "waiting_approval"].includes(item.status)) {
        return invalidWorkItemTransition("Công việc không thể chuyển cấp ở trạng thái hiện tại.");
      }
      return Object.freeze({
        status: "waiting_approval",
        assignedRole: item.assignedRole,
        assignedTo: item.assignedTo,
        completed: false,
        notificationRoles: notificationRoles("operations-manager"),
      });
    case "request-evidence":
      throw new ApplicationError("FORBIDDEN", "Chỉ Kiểm soát nội bộ được xử lý yêu cầu chứng từ.");
    case "resolve-evidence":
      if (item.status !== "waiting_evidence") {
        return invalidWorkItemTransition("Công việc không ở trạng thái chờ chứng từ.");
      }
      if (item.workKind === "audit") {
        return Object.freeze({
          status: "in_progress",
          assignedRole: "auditor",
          assignedTo: null,
          completed: false,
          notificationRoles: notificationRoles("auditor"),
        });
      }
      return Object.freeze({
        status: "in_progress",
        assignedRole: actorRole,
        assignedTo: item.assignedTo ?? actorLabel,
        completed: false,
        notificationRoles: notificationRoles(routineNotificationRole(item, actorRole)),
      });
    default:
      throw new ApplicationError("FORBIDDEN", "Vai trò hiện tại không được thực hiện thao tác này.");
  }
}

export function requireSameHostMutation(request: Request) {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  if (!origin || !host) throw new ApplicationError("FORBIDDEN", "Origin không hợp lệ.");
  try {
    if (new URL(origin).host.toLocaleLowerCase("en-US") !== host.toLocaleLowerCase("en-US")) {
      throw new Error("origin mismatch");
    }
  } catch {
    throw new ApplicationError("FORBIDDEN", "Origin không được phép cập nhật dữ liệu.");
  }
}
