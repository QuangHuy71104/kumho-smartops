export type WorkItemStatus =
  | "new"
  | "claimed"
  | "in_progress"
  | "waiting_approval"
  | "waiting_evidence"
  | "completed"
  | "rejected";

export type WorkItemPriority = "urgent" | "high" | "normal" | "low";

export type WorkItemEvent = {
  id: string;
  action: string;
  fromStatus?: WorkItemStatus | null;
  toStatus?: WorkItemStatus | null;
  note?: string | null;
  actorRole?: string | null;
  actorLabel?: string | null;
  occurredAt: string;
};

export type WorkItemComment = {
  id: string;
  body: string;
  authorRole?: string | null;
  authorLabel?: string | null;
  createdAt: string;
};

export type WorkItem = {
  id: string;
  organizationId?: string;
  module: string;
  workKind: "standard" | "approval" | "audit";
  title: string;
  description: string;
  resourceType: string;
  resourceId: string | null;
  routePath: string;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  assignedRole: string;
  originRole: string;
  assignedTo: string | null;
  dueAt: string | null;
  completedAt?: string | null;
  version: number;
  createdAt?: string;
  updatedAt?: string;
  comments: WorkItemComment[];
  events: WorkItemEvent[];
};

export type WorkItemSummary = {
  total: number;
  new: number;
  claimed: number;
  inProgress: number;
  waitingApproval: number;
  waitingEvidence: number;
  overdue: number;
  completed: number;
  rejected: number;
};

export type WorkCenterData = {
  items: WorkItem[];
  summary: WorkItemSummary;
};

export type RoleNotification = {
  id: number;
  title: string;
  message: string;
  workItemId?: string | null;
  createdAt: string;
  readAt: string | null;
};

export type WorkAction =
  | "claim"
  | "start"
  | "complete"
  | "submit-approval"
  | "approve"
  | "reject"
  | "escalate"
  | "request-evidence"
  | "resolve-evidence"
  | "comment";

export type CreateWorkItemInput = {
  module: string;
  workKind?: "standard" | "approval" | "audit";
  title: string;
  description: string;
  resourceType: string;
  resourceId?: string | null;
  routePath: string;
  priority: WorkItemPriority;
  assignedRole: string;
  dueAt: string;
};

type AccessIdentity = {
  roleId: string;
  roleLabel: string;
};

type ApiErrorShape = {
  error?: string | { message?: string };
  message?: string;
  detail?: string;
};

function accessHeaders(identity: AccessIdentity): HeadersInit {
  return {
    "x-ksops-role": identity.roleId,
    "x-ksops-role-label": encodeURIComponent(identity.roleLabel),
  };
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLocaleLowerCase("en-US").includes("json")) return null;
  return response.json();
}

function apiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const body = payload as ApiErrorShape;
  if (typeof body.detail === "string" && body.detail.trim()) return body.detail;
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  if (body.error && typeof body.error === "object" && typeof body.error.message === "string") {
    return body.error.message;
  }
  return fallback;
}

export async function fetchWorkCenter(identity: AccessIdentity, signal?: AbortSignal): Promise<WorkCenterData> {
  const response = await fetch("/api/v1/work-items", {
    cache: "no-store",
    headers: accessHeaders(identity),
    signal,
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(apiErrorMessage(payload, "Không thể tải hàng đợi công việc."));

  const envelope = payload && typeof payload === "object"
    ? payload as { data?: unknown; meta?: { summary?: WorkItemSummary } }
    : null;
  const nestedData = envelope?.data && !Array.isArray(envelope.data) && typeof envelope.data === "object"
    ? envelope.data as Partial<WorkCenterData>
    : null;
  const items = Array.isArray(envelope?.data)
    ? envelope.data as WorkItem[]
    : nestedData?.items;
  const summary = nestedData?.summary ?? envelope?.meta?.summary;
  if (!Array.isArray(items) || !summary) {
    throw new Error("Dữ liệu hàng đợi không đúng định dạng.");
  }
  return { items, summary };
}

export async function performWorkAction(
  identity: AccessIdentity,
  itemId: string,
  action: WorkAction,
  note: string,
): Promise<void> {
  const trimmedNote = note.trim();
  const response = await fetch(`/api/v1/work-items/${encodeURIComponent(itemId)}/actions`, {
    method: "POST",
    headers: {
      ...accessHeaders(identity),
      "content-type": "application/json",
    },
    body: JSON.stringify({ action, ...(trimmedNote ? { note: trimmedNote } : {}) }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(apiErrorMessage(payload, "Không thể cập nhật công việc."));
}

export async function createWorkItem(identity: AccessIdentity, input: CreateWorkItemInput): Promise<void> {
  const response = await fetch("/api/v1/work-items", {
    method: "POST",
    headers: {
      ...accessHeaders(identity),
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(apiErrorMessage(payload, "Không thể giao công việc."));
}

export async function fetchRoleNotifications(
  identity: AccessIdentity,
  signal?: AbortSignal,
): Promise<RoleNotification[]> {
  const response = await fetch("/api/v1/role-notifications", {
    cache: "no-store",
    headers: accessHeaders(identity),
    signal,
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(apiErrorMessage(payload, "Không thể tải thông báo."));
  if (!payload || typeof payload !== "object" || !("data" in payload)) return [];

  const data = (payload as { data: unknown }).data;
  if (Array.isArray(data)) return data as RoleNotification[];
  if (data && typeof data === "object" && "notifications" in data) {
    const notifications = (data as { notifications?: unknown }).notifications;
    return Array.isArray(notifications) ? notifications as RoleNotification[] : [];
  }
  return [];
}

export async function markNotificationsRead(identity: AccessIdentity, ids: number[]): Promise<void> {
  if (!ids.length) return;
  const response = await fetch("/api/v1/role-notifications", {
    method: "PUT",
    headers: {
      ...accessHeaders(identity),
      "content-type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(apiErrorMessage(payload, "Không thể cập nhật thông báo."));
}
