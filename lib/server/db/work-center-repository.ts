import "server-only";

import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { ApplicationError } from "../../../modules/shared/application/errors.ts";
import {
  type CreateWorkItemInput,
  type NotificationReadInput,
  type RoleNotification,
  type WorkCenterRoleId,
  type WorkItem,
  type WorkItemAction,
  type WorkItemComment,
  type WorkItemEvent,
  type WorkItemStatus,
  type WorkItemSummary,
  planWorkItemTransition,
} from "../../work-center.ts";
import { getWorkspacePool } from "./workspace-pool.ts";

const ORGANIZATION_ID = "KSO-TRANSPORT";
const MANAGER_ROLE: WorkCenterRoleId = "operations-manager";

type Queryable = {
  query: <R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ) => Promise<QueryResult<R>>;
};

type WorkItemRow = QueryResultRow & {
  id: string;
  organization_id: string;
  module: WorkItem["module"];
  work_kind: WorkItem["workKind"];
  title: string;
  description: string;
  resource_type: string;
  resource_id: string | null;
  route_path: string;
  priority: WorkItem["priority"];
  status: WorkItemStatus;
  assigned_role: WorkCenterRoleId;
  origin_role: WorkCenterRoleId;
  assigned_to: string | null;
  due_at: Date | string;
  completed_at: Date | string | null;
  version: number | string;
  created_at: Date | string;
  updated_at: Date | string;
};

const ACTION_TITLES: Readonly<Record<WorkItemAction | "created", string>> = {
  created: "Công việc mới được giao",
  claim: "Công việc đã được tiếp nhận",
  start: "Công việc đã bắt đầu",
  complete: "Công việc đã hoàn thành",
  "submit-approval": "Công việc đang chờ phê duyệt",
  approve: "Công việc đã được phê duyệt",
  reject: "Công việc cần xử lý lại",
  escalate: "Công việc đã được chuyển cấp",
  "request-evidence": "Yêu cầu bổ sung chứng từ",
  "resolve-evidence": "Chứng từ đã được xác nhận",
  comment: "Công việc có trao đổi mới",
};

function toIso(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Database returned an invalid timestamp.");
  return date.toISOString();
}

function toNullableIso(value: Date | string | null) {
  return value === null ? null : toIso(value);
}

function mapComment(row: QueryResultRow): WorkItemComment {
  return Object.freeze({
    id: Number(row.id),
    authorRole: row.author_role as WorkCenterRoleId,
    authorLabel: String(row.author_label),
    body: String(row.body),
    createdAt: toIso(row.created_at as Date | string),
  });
}

function mapEvent(row: QueryResultRow): WorkItemEvent {
  return Object.freeze({
    id: Number(row.id),
    action: String(row.action),
    fromStatus: row.from_status as WorkItemStatus | null,
    toStatus: row.to_status as WorkItemStatus | null,
    actorRole: row.actor_role as WorkCenterRoleId,
    actorLabel: String(row.actor_label),
    note: String(row.note ?? ""),
    occurredAt: toIso(row.occurred_at as Date | string),
  });
}

function mapNotification(row: QueryResultRow): RoleNotification {
  return Object.freeze({
    id: Number(row.id),
    recipientRole: row.recipient_role as WorkCenterRoleId,
    workItemId: String(row.work_item_id),
    title: String(row.title),
    message: String(row.message),
    readAt: toNullableIso(row.read_at as Date | string | null),
    createdAt: toIso(row.created_at as Date | string),
  });
}

function mapWorkItem(
  row: WorkItemRow,
  comments: readonly WorkItemComment[] = [],
  events: readonly WorkItemEvent[] = [],
): WorkItem {
  return Object.freeze({
    id: row.id,
    organizationId: row.organization_id,
    module: row.module,
    workKind: row.work_kind,
    title: row.title,
    description: row.description,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    routePath: row.route_path,
    priority: row.priority,
    status: row.status,
    assignedRole: row.assigned_role,
    originRole: row.origin_role,
    assignedTo: row.assigned_to,
    dueAt: toIso(row.due_at),
    completedAt: toNullableIso(row.completed_at),
    version: Number(row.version),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    comments: Object.freeze([...comments]),
    events: Object.freeze([...events]),
  });
}

async function hydrateWorkItems(queryable: Queryable, rows: readonly WorkItemRow[]) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const [commentResult, eventResult] = await Promise.all([
    queryable.query(
      `SELECT id, work_item_id, author_role, author_label, body, created_at
         FROM public.work_item_comments
        WHERE work_item_id = ANY($1::varchar[])
        ORDER BY created_at, id`,
      [ids],
    ),
    queryable.query(
      `SELECT id, work_item_id, action, from_status, to_status, actor_role, actor_label, note, occurred_at
         FROM public.work_item_events
        WHERE work_item_id = ANY($1::varchar[])
        ORDER BY occurred_at, id`,
      [ids],
    ),
  ]);
  return rows.map((row) => mapWorkItem(
    row,
    commentResult.rows.filter((comment) => comment.work_item_id === row.id).map(mapComment),
    eventResult.rows.filter((event) => event.work_item_id === row.id).map(mapEvent),
  ));
}

export function summarizeWorkItems(items: readonly WorkItem[]): WorkItemSummary {
  const now = Date.now();
  const count = (status: WorkItemStatus) => items.filter((item) => item.status === status).length;
  return Object.freeze({
    total: items.length,
    new: count("new"),
    claimed: count("claimed"),
    inProgress: count("in_progress"),
    waitingApproval: count("waiting_approval"),
    waitingEvidence: count("waiting_evidence"),
    completed: count("completed"),
    rejected: count("rejected"),
    overdue: items.filter((item) => !["completed", "rejected"].includes(item.status) && Date.parse(item.dueAt) < now).length,
  });
}

export async function listWorkItemsForRole(role: WorkCenterRoleId) {
  const result = await getWorkspacePool().query<WorkItemRow>(
    `SELECT *
       FROM public.work_items
      WHERE assigned_role = $1
         OR ($1 = 'operations-manager' AND status = 'waiting_approval')
         OR ($1 = 'auditor' AND work_kind = 'audit')
      ORDER BY
        CASE WHEN status = 'completed' THEN 1 ELSE 0 END,
        CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
        due_at,
        id`,
    [role],
  );
  const items = await hydrateWorkItems(getWorkspacePool(), result.rows);
  return Object.freeze({ items: Object.freeze(items), summary: summarizeWorkItems(items) });
}

async function insertNotification(
  client: Queryable,
  workItemId: string,
  recipientRole: WorkCenterRoleId,
  action: WorkItemAction | "created",
  actorLabel: string,
) {
  await client.query(
    `INSERT INTO public.role_notifications
       (recipient_role, work_item_id, title, message)
     VALUES ($1, $2, $3, $4)`,
    [
      recipientRole,
      workItemId,
      ACTION_TITLES[action],
      `${actorLabel} · ${ACTION_TITLES[action]} (${workItemId}).`,
    ],
  );
}

async function readWorkItemById(queryable: Queryable, id: string) {
  const result = await queryable.query<WorkItemRow>("SELECT * FROM public.work_items WHERE id = $1", [id]);
  if (!result.rows[0]) throw new ApplicationError("NOT_FOUND", "Không tìm thấy công việc.");
  return (await hydrateWorkItems(queryable, [result.rows[0]]))[0];
}

export async function performWorkItemAction(input: Readonly<{
  id: string;
  actorRole: WorkCenterRoleId;
  actorLabel: string;
  action: WorkItemAction;
  note?: string;
}>) {
  const client = await getWorkspacePool().connect();
  try {
    await client.query("BEGIN");
    const selected = await client.query<WorkItemRow>(
      "SELECT * FROM public.work_items WHERE id = $1 FOR UPDATE",
      [input.id],
    );
    const current = selected.rows[0];
    if (!current) throw new ApplicationError("NOT_FOUND", "Không tìm thấy công việc.");
    const plan = planWorkItemTransition({
      assignedRole: current.assigned_role,
      originRole: current.origin_role,
      assignedTo: current.assigned_to,
      status: current.status,
      workKind: current.work_kind,
    }, input.actorRole, input.actorLabel, input.action);
    const updated = await client.query<WorkItemRow>(
      `UPDATE public.work_items
          SET status = $2::varchar(24),
              assigned_role = $3::varchar(32),
              assigned_to = $4::varchar(120),
              completed_at = CASE
                WHEN $5 THEN COALESCE(completed_at, now())
                WHEN status = $2::varchar(24) THEN completed_at
                ELSE NULL
              END,
              version = version + 1,
              updated_at = now()
        WHERE id = $1 AND version = $6
        RETURNING *`,
      [input.id, plan.status, plan.assignedRole, plan.assignedTo, plan.completed, current.version],
    );
    if (!updated.rows[0]) {
      throw new ApplicationError("VERSION_MISMATCH", "Công việc đã được người khác cập nhật.");
    }
    if (input.action === "comment") {
      await client.query(
        `INSERT INTO public.work_item_comments
           (work_item_id, author_role, author_label, body)
         VALUES ($1, $2, $3, $4)`,
        [input.id, input.actorRole, input.actorLabel, input.note],
      );
    }
    await client.query(
      `INSERT INTO public.work_item_events
         (work_item_id, action, from_status, to_status, actor_role, actor_label, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [input.id, input.action, current.status, plan.status, input.actorRole, input.actorLabel, input.note ?? ""],
    );
    for (const recipientRole of new Set(plan.notificationRoles)) {
      await insertNotification(client, input.id, recipientRole, input.action, input.actorLabel);
    }
    const item = await readWorkItemById(client, input.id);
    await client.query("COMMIT");
    return item;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function createWorkItemId() {
  const now = new Date();
  const date = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toLocaleUpperCase("en-US");
  return `CV-${date}-${suffix}`;
}

export async function createAssignedWorkItem(input: Readonly<{
  actorRole: WorkCenterRoleId;
  actorLabel: string;
  data: CreateWorkItemInput;
}>) {
  if (input.actorRole !== MANAGER_ROLE) {
    throw new ApplicationError("FORBIDDEN", "Chỉ Quản lý vận hành được giao công việc mới.");
  }
  const client = await getWorkspacePool().connect();
  try {
    await client.query("BEGIN");
    const id = createWorkItemId();
    await client.query(
      `INSERT INTO public.work_items
         (id, organization_id, module, work_kind, title, description, resource_type, resource_id,
          route_path, priority, status, assigned_role, origin_role, due_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'new', $11, $12, $13)`,
      [
        id,
        ORGANIZATION_ID,
        input.data.module,
        input.data.workKind,
        input.data.title,
        input.data.description,
        input.data.resourceType,
        input.data.resourceId,
        input.data.routePath,
        input.data.priority,
        input.data.assignedRole,
        input.actorRole,
        input.data.dueAt,
      ],
    );
    await client.query(
      `INSERT INTO public.work_item_events
         (work_item_id, action, from_status, to_status, actor_role, actor_label, note)
       VALUES ($1, 'created', NULL, 'new', $2, $3, $4)`,
      [id, input.actorRole, input.actorLabel, input.data.description],
    );
    await insertNotification(client, id, input.data.assignedRole, "created", input.actorLabel);
    const item = await readWorkItemById(client, id);
    await client.query("COMMIT");
    return item;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function listRoleNotifications(role: WorkCenterRoleId) {
  const result = await getWorkspacePool().query(
    `SELECT id, recipient_role, work_item_id, title, message, read_at, created_at
       FROM public.role_notifications
      WHERE recipient_role = $1
      ORDER BY (read_at IS NULL) DESC, created_at DESC, id DESC
      LIMIT 100`,
    [role],
  );
  return Object.freeze(result.rows.map(mapNotification));
}

export async function markRoleNotificationsRead(role: WorkCenterRoleId, input: NotificationReadInput) {
  const client: PoolClient = await getWorkspacePool().connect();
  try {
    await client.query("BEGIN");
    if ("all" in input) {
      await client.query(
        `UPDATE public.role_notifications
            SET read_at = COALESCE(read_at, now())
          WHERE recipient_role = $1`,
        [role],
      );
    } else {
      await client.query(
        `UPDATE public.role_notifications
            SET read_at = COALESCE(read_at, now())
          WHERE recipient_role = $1 AND id = ANY($2::bigint[])`,
        [role, input.ids],
      );
    }
    const result = await client.query(
      `SELECT id, recipient_role, work_item_id, title, message, read_at, created_at
         FROM public.role_notifications
        WHERE recipient_role = $1
        ORDER BY (read_at IS NULL) DESC, created_at DESC, id DESC
        LIMIT 100`,
      [role],
    );
    await client.query("COMMIT");
    return Object.freeze(result.rows.map(mapNotification));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
