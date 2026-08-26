import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  decodeCreateWorkItemBody,
  decodeNotificationReadBody,
  decodeWorkCenterActorLabel,
  decodeWorkCenterRole,
  decodeWorkItemActionBody,
  decodeWorkItemId,
  planWorkItemTransition,
  requireSameHostMutation,
  workItemActionsFor,
  workItemApprovalOwnerRole,
  WORK_CENTER_ROLE_IDS,
  WORK_ITEM_ACTIONS,
  WORK_ITEM_STATUSES,
} from "../lib/work-center.ts";

test("work center contracts expose eight roles and bounded action payloads", () => {
  assert.equal(WORK_CENTER_ROLE_IDS.length, 8);
  assert.deepEqual(WORK_ITEM_STATUSES, [
    "new", "claimed", "in_progress", "waiting_approval", "waiting_evidence", "completed", "rejected",
  ]);
  assert.deepEqual(WORK_ITEM_ACTIONS, [
    "claim", "start", "complete", "submit-approval", "approve", "reject", "escalate",
    "request-evidence", "resolve-evidence", "comment",
  ]);
  assert.equal(decodeWorkCenterRole("operations-manager"), "operations-manager");
  assert.equal(decodeWorkCenterRole("admin"), null);
  assert.equal(decodeWorkItemId("CV-260826-AB12CD"), "CV-260826-AB12CD");
  assert.equal(decodeWorkItemId("../secret"), null);
  assert.deepEqual(decodeWorkItemActionBody({ action: "start", note: "Đã nhận đủ hồ sơ" }), {
    action: "start",
    note: "Đã nhận đủ hồ sơ",
  });
  assert.throws(() => decodeWorkItemActionBody({ action: "comment" }), /Bình luận/u);
  assert.throws(() => decodeWorkItemActionBody({ action: "approve", admin: true }), /không hợp lệ/u);
  assert.throws(() => decodeWorkItemActionBody({ action: "comment", note: "x".repeat(4001) }), /giới hạn/u);
});

test("actor labels, creation input and notification selections are strict", () => {
  assert.equal(decodeWorkCenterActorLabel(encodeURIComponent("Nguyễn Minh Anh")), "Nguyễn Minh Anh");
  assert.equal(decodeWorkCenterActorLabel("x".repeat(121)), null);
  const input = decodeCreateWorkItemBody({
    module: "dispatch",
    title: "Điều phối xe tăng cường",
    description: "Bổ sung xe cho khung giờ cao điểm.",
    resourceType: "dispatch-task",
    resourceId: "DP-260826-01",
    routePath: "/dieu-phoi",
    priority: "high",
    assignedRole: "dispatcher",
    dueAt: "2026-08-26T10:30:00+07:00",
  });
  assert.equal(input.workKind, "standard");
  assert.equal(input.dueAt, "2026-08-26T03:30:00.000Z");
  assert.throws(() => decodeCreateWorkItemBody({ ...input, routePath: "https://evil.example" }), /Đường dẫn/u);
  assert.throws(() => decodeCreateWorkItemBody({ ...input, routePath: "/\\evil.example" }), /Đường dẫn/u);
  assert.throws(() => decodeCreateWorkItemBody({ ...input, routePath: "//evil.example/path" }), /Đường dẫn/u);
  assert.throws(
    () => decodeCreateWorkItemBody({ ...input, workKind: "audit", assignedRole: "dispatcher" }),
    /Kiểm soát nội bộ/u,
  );
  assert.deepEqual(decodeNotificationReadBody({ ids: [3, 3, 7] }), { ids: [3, 7] });
  assert.deepEqual(decodeNotificationReadBody({ all: true }), { all: true });
  assert.throws(() => decodeNotificationReadBody({ ids: [] }), /1 đến 100/u);
});

test("mutations require an exact same host", () => {
  assert.doesNotThrow(() => requireSameHostMutation(new Request("https://ops.example/api", {
    headers: { host: "ops.example", origin: "https://ops.example" },
  })));
  assert.throws(() => requireSameHostMutation(new Request("https://ops.example/api", {
    headers: { host: "ops.example", origin: "https://attacker.example" },
  })), /Origin/u);
});

test("role transition matrix keeps approval and evidence hand-offs actionable", () => {
  const subject = (overrides = {}) => ({
    assignedRole: "cargo-agent",
    originRole: "dispatcher",
    assignedTo: "Tổ hàng hóa",
    status: "new",
    workKind: "standard",
    ...overrides,
  });
  assert.deepEqual(workItemActionsFor(subject(), "cargo-agent"), ["comment", "claim", "escalate"]);
  assert.deepEqual(
    workItemActionsFor(subject({ status: "in_progress" }), "cargo-agent"),
    ["comment", "complete", "submit-approval", "escalate"],
  );
  assert.deepEqual(
    workItemActionsFor(subject({ status: "in_progress", workKind: "approval" }), "cargo-agent"),
    ["comment", "submit-approval", "escalate"],
  );
  assert.deepEqual(
    workItemActionsFor(subject({ status: "waiting_evidence" }), "cargo-agent"),
    ["comment", "resolve-evidence", "escalate"],
  );
  const auditWaiting = subject({
    assignedRole: "finance-officer",
    originRole: "finance-officer",
    status: "waiting_evidence",
    workKind: "audit",
  });
  assert.ok(workItemActionsFor(auditWaiting, "finance-officer").includes("resolve-evidence"));
  assert.ok(workItemActionsFor(auditWaiting, "auditor").includes("resolve-evidence"));
  const approval = subject({ assignedRole: "contract-sales", status: "waiting_approval", workKind: "approval" });
  assert.deepEqual(workItemActionsFor(approval, "operations-manager"), ["approve", "reject", "comment"]);
  assert.equal(workItemApprovalOwnerRole(approval), "contract-sales");
  assert.equal(workItemApprovalOwnerRole(subject({
    assignedRole: "operations-manager",
    originRole: "maintenance-technician",
    status: "waiting_approval",
    workKind: "approval",
  })), "maintenance-technician");
  assert.deepEqual(workItemActionsFor(subject(), "ticket-agent"), []);

  assert.deepEqual(planWorkItemTransition(subject(), "cargo-agent", "Nhân viên hàng hóa", "claim"), {
    status: "claimed",
    assignedRole: "cargo-agent",
    assignedTo: "Nhân viên hàng hóa",
    completed: false,
    notificationRoles: ["dispatcher"],
  });
  const submitted = planWorkItemTransition(
    subject({ status: "in_progress", workKind: "approval" }),
    "cargo-agent",
    "Nhân viên hàng hóa",
    "submit-approval",
  );
  assert.deepEqual(submitted, {
    status: "waiting_approval",
    assignedRole: "cargo-agent",
    assignedTo: "Tổ hàng hóa",
    completed: false,
    notificationRoles: ["operations-manager"],
  });
  assert.deepEqual(planWorkItemTransition(
    { ...subject({ status: "waiting_approval", workKind: "approval" }) },
    "operations-manager",
    "Quản lý vận hành",
    "approve",
  ), {
    status: "completed",
    assignedRole: "cargo-agent",
    assignedTo: "Tổ hàng hóa",
    completed: true,
    notificationRoles: ["cargo-agent"],
  });
  assert.deepEqual(planWorkItemTransition({
    ...subject({
      assignedRole: "operations-manager",
      originRole: "maintenance-technician",
      status: "waiting_approval",
      workKind: "approval",
    }),
  }, "operations-manager", "Quản lý vận hành", "reject"), {
    status: "rejected",
    assignedRole: "maintenance-technician",
    assignedTo: null,
    completed: false,
    notificationRoles: ["maintenance-technician"],
  });
  assert.deepEqual(planWorkItemTransition(
    subject({ status: "waiting_evidence" }),
    "cargo-agent",
    "Nhân viên hàng hóa",
    "resolve-evidence",
  ), {
    status: "in_progress",
    assignedRole: "cargo-agent",
    assignedTo: "Tổ hàng hóa",
    completed: false,
    notificationRoles: ["dispatcher"],
  });
  assert.deepEqual(planWorkItemTransition({
    ...subject({
      assignedRole: "finance-officer",
      originRole: "finance-officer",
      status: "waiting_evidence",
      workKind: "audit",
    }),
  }, "finance-officer", "Kế toán vận tải", "resolve-evidence"), {
    status: "in_progress",
    assignedRole: "auditor",
    assignedTo: null,
    completed: false,
    notificationRoles: ["auditor"],
  });
  assert.deepEqual(planWorkItemTransition({
    ...subject({
      assignedRole: "finance-officer",
      originRole: "finance-officer",
      status: "waiting_evidence",
      workKind: "audit",
    }),
  }, "finance-officer", "Kế toán vận tải", "comment"), {
    status: "waiting_evidence",
    assignedRole: "finance-officer",
    assignedTo: "Tổ hàng hóa",
    completed: false,
    notificationRoles: ["auditor"],
  });
  assert.throws(
    () => planWorkItemTransition(subject(), "ticket-agent", "Nhân viên bán vé", "claim"),
    /không thuộc phạm vi/u,
  );
});

test("repository enforces transactional, optimistic role workflows", async () => {
  const repository = await readFile("lib/server/db/work-center-repository.ts", "utf8");
  for (const table of ["work_items", "work_item_comments", "work_item_events", "role_notifications"]) {
    assert.match(repository, new RegExp(`public\\.${table}`));
  }
  assert.match(repository, /SELECT \* FROM public\.work_items WHERE id = \$1 FOR UPDATE/u);
  assert.match(repository, /version = version \+ 1/u);
  assert.match(repository, /WHERE id = \$1 AND version = \$6/u);
  assert.match(repository, /status = \$2::varchar\(24\)/u);
  assert.match(repository, /COALESCE\(completed_at, now\(\)\)/u);
  assert.match(repository, /!\["completed", "rejected"\]\.includes\(item\.status\)/u);
  assert.match(repository, /planWorkItemTransition/u);
  assert.match(repository, /INSERT INTO public\.work_item_events/u);
  assert.match(repository, /INSERT INTO public\.role_notifications/u);
  assert.match(repository, /await client\.query\("COMMIT"\)/u);
  assert.match(repository, /await client\.query\("ROLLBACK"\)/u);
});

test("Next 16 work center routes are dynamic, bounded and return no-store responses", async () => {
  const [collection, actions, notifications] = await Promise.all([
    readFile("app/api/v1/work-items/route.ts", "utf8"),
    readFile("app/api/v1/work-items/[id]/actions/route.ts", "utf8"),
    readFile("app/api/v1/role-notifications/route.ts", "utf8"),
  ]);
  assert.match(collection, /export async function POST/u);
  assert.match(collection, /decodeCreateWorkItemBody\(await readBoundedJson\(request\)\)/u);
  assert.match(actions, /params: Promise<\{ id: string \}>/u);
  assert.match(actions, /\(await context\.params\)\.id/u);
  assert.match(actions, /decodeWorkItemActionBody\(await readBoundedJson\(request\)\)/u);
  assert.match(notifications, /export async function PUT/u);
  assert.match(notifications, /decodeNotificationReadBody\(await readBoundedJson\(request\)\)/u);
  for (const source of [collection, actions, notifications]) {
    assert.match(source, /force-dynamic/u);
    assert.match(source, /cache-control": "no-store"/u);
  }
  for (const source of [collection, actions, notifications]) {
    if (/export async function (?:POST|PUT)/u.test(source)) assert.match(source, /requireSameHostMutation\(request\)/u);
  }
});
