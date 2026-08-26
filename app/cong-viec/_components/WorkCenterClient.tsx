"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_ROLES, type DemoRoleId } from "../../../lib/access-control";
import { workItemActionsFor, type WorkCenterRoleId } from "../../../lib/work-center";
import { useDemoAccess } from "../../_components/access/DemoAccessProvider";
import {
  createWorkItem,
  fetchRoleNotifications,
  fetchWorkCenter,
  markNotificationsRead,
  performWorkAction,
  type RoleNotification,
  type WorkAction,
  type WorkCenterData,
  type WorkItem,
  type WorkItemPriority,
  type WorkItemStatus,
} from "../_lib/work-center-client";
import styles from "./WorkCenter.module.css";

type QueueFilter = "all" | "new" | "in_progress" | "waiting" | "overdue" | "completed";

type ActionIntent = {
  item: WorkItem;
  action: WorkAction;
  label: string;
  noteLabel: string;
  placeholder: string;
  minLength: number;
};

type AssignmentDraft = {
  title: string;
  description: string;
  module: string;
  assignedRole: DemoRoleId;
  priority: WorkItemPriority;
  dueAt: string;
};

const EMPTY_ASSIGNMENT: AssignmentDraft = {
  title: "",
  description: "",
  module: "dispatch",
  assignedRole: "dispatcher",
  priority: "normal",
  dueAt: "",
};

const EMPTY_SUMMARY: WorkCenterData["summary"] = {
  total: 0,
  new: 0,
  claimed: 0,
  inProgress: 0,
  waitingApproval: 0,
  waitingEvidence: 0,
  overdue: 0,
  completed: 0,
  rejected: 0,
};

const STATUS_META: Record<WorkItemStatus, { label: string; tone: string }> = {
  new: { label: "Việc mới", tone: styles.toneNew },
  claimed: { label: "Đã nhận", tone: styles.toneClaimed },
  in_progress: { label: "Đang xử lý", tone: styles.toneProgress },
  waiting_approval: { label: "Chờ phê duyệt", tone: styles.toneWaiting },
  waiting_evidence: { label: "Chờ chứng từ", tone: styles.toneWaiting },
  completed: { label: "Hoàn tất", tone: styles.toneDone },
  rejected: { label: "Đã từ chối", tone: styles.toneRejected },
};

const PRIORITY_META: Record<WorkItemPriority, { label: string; tone: string }> = {
  urgent: { label: "Khẩn cấp", tone: styles.priorityUrgent },
  high: { label: "Ưu tiên cao", tone: styles.priorityHigh },
  normal: { label: "Bình thường", tone: styles.priorityNormal },
  low: { label: "Ưu tiên thấp", tone: styles.priorityLow },
};

const MODULE_META: Record<string, { label: string; short: string; route: string }> = {
  cargo: { label: "Hàng hóa", short: "HH", route: "/don-hang" },
  dispatch: { label: "Điều phối", short: "ĐP", route: "/dieu-phoi" },
  passenger: { label: "Vé hành khách", short: "VX", route: "/ve-xe" },
  contract: { label: "Hợp đồng", short: "HĐ", route: "/hop-dong" },
  maintenance: { label: "Bảo dưỡng", short: "BD", route: "/bao-duong" },
  billing: { label: "Tài chính", short: "TC", route: "/tai-chinh" },
  reporting: { label: "Báo cáo", short: "BC", route: "/bao-cao" },
  audit: { label: "Kiểm soát", short: "KS", route: "/bao-cao" },
};

const ACTION_LABELS: Record<WorkAction, string> = {
  claim: "Nhận việc",
  start: "Bắt đầu xử lý",
  complete: "Hoàn tất công việc",
  "submit-approval": "Trình phê duyệt",
  approve: "Phê duyệt",
  reject: "Từ chối",
  escalate: "Báo cấp quản lý",
  "request-evidence": "Yêu cầu chứng từ",
  "resolve-evidence": "Xác nhận đã bổ sung",
  comment: "Thêm trao đổi",
};

const NOTE_ACTIONS = new Set<WorkAction>([
  "submit-approval",
  "reject",
  "escalate",
  "request-evidence",
  "resolve-evidence",
  "comment",
]);

function roleLabel(roleId: string) {
  return roleId in DEMO_ROLES
    ? DEMO_ROLES[roleId as DemoRoleId].label
    : roleId;
}

function moduleMeta(module: string) {
  return MODULE_META[module] ?? { label: module, short: module.slice(0, 2).toUpperCase(), route: "/" };
}

function parseTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function formatDateTime(value: string | null | undefined) {
  const time = parseTime(value);
  if (time === null) return "Chưa đặt thời hạn";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);
}

function dueLabel(item: WorkItem, now: number) {
  if (item.status === "completed") return "Đã hoàn tất";
  if (item.status === "rejected") return "Đã kết thúc";
  const due = parseTime(item.dueAt);
  if (due === null) return "Không giới hạn SLA";
  const minutes = Math.round((due - now) / 60_000);
  const absolute = Math.abs(minutes);
  if (minutes < 0) {
    if (absolute < 60) return `Quá hạn ${absolute} phút`;
    if (absolute < 1_440) return `Quá hạn ${Math.round(absolute / 60)} giờ`;
    return `Quá hạn ${Math.round(absolute / 1_440)} ngày`;
  }
  if (minutes < 60) return `Còn ${Math.max(1, minutes)} phút`;
  if (minutes < 1_440) return `Còn ${Math.round(minutes / 60)} giờ`;
  return `Còn ${Math.round(minutes / 1_440)} ngày`;
}

function isOverdue(item: WorkItem, now: number) {
  if (item.status === "completed" || item.status === "rejected") return false;
  const due = parseTime(item.dueAt);
  return due !== null && due < now;
}

function matchesQueue(item: WorkItem, queue: QueueFilter, now: number) {
  if (queue === "all") return true;
  if (queue === "overdue") return isOverdue(item, now);
  if (queue === "new") return item.status === "new";
  if (queue === "in_progress") return item.status === "claimed" || item.status === "in_progress";
  if (queue === "waiting") return item.status === "waiting_approval" || item.status === "waiting_evidence";
  return item.status === "completed" || item.status === "rejected";
}

function availableActions(item: WorkItem, roleId: DemoRoleId): WorkAction[] {
  const order: WorkAction[] = [
    "claim", "start", "complete", "submit-approval", "approve", "reject",
    "request-evidence", "resolve-evidence", "escalate", "comment",
  ];
  return [...workItemActionsFor({
    assignedRole: item.assignedRole as WorkCenterRoleId,
    originRole: item.originRole as WorkCenterRoleId,
    status: item.status,
    workKind: item.workKind,
  }, roleId)].sort((left, right) => order.indexOf(left) - order.indexOf(right));
}

function intentFor(item: WorkItem, action: WorkAction): ActionIntent {
  const actionCopy: Partial<Record<WorkAction, Pick<ActionIntent, "noteLabel" | "placeholder" | "minLength">>> = {
    "submit-approval": {
      noteLabel: "Nội dung trình duyệt",
      placeholder: "Tóm tắt kết quả xử lý và nội dung cần phê duyệt…",
      minLength: 10,
    },
    reject: {
      noteLabel: "Lý do từ chối",
      placeholder: "Nêu rõ điểm chưa đáp ứng và hướng xử lý tiếp theo…",
      minLength: 10,
    },
    escalate: {
      noteLabel: "Lý do cần hỗ trợ",
      placeholder: "Mô tả vướng mắc, mức độ ảnh hưởng và đề xuất xử lý…",
      minLength: 10,
    },
    "request-evidence": {
      noteLabel: "Chứng từ cần bổ sung",
      placeholder: "Ghi rõ tên chứng từ, nội dung cần đối chiếu và thời hạn…",
      minLength: 10,
    },
    "resolve-evidence": {
      noteLabel: "Nội dung đã bổ sung",
      placeholder: "Liệt kê chứng từ hoặc thông tin đã hoàn thiện…",
      minLength: 10,
    },
    comment: {
      noteLabel: "Nội dung trao đổi",
      placeholder: "Nhập cập nhật hoặc thông tin phối hợp…",
      minLength: 3,
    },
  };
  const copy = actionCopy[action] ?? {
    noteLabel: "Ghi chú",
    placeholder: "Bổ sung thông tin cho thao tác này…",
    minLength: 0,
  };
  return { item, action, label: ACTION_LABELS[action], ...copy };
}

function actionTone(action: WorkAction) {
  if (action === "claim" || action === "start" || action === "complete" || action === "approve") {
    return styles.actionPrimary;
  }
  if (action === "reject") return styles.actionDanger;
  return styles.actionSecondary;
}

function StatusBadge({ status }: { status: WorkItemStatus }) {
  const meta = STATUS_META[status];
  return <span className={`${styles.statusBadge} ${meta.tone}`}><i aria-hidden="true" />{meta.label}</span>;
}

function PriorityBadge({ priority }: { priority: WorkItemPriority }) {
  const meta = PRIORITY_META[priority];
  return <span className={`${styles.priorityBadge} ${meta.tone}`}>{meta.label}</span>;
}

function Timeline({ item }: { item: WorkItem }) {
  const entries = [
    ...item.events.map((event) => ({
      id: `event-${event.id}`,
      date: event.occurredAt,
      title: ACTION_LABELS[event.action as WorkAction] ?? event.action,
      note: event.note,
      actor: event.actorLabel ?? (event.actorRole ? roleLabel(event.actorRole) : "Hệ thống"),
      kind: "event" as const,
    })),
    ...item.comments.map((comment) => ({
      id: `comment-${comment.id}`,
      date: comment.createdAt,
      title: "Trao đổi công việc",
      note: comment.body,
      actor: comment.authorLabel ?? (comment.authorRole ? roleLabel(comment.authorRole) : "Người phụ trách"),
      kind: "comment" as const,
    })),
  ].sort((left, right) => (parseTime(right.date) ?? 0) - (parseTime(left.date) ?? 0));

  if (!entries.length) {
    return <p className={styles.timelineEmpty}>Chưa có cập nhật nào cho công việc này.</p>;
  }

  return (
    <ol className={styles.timeline} aria-label="Lịch sử xử lý công việc">
      {entries.map((entry) => (
        <li key={entry.id}>
          <span className={entry.kind === "comment" ? styles.timelineComment : styles.timelineEvent} aria-hidden="true">
            {entry.kind === "comment" ? "↗" : "✓"}
          </span>
          <div>
            <strong>{entry.title}</strong>
            <small>{entry.actor} · {formatDateTime(entry.date)}</small>
            {entry.note ? <p>{entry.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function WorkCenterClient() {
  const { roleId, role } = useDemoAccess();
  const identity = useMemo(() => ({ roleId, roleLabel: role.label }), [role.label, roleId]);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [notifications, setNotifications] = useState<RoleNotification[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [queue, setQueue] = useState<QueueFilter>("all");
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | WorkItemPriority>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyItemId, setBusyItemId] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [intent, setIntent] = useState<ActionIntent | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentDraft>(EMPTY_ASSIGNMENT);
  const [assignmentError, setAssignmentError] = useState("");
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const assignmentTitleRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (signal?: AbortSignal, quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");

    const [workResult, notificationResult] = await Promise.allSettled([
      fetchWorkCenter(identity, signal),
      fetchRoleNotifications(identity, signal),
    ]);

    if (workResult.status === "rejected") {
      if (workResult.reason instanceof DOMException && workResult.reason.name === "AbortError") return;
      setError(workResult.reason instanceof Error ? workResult.reason.message : "Không thể tải hàng đợi công việc.");
    } else {
      setItems(workResult.value.items);
      setSummary(workResult.value.summary);
      setSelectedId((current) => workResult.value.items.some((item) => item.id === current)
        ? current
        : workResult.value.items[0]?.id ?? "");
    }

    if (notificationResult.status === "fulfilled") setNotifications(notificationResult.value);
    if (!signal?.aborted) {
      setLoading(false);
      setRefreshing(false);
    }
  }, [identity]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => setAnnouncement(""), 5_000);
    return () => window.clearTimeout(timer);
  }, [announcement]);

  useEffect(() => {
    if (intent) noteTextareaRef.current?.focus();
  }, [intent]);

  useEffect(() => {
    if (assignmentOpen) assignmentTitleRef.current?.focus();
  }, [assignmentOpen]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const modules = useMemo(() => [...new Set(items.map((item) => item.module))], [items]);
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    return items.filter((item) => {
      if (!matchesQueue(item, queue, now)) return false;
      if (moduleFilter !== "all" && item.module !== moduleFilter) return false;
      if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
      if (!normalizedQuery) return true;
      return [item.id, item.title, item.description, item.resourceId, moduleMeta(item.module).label]
        .some((value) => value?.toLocaleLowerCase("vi-VN").includes(normalizedQuery));
    });
  }, [items, moduleFilter, now, priorityFilter, query, queue]);

  const selectedItem = visibleItems.find((item) => item.id === selectedId)
    ?? visibleItems[0]
    ?? null;
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);

  async function executeAction(item: WorkItem, action: WorkAction, actionNote = "") {
    setBusyItemId(item.id);
    setNoteError("");
    try {
      await performWorkAction(identity, item.id, action, actionNote);
      setIntent(null);
      setNote("");
      setAnnouncement(`${ACTION_LABELS[action]} thành công cho “${item.title}”.`);
      await load(undefined, true);
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Không thể cập nhật công việc.";
      if (intent) setNoteError(message);
      else setAnnouncement(message);
    } finally {
      setBusyItemId("");
    }
  }

  function requestAction(item: WorkItem, action: WorkAction) {
    if (NOTE_ACTIONS.has(action)) {
      setNote("");
      setNoteError("");
      setIntent(intentFor(item, action));
      return;
    }
    void executeAction(item, action);
  }

  function submitNoteAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intent) return;
    const meaningfulNote = note.trim();
    if (meaningfulNote.length < intent.minLength) {
      setNoteError(`Vui lòng nhập ít nhất ${intent.minLength} ký tự để người nhận hiểu rõ nội dung.`);
      return;
    }
    void executeAction(intent.item, intent.action, meaningfulNote);
  }

  async function handleMarkNotificationsRead(ids: number[]) {
    try {
      await markNotificationsRead(identity, ids);
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ids.includes(notification.id)
        ? { ...notification, readAt }
        : notification));
      setAnnouncement(`Đã đánh dấu ${ids.length} thông báo là đã đọc.`);
    } catch (notificationError) {
      setAnnouncement(notificationError instanceof Error ? notificationError.message : "Không thể cập nhật thông báo.");
    }
  }

  function openNotification(notification: RoleNotification) {
    if (notification.workItemId) {
      setQueue("all");
      setSelectedId(notification.workItemId);
    }
    if (!notification.readAt) void handleMarkNotificationsRead([notification.id]);
  }

  function openAssignmentDialog() {
    const defaultDue = new Date(Date.now() + 24 * 60 * 60 * 1_000);
    defaultDue.setSeconds(0, 0);
    const offset = defaultDue.getTimezoneOffset() * 60_000;
    setAssignment({ ...EMPTY_ASSIGNMENT, dueAt: new Date(defaultDue.getTime() - offset).toISOString().slice(0, 16) });
    setAssignmentError("");
    setAssignmentOpen(true);
  }

  async function submitAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (assignment.title.trim().length < 5 || assignment.description.trim().length < 10) {
      setAssignmentError("Tiêu đề cần ít nhất 5 ký tự và mô tả cần ít nhất 10 ký tự.");
      return;
    }
    const dueAt = new Date(assignment.dueAt);
    if (!assignment.dueAt || !Number.isFinite(dueAt.getTime()) || dueAt.getTime() <= Date.now()) {
      setAssignmentError("Hạn xử lý phải là một thời điểm trong tương lai.");
      return;
    }

    setCreatingAssignment(true);
    setAssignmentError("");
    try {
      const assignedRole = DEMO_ROLES[assignment.assignedRole];
      await createWorkItem(identity, {
        module: assignment.module,
        workKind: assignment.assignedRole === "auditor" ? "audit" : "standard",
        title: assignment.title.trim(),
        description: assignment.description.trim(),
        resourceType: "work_assignment",
        resourceId: null,
        routePath: moduleMeta(assignment.module).route,
        priority: assignment.priority,
        assignedRole: assignment.assignedRole,
        dueAt: dueAt.toISOString(),
      });
      setAssignmentOpen(false);
      setAnnouncement(`Đã giao “${assignment.title.trim()}” cho ${assignedRole.label}.`);
      await load(undefined, true);
    } catch (createError) {
      setAssignmentError(createError instanceof Error ? createError.message : "Không thể giao công việc.");
    } finally {
      setCreatingAssignment(false);
    }
  }

  const queueMetrics: { id: QueueFilter; label: string; count: number; short: string }[] = [
    { id: "new", label: "Việc mới", count: summary.new, short: "MỚI" },
    { id: "in_progress", label: "Đang xử lý", count: summary.claimed + summary.inProgress, short: "ĐXL" },
    { id: "waiting", label: "Đang chờ", count: summary.waitingApproval + summary.waitingEvidence, short: "CHỜ" },
    { id: "overdue", label: "Quá hạn", count: summary.overdue, short: "SLA" },
    { id: "completed", label: "Đã hoàn tất", count: summary.completed, short: "XONG" },
  ];

  return (
    <div className={styles.page}>
      {announcement ? (
        <div className={styles.toast} role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <p>{announcement}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setAnnouncement("")}>×</button>
        </div>
      ) : null}

      <section className={styles.hero} aria-labelledby="work-center-heading">
        <div className={styles.heroCopy}>
          <span>KHÔNG GIAN THEO VAI TRÒ · {role.short}</span>
          <h2 id="work-center-heading">Một hàng đợi, trọn ca làm việc.</h2>
          <p>Ưu tiên đúng việc, phối hợp đúng người và theo dõi toàn bộ tiến trình ngay tại một nơi.</p>
        </div>
        <div className={styles.roleCard}>
          <span className={styles.roleAvatar}>{role.short}</span>
          <div>
            <small>Không gian hiện tại</small>
            <strong>{role.label}</strong>
            <p>{role.scopeLabel}</p>
          </div>
          <i aria-label="Đang trực tuyến" title="Đang trực tuyến" />
        </div>
      </section>

      <section className={styles.metrics} aria-label="Tổng hợp công việc theo trạng thái">
        {queueMetrics.map((metric) => (
          <button
            key={metric.id}
            className={queue === metric.id ? styles.metricActive : styles.metric}
            type="button"
            aria-pressed={queue === metric.id}
            onClick={() => setQueue((current) => current === metric.id ? "all" : metric.id)}
          >
            <span className={metric.id === "overdue" ? styles.metricDangerIcon : styles.metricIcon}>{metric.short}</span>
            <span><small>{metric.label}</small><strong>{metric.count}</strong></span>
            <i aria-hidden="true">→</i>
          </button>
        ))}
      </section>

      {unreadNotifications.length ? (
        <section className={styles.notificationBar} aria-labelledby="notification-heading">
          <span className={styles.bell} aria-hidden="true">!</span>
          <div>
            <p id="notification-heading"><strong>{unreadNotifications.length} thông báo mới</strong> trong ca làm việc</p>
            <div className={styles.notificationList}>
              {unreadNotifications.slice(0, 3).map((notification) => (
                <button key={notification.id} type="button" onClick={() => openNotification(notification)}>
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                </button>
              ))}
            </div>
          </div>
          <button className={styles.markReadButton} type="button" onClick={() => void handleMarkNotificationsRead(unreadNotifications.map(({ id }) => id))}>
            Đánh dấu đã đọc
          </button>
        </section>
      ) : null}

      <section className={styles.workspace} aria-labelledby="queue-heading">
        <div className={styles.queuePanel}>
          <header className={styles.panelHeading}>
            <div>
              <span>Công việc được giao</span>
              <h2 id="queue-heading">Hàng đợi của tôi</h2>
              <p>{summary.total} đầu việc trong phạm vi của {role.label.toLocaleLowerCase("vi-VN")}</p>
            </div>
            <div className={styles.headingActions}>
              {roleId === "operations-manager" ? (
                <button className={styles.assignButton} type="button" onClick={openAssignmentDialog}>
                  <span aria-hidden="true">＋</span> Giao công việc
                </button>
              ) : null}
              <button className={styles.refreshButton} type="button" disabled={refreshing} onClick={() => void load(undefined, true)}>
                <span aria-hidden="true">↻</span>{refreshing ? "Đang cập nhật" : "Cập nhật"}
              </button>
            </div>
          </header>

          <div className={styles.filters}>
            <label className={styles.searchField}>
              <span className={styles.srOnly}>Tìm công việc</span>
              <i aria-hidden="true">⌕</i>
              <input
                type="search"
                value={query}
                placeholder="Tìm theo mã, nội dung hoặc hồ sơ…"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span className={styles.srOnly}>Lọc theo phân hệ</span>
              <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
                <option value="all">Tất cả phân hệ</option>
                {modules.map((moduleId) => <option key={moduleId} value={moduleId}>{moduleMeta(moduleId).label}</option>)}
              </select>
            </label>
            <label>
              <span className={styles.srOnly}>Lọc theo mức ưu tiên</span>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)}>
                <option value="all">Mọi ưu tiên</option>
                {(Object.keys(PRIORITY_META) as WorkItemPriority[]).map((priority) => (
                  <option key={priority} value={priority}>{PRIORITY_META[priority].label}</option>
                ))}
              </select>
            </label>
            {(queue !== "all" || query || moduleFilter !== "all" || priorityFilter !== "all") ? (
              <button className={styles.clearFilters} type="button" onClick={() => {
                setQueue("all");
                setQuery("");
                setModuleFilter("all");
                setPriorityFilter("all");
              }}>Xóa lọc</button>
            ) : null}
          </div>

          <div className={styles.resultBar}>
            <span><strong>{visibleItems.length}</strong> công việc phù hợp</span>
            {summary.overdue ? <small><i aria-hidden="true" /> {summary.overdue} việc cần xử lý SLA</small> : <small>Tiến độ đang trong kiểm soát</small>}
          </div>

          {loading ? (
            <div className={styles.skeletonList} role="status" aria-label="Đang tải công việc">
              {[1, 2, 3, 4].map((key) => <span key={key} />)}
            </div>
          ) : error ? (
            <div className={styles.errorState} role="alert">
              <span aria-hidden="true">!</span>
              <h3>Chưa tải được hàng đợi</h3>
              <p>{error}</p>
              <button type="button" onClick={() => void load()}>Thử lại</button>
            </div>
          ) : visibleItems.length ? (
            <ol className={styles.taskList} aria-label="Danh sách công việc">
              {visibleItems.map((item) => {
                const moduleInfo = moduleMeta(item.module);
                const overdue = isOverdue(item, now);
                return (
                  <li key={item.id}>
                    <button
                      className={selectedItem?.id === item.id ? styles.taskCardSelected : styles.taskCard}
                      type="button"
                      aria-pressed={selectedItem?.id === item.id}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <span className={styles.moduleMark}>{moduleInfo.short}</span>
                      <span className={styles.taskCopy}>
                        <span className={styles.taskTopline}>
                          <span><code>{item.id}</code><small>{moduleInfo.label}</small></span>
                          <PriorityBadge priority={item.priority} />
                        </span>
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                        <span className={styles.taskFooter}>
                          <StatusBadge status={item.status} />
                          <span className={overdue ? styles.dueOverdue : styles.due}><i aria-hidden="true">◷</i>{dueLabel(item, now)}</span>
                          {item.comments.length ? <span className={styles.commentCount}>↗ {item.comments.length}</span> : null}
                        </span>
                      </span>
                      <span className={styles.cardArrow} aria-hidden="true">›</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className={styles.emptyState}>
              <span aria-hidden="true">✓</span>
              <h3>Không có công việc phù hợp</h3>
              <p>Hãy thay đổi bộ lọc hoặc chọn một nhóm trạng thái khác.</p>
              <button type="button" onClick={() => {
                setQueue("all");
                setQuery("");
                setModuleFilter("all");
                setPriorityFilter("all");
              }}>Hiển thị tất cả</button>
            </div>
          )}
        </div>

        <aside className={styles.detailPanel} aria-labelledby="work-detail-heading">
          {selectedItem ? (
            <>
              <div className={styles.detailHeader}>
                <span className={styles.detailModule}>{moduleMeta(selectedItem.module).short}</span>
                <div>
                  <span>{moduleMeta(selectedItem.module).label} · {selectedItem.resourceId ?? selectedItem.id}</span>
                  <h2 id="work-detail-heading">{selectedItem.title}</h2>
                </div>
                <PriorityBadge priority={selectedItem.priority} />
              </div>

              <p className={styles.detailDescription}>{selectedItem.description}</p>

              <div className={styles.detailStatusRow}>
                <StatusBadge status={selectedItem.status} />
                <span className={isOverdue(selectedItem, now) ? styles.dueOverdue : styles.due}>
                  <i aria-hidden="true">◷</i>{dueLabel(selectedItem, now)}
                </span>
              </div>

              <dl className={styles.detailGrid}>
                <div><dt>Phân hệ</dt><dd>{moduleMeta(selectedItem.module).label}</dd></div>
                <div><dt>Hồ sơ liên kết</dt><dd><code>{selectedItem.resourceId ?? "Chưa liên kết"}</code></dd></div>
                <div><dt>Vai trò xử lý</dt><dd>{roleLabel(selectedItem.assignedRole)}</dd></div>
                <div><dt>Khởi tạo bởi</dt><dd>{roleLabel(selectedItem.originRole)}</dd></div>
                <div><dt>Người nhận</dt><dd>{selectedItem.assignedTo || "Chưa có người nhận"}</dd></div>
                <div><dt>Hạn xử lý</dt><dd>{formatDateTime(selectedItem.dueAt)}</dd></div>
              </dl>

              <Link className={styles.resourceLink} href={selectedItem.routePath || moduleMeta(selectedItem.module).route}>
                <span aria-hidden="true">↗</span>
                <span><small>Mở hồ sơ nghiệp vụ</small><strong>{selectedItem.resourceId ?? selectedItem.id}</strong></span>
                <i aria-hidden="true">→</i>
              </Link>

              <section className={styles.actionSection} aria-labelledby="action-heading">
                <div className={styles.sectionHeading}>
                  <div><span>Bước tiếp theo</span><h3 id="action-heading">Xử lý công việc</h3></div>
                  {busyItemId === selectedItem.id ? <small role="status">Đang ghi nhận…</small> : null}
                </div>
                <div className={styles.actions}>
                  {availableActions(selectedItem, roleId).map((action) => (
                    <button
                      className={actionTone(action)}
                      key={action}
                      type="button"
                      disabled={Boolean(busyItemId)}
                      onClick={() => requestAction(selectedItem, action)}
                    >
                      {ACTION_LABELS[action]}
                    </button>
                  ))}
                </div>
              </section>

              <section className={styles.historySection} aria-labelledby="history-heading">
                <div className={styles.sectionHeading}>
                  <div><span>Nhật ký xuyên suốt</span><h3 id="history-heading">Tiến trình & trao đổi</h3></div>
                  <small>{selectedItem.events.length + selectedItem.comments.length} cập nhật</small>
                </div>
                <Timeline item={selectedItem} />
              </section>
            </>
          ) : (
            <div className={styles.detailEmpty}>
              <span aria-hidden="true">CV</span>
              <h2 id="work-detail-heading">Chọn một công việc</h2>
              <p>Thông tin chi tiết, lịch sử và thao tác phù hợp sẽ xuất hiện tại đây.</p>
            </div>
          )}
        </aside>
      </section>

      {intent ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target && !busyItemId) setIntent(null);
        }}>
          <dialog className={styles.noteDialog} open aria-modal="true" aria-labelledby="note-dialog-heading">
            <form onSubmit={submitNoteAction}>
              <header>
                <span>{moduleMeta(intent.item.module).short}</span>
                <div><small>{intent.item.id}</small><h2 id="note-dialog-heading">{intent.label}</h2></div>
                <button type="button" aria-label="Đóng" disabled={Boolean(busyItemId)} onClick={() => setIntent(null)}>×</button>
              </header>
              <p>“{intent.item.title}”</p>
              <label>
                <span>{intent.noteLabel} <b>*</b></span>
                <textarea
                  ref={noteTextareaRef}
                  rows={5}
                  value={note}
                  placeholder={intent.placeholder}
                  aria-describedby="note-help note-error"
                  onChange={(event) => {
                    setNote(event.target.value);
                    if (noteError) setNoteError("");
                  }}
                />
              </label>
              <div className={styles.noteHelp}>
                <small id="note-help">Tối thiểu {intent.minLength} ký tự · Nội dung được lưu vào nhật ký.</small>
                <small>{note.trim().length} ký tự</small>
              </div>
              {noteError ? <p className={styles.noteError} id="note-error" role="alert">{noteError}</p> : <span id="note-error" />}
              <footer>
                <button type="button" disabled={Boolean(busyItemId)} onClick={() => setIntent(null)}>Hủy</button>
                <button className={intent.action === "reject" ? styles.confirmDanger : styles.confirmButton} type="submit" disabled={Boolean(busyItemId)}>
                  {busyItemId ? "Đang ghi nhận…" : intent.label}
                </button>
              </footer>
            </form>
          </dialog>
        </div>
      ) : null}

      {assignmentOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target && !creatingAssignment) setAssignmentOpen(false);
        }}>
          <dialog className={`${styles.noteDialog} ${styles.assignmentDialog}`} open aria-modal="true" aria-labelledby="assignment-heading">
            <form onSubmit={submitAssignment}>
              <header>
                <span>CV</span>
                <div><small>ĐIỀU HÀNH CÔNG VIỆC</small><h2 id="assignment-heading">Giao công việc mới</h2></div>
                <button type="button" aria-label="Đóng" disabled={creatingAssignment} onClick={() => setAssignmentOpen(false)}>×</button>
              </header>
              <p>Đầu việc sẽ xuất hiện ngay trong hàng đợi của vai trò được chọn.</p>
              <div className={styles.assignmentGrid}>
                <label className={styles.assignmentWide}>
                  <span>Tiêu đề công việc <b>*</b></span>
                  <input ref={assignmentTitleRef} value={assignment.title} placeholder="Ví dụ: Xác minh hồ sơ chuyến QN-08" onChange={(event) => setAssignment((current) => ({ ...current, title: event.target.value }))} />
                </label>
                <label className={styles.assignmentWide}>
                  <span>Mô tả và kết quả cần đạt <b>*</b></span>
                  <textarea rows={3} value={assignment.description} placeholder="Mô tả bối cảnh, yêu cầu xử lý và kết quả bàn giao…" onChange={(event) => setAssignment((current) => ({ ...current, description: event.target.value }))} />
                </label>
                <label>
                  <span>Phân hệ</span>
                  <select value={assignment.module} onChange={(event) => setAssignment((current) => ({ ...current, module: event.target.value }))}>
                    {Object.entries(MODULE_META).map(([module, meta]) => <option key={module} value={module}>{meta.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Giao cho vai trò</span>
                  <select value={assignment.assignedRole} onChange={(event) => setAssignment((current) => ({ ...current, assignedRole: event.target.value as DemoRoleId }))}>
                    {Object.values(DEMO_ROLES).filter(({ id }) => id !== "operations-manager").map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Mức ưu tiên</span>
                  <select value={assignment.priority} onChange={(event) => setAssignment((current) => ({ ...current, priority: event.target.value as WorkItemPriority }))}>
                    {(Object.keys(PRIORITY_META) as WorkItemPriority[]).map((priority) => <option key={priority} value={priority}>{PRIORITY_META[priority].label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Hạn xử lý <b>*</b></span>
                  <input type="datetime-local" value={assignment.dueAt} onChange={(event) => setAssignment((current) => ({ ...current, dueAt: event.target.value }))} />
                </label>
              </div>
              {assignmentError ? <p className={styles.noteError} role="alert">{assignmentError}</p> : null}
              <footer>
                <button type="button" disabled={creatingAssignment} onClick={() => setAssignmentOpen(false)}>Hủy</button>
                <button className={styles.confirmButton} type="submit" disabled={creatingAssignment}>{creatingAssignment ? "Đang giao việc…" : "Giao công việc"}</button>
              </footer>
            </form>
          </dialog>
        </div>
      ) : null}
    </div>
  );
}
