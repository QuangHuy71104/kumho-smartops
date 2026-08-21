"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PILOT_ORDER_STATUSES,
  PILOT_SERVICE_LEVELS,
  decodePilotOrderEnvelope,
  decodePilotOrdersEnvelope,
  decodePilotPrincipalEnvelope,
  decodePilotProblem,
  decodePilotReferenceEnvelope,
  formatPilotDate,
  formatPilotMoney,
  formatPilotWeight,
  isSafeReasonCode,
  pilotIdempotencyKey,
  pilotOrderStatusLabel,
  pilotServiceLevelLabel,
  pilotTransitionTargets,
  type PilotCargoOrder,
  type PilotOrderStatus,
  type PilotPrincipal,
  type PilotProblem,
  type PilotReferenceData,
  type PilotServiceLevel,
} from "../_lib/pilot-orders";
import styles from "../page.module.css";

type WorkspacePhase = "loading" | "ready" | "unauthenticated" | "error";
type BusyOperation = "refresh" | "create" | "transition" | null;

type CreateFormState = {
  owningBranchId: string;
  serviceLevel: PilotServiceLevel;
  originLocationId: string;
  destinationLocationId: string;
  packageCount: string;
  weightKilograms: string;
  declaredValueMinor: string;
  slaDueAt: string;
};

type PendingMutationKey = {
  fingerprint: string;
  value: string;
};

const statusClass: Record<PilotOrderStatus, string> = {
  draft: styles.statusNew,
  quoted: styles.statusNew,
  confirmed: styles.statusConfirmed,
  received: styles.statusPickup,
  loaded: styles.statusPickup,
  in_transit: styles.statusTransit,
  arrived: styles.statusTransit,
  delivered: styles.statusDone,
  reconciled: styles.statusDone,
  exception: styles.statusRisk,
  cancelled: styles.statusRisk,
};

class PilotApiError extends Error {
  readonly status: number;
  readonly problem: PilotProblem;

  constructor(problem: PilotProblem) {
    super(problem.detail);
    this.name = "PilotApiError";
    this.status = problem.status;
    this.problem = problem;
  }
}

async function requestJson<T>(
  input: string,
  decoder: (value: unknown) => T,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: {
      accept: "application/json, application/problem+json",
      ...init.headers,
    },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new PilotApiError(decodePilotProblem(payload, response.status));
  try {
    return decoder(payload);
  } catch {
    throw new PilotApiError(decodePilotProblem(null, 502));
  }
}

function localDateTimeAt(timestamp: number) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function futureLocalDateTime(hours = 24) {
  return localDateTimeAt(Date.now() + hours * 60 * 60 * 1000);
}

function permissionCoversBranch(
  principal: PilotPrincipal | null,
  permission: string,
  branchId: string,
) {
  if (!principal?.permissions.includes(permission)) return false;
  const scope = principal?.permissionScopes[permission];
  return scope === "*" || Boolean(scope?.includes(branchId));
}

function creatableBranches(
  referenceData: PilotReferenceData,
  principal: PilotPrincipal | null,
) {
  return referenceData.branches.filter((branch) => (
    permissionCoversBranch(principal, "cargo-order:create", branch.id)
  ));
}

function initialCreateForm(
  referenceData?: PilotReferenceData,
  principal: PilotPrincipal | null = null,
): CreateFormState {
  const firstCreatableBranch = referenceData
    ? creatableBranches(referenceData, principal)[0]
    : undefined;
  return {
    owningBranchId: firstCreatableBranch?.id ?? "",
    serviceLevel: "standard",
    originLocationId: referenceData?.locations[0]?.id ?? "",
    destinationLocationId: referenceData?.locations[1]?.id ?? "",
    packageCount: "1",
    weightKilograms: "1",
    declaredValueMinor: "",
    slaDueAt: futureLocalDateTime(),
  };
}

function reasonForTarget(target: PilotOrderStatus | "") {
  const reasons: Partial<Record<PilotOrderStatus, string>> = {
    quoted: "QUOTE_APPROVED",
    confirmed: "CUSTOMER_CONFIRMED",
    received: "CARGO_RECEIVED",
    loaded: "CARGO_LOADED",
    in_transit: "DEPARTURE_CONFIRMED",
    arrived: "ARRIVAL_CONFIRMED",
    delivered: "DELIVERY_CONFIRMED",
    reconciled: "RECONCILIATION_COMPLETED",
    exception: "OPERATIONAL_REVIEW_REQUIRED",
    cancelled: "OPERATION_CANCELLED",
  };
  return target ? reasons[target] ?? "STATUS_UPDATED" : "";
}

function mutationKey(
  current: PendingMutationKey | null,
  fingerprint: string,
  operation: "create" | "transition",
) {
  return current?.fingerprint === fingerprint
    ? current
    : { fingerprint, value: pilotIdempotencyKey(operation) };
}

function StatusBadge({ status }: { status: PilotOrderStatus }) {
  return (
    <span className={`${styles.statusBadge} ${statusClass[status]}`}>
      {pilotOrderStatusLabel(status)}
    </span>
  );
}

function WorkspaceState({
  phase,
  problem,
  onRetry,
}: {
  phase: Exclude<WorkspacePhase, "ready">;
  problem: PilotProblem | null;
  onRetry: () => void;
}) {
  if (phase === "loading") {
    return (
      <section className={styles.pilotState} role="status" aria-live="polite" aria-busy="true">
        <span className={styles.pilotSpinner} aria-hidden="true" />
        <div>
          <p className={styles.eyebrow}>Kết nối vùng dữ liệu được cấp quyền</p>
          <h2>Đang tải đơn hàng vận hành…</h2>
          <p>KSOps đang xác minh phiên SSO, phạm vi chi nhánh và dữ liệu PostgreSQL.</p>
        </div>
      </section>
    );
  }

  if (phase === "unauthenticated") {
    return (
      <section className={styles.pilotState} aria-labelledby="pilot-login-title">
        <span className={styles.pilotStateIcon} aria-hidden="true">SSO</span>
        <div>
          <p className={styles.eyebrow}>Yêu cầu xác thực doanh nghiệp</p>
          <h2 id="pilot-login-title">Đăng nhập để mở đơn hàng pilot</h2>
          <p>Phiên đăng nhập phải được Auth0 xác minh và ánh xạ tới quyền nội bộ đang hoạt động.</p>
          <div className={styles.pilotStateActions}>
            <a className={styles.primaryButton} href="/auth/login?returnTo=%2Fdon-hang">Đăng nhập SSO</a>
            <button className={styles.secondaryButton} type="button" onClick={onRetry}>Thử lại</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.pilotState} role="alert" aria-labelledby="pilot-error-title">
      <span className={`${styles.pilotStateIcon} ${styles.pilotStateIconError}`} aria-hidden="true">!</span>
      <div>
        <p className={styles.eyebrow}>Không thể tải dữ liệu vận hành</p>
        <h2 id="pilot-error-title">Kết nối pilot đang gián đoạn</h2>
        <p>{problem?.detail ?? "Hệ thống không thể hoàn tất yêu cầu. Hãy thử lại."}</p>
        {problem?.requestId ? <small>Mã yêu cầu: {problem.requestId}</small> : null}
        <div className={styles.pilotStateActions}>
          <button className={styles.primaryButton} type="button" onClick={onRetry}>Tải lại dữ liệu</button>
        </div>
      </div>
    </section>
  );
}

export default function PilotOrderWorkspace() {
  const [phase, setPhase] = useState<WorkspacePhase>("loading");
  const [problem, setProblem] = useState<PilotProblem | null>(null);
  const [mutationProblem, setMutationProblem] = useState<PilotProblem | null>(null);
  const [principal, setPrincipal] = useState<PilotPrincipal | null>(null);
  const [referenceData, setReferenceData] = useState<PilotReferenceData>({ branches: [], locations: [] });
  const [orders, setOrders] = useState<readonly PilotCargoOrder[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PilotOrderStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(() => initialCreateForm());
  const [transitionTarget, setTransitionTarget] = useState<PilotOrderStatus | "">("");
  const [reasonCode, setReasonCode] = useState("");
  const [busy, setBusy] = useState<BusyOperation>(null);
  const [announcement, setAnnouncement] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const minimumSla = useMemo(
    () => localDateTimeAt(currentTime + 2 * 60 * 1000),
    [currentTime],
  );
  const maximumSla = useMemo(
    () => localDateTimeAt(currentTime + 365 * 24 * 60 * 60 * 1000),
    [currentTime],
  );
  const firstCreateFieldRef = useRef<HTMLSelectElement>(null);
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  const createMutationRef = useRef<PendingMutationKey | null>(null);
  const transitionMutationRef = useRef<PendingMutationKey | null>(null);

  const loadWorkspace = useCallback(async (signal?: AbortSignal) => {
    setPhase("loading");
    setProblem(null);
    try {
      const loadedPrincipal = await requestJson(
        "/api/v1/me",
        decodePilotPrincipalEnvelope,
        { signal },
      );
      const [loadedReferences, loadedOrders] = await Promise.all([
        requestJson(
          "/api/v1/reference-data",
          decodePilotReferenceEnvelope,
          { signal },
        ),
        requestJson(
          "/api/v1/cargo-orders?limit=100",
          decodePilotOrdersEnvelope,
          { signal },
        ),
      ]);
      if (signal?.aborted) return;
      setPrincipal(loadedPrincipal);
      setReferenceData(loadedReferences);
      setOrders(loadedOrders);
      setSelectedId((current) => (
        loadedOrders.some((order) => order.id === current) ? current : loadedOrders[0]?.id ?? ""
      ));
      setCreateForm(initialCreateForm(loadedReferences, loadedPrincipal));
      setCurrentTime(Date.now());
      setPhase("ready");
      setAnnouncement(`Đã tải ${loadedOrders.length} đơn hàng trong phạm vi được cấp quyền.`);
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      const apiError = error instanceof PilotApiError
        ? error
        : new PilotApiError(decodePilotProblem(null, 503));
      setProblem(apiError.problem);
      setPhase(apiError.status === 401 ? "unauthenticated" : "error");
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    const loadedOrders = await requestJson(
      "/api/v1/cargo-orders?limit=100",
      decodePilotOrdersEnvelope,
    );
    setOrders(loadedOrders);
    setSelectedId((current) => (
      loadedOrders.some((order) => order.id === current) ? current : loadedOrders[0]?.id ?? ""
    ));
    setCurrentTime(Date.now());
    return loadedOrders;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => void loadWorkspace(controller.signal), 0);
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadWorkspace]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const branchById = useMemo(
    () => new Map(referenceData.branches.map((branch) => [branch.id, branch])),
    [referenceData.branches],
  );
  const locationById = useMemo(
    () => new Map(referenceData.locations.map((location) => [location.id, location])),
    [referenceData.locations],
  );
  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      const searchable = [
        order.publicCode,
        pilotOrderStatusLabel(order.status),
        pilotServiceLevelLabel(order.serviceLevel),
        branchById.get(order.owningBranchId)?.name,
        locationById.get(order.originLocationId)?.displayName,
        locationById.get(order.destinationLocationId)?.displayName,
      ].filter(Boolean).join(" ").toLocaleLowerCase("vi-VN");
      return searchable.includes(normalizedQuery);
    });
  }, [branchById, locationById, orders, query, statusFilter]);
  const selectedOrder = visibleOrders.find((order) => order.id === selectedId)
    ?? visibleOrders[0]
    ?? null;
  const transitionTargets = selectedOrder ? pilotTransitionTargets(selectedOrder.status) : [];
  const activeTransitionTarget = transitionTarget && transitionTargets.includes(transitionTarget)
    ? transitionTarget
    : transitionTargets[0] ?? "";
  const activeReasonCode = transitionTarget === activeTransitionTarget
    ? reasonCode
    : reasonForTarget(activeTransitionTarget);
  const creatableBranchOptions = creatableBranches(referenceData, principal);
  const canCreate = Boolean(
    principal?.permissions.includes("cargo-order:create")
    && creatableBranchOptions.length > 0,
  );
  const cargoReadScope = principal?.permissionScopes["cargo-order:read"];
  const canTransition = selectedOrder
    ? Boolean(principal?.permissions.includes("cargo-order:transition")) && permissionCoversBranch(
      principal,
      selectedOrder.status === "exception"
        ? "cargo-order:resolve-exception"
        : "cargo-order:transition",
      selectedOrder.owningBranchId,
    )
    : false;

  async function handleRefresh() {
    setBusy("refresh");
    setMutationProblem(null);
    try {
      const loaded = await refreshOrders();
      setAnnouncement(`Đã đồng bộ ${loaded.length} đơn hàng mới nhất.`);
    } catch (error) {
      const apiError = error instanceof PilotApiError
        ? error
        : new PilotApiError(decodePilotProblem(null, 503));
      if (apiError.status === 401) setPhase("unauthenticated");
      else setMutationProblem(apiError.problem);
    } finally {
      setBusy(null);
    }
  }

  function openCreateForm() {
    setCreateOpen(true);
    setMutationProblem(null);
    window.requestAnimationFrame(() => firstCreateFieldRef.current?.focus());
  }

  function closeCreateForm() {
    setCreateOpen(false);
    window.requestAnimationFrame(() => createTriggerRef.current?.focus());
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutationProblem(null);
    const packageCount = Number(createForm.packageCount);
    const weightKilograms = Number(createForm.weightKilograms);
    const totalWeightGrams = Math.round(weightKilograms * 1000);
    const declaredValueMinor = createForm.declaredValueMinor.trim()
      ? Number(createForm.declaredValueMinor)
      : null;
    const slaDate = new Date(createForm.slaDueAt);
    const selectedIdsAreValid = creatableBranchOptions.some((branch) => branch.id === createForm.owningBranchId)
      && referenceData.locations.some((location) => location.id === createForm.originLocationId)
      && referenceData.locations.some((location) => location.id === createForm.destinationLocationId);
    if (!selectedIdsAreValid
      || createForm.originLocationId === createForm.destinationLocationId
      || !Number.isInteger(packageCount) || packageCount < 1 || packageCount > 10_000
      || !Number.isFinite(weightKilograms) || totalWeightGrams < 1 || totalWeightGrams > 100_000_000
      || Math.abs(totalWeightGrams / 1000 - weightKilograms) > 0.000001
      || (declaredValueMinor !== null && (!Number.isSafeInteger(declaredValueMinor) || declaredValueMinor < 0))
      || Number.isNaN(slaDate.getTime())
      || slaDate.getTime() <= currentTime + 60_000
      || slaDate.getTime() > currentTime + 366 * 24 * 60 * 60 * 1000) {
      setMutationProblem(decodePilotProblem({
        code: "FORM_INVALID",
        title: "Biểu mẫu chưa hợp lệ",
        detail: "Kiểm tra chi nhánh, hai địa điểm khác nhau, số kiện, khối lượng và hạn SLA trong tương lai.",
      }, 422));
      return;
    }

    const body = {
      owningBranchId: createForm.owningBranchId,
      serviceLevel: createForm.serviceLevel,
      originLocationId: createForm.originLocationId,
      destinationLocationId: createForm.destinationLocationId,
      packageCount,
      totalWeightGrams,
      declaredValueMinor,
      currency: "VND",
      slaDueAt: slaDate.toISOString(),
    };
    const pendingKey = mutationKey(createMutationRef.current, JSON.stringify(body), "create");
    createMutationRef.current = pendingKey;
    setBusy("create");
    try {
      const created = await requestJson(
        "/api/v1/cargo-orders",
        decodePilotOrderEnvelope,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": pendingKey.value,
          },
          body: JSON.stringify(body),
        },
      );
      setOrders((current) => [created, ...current.filter((order) => order.id !== created.id)]);
      setSelectedId(created.id);
      setCreateForm(initialCreateForm(referenceData, principal));
      closeCreateForm();
      createMutationRef.current = null;
      setAnnouncement(`Đã tạo đơn ${created.publicCode} trong PostgreSQL.`);
    } catch (error) {
      const apiError = error instanceof PilotApiError
        ? error
        : new PilotApiError(decodePilotProblem(null, 503));
      if (apiError.status === 401) setPhase("unauthenticated");
      else setMutationProblem(apiError.problem);
      if (apiError.status >= 400 && apiError.status < 500) createMutationRef.current = null;
    } finally {
      setBusy(null);
    }
  }

  async function handleTransition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder || !activeTransitionTarget || !isSafeReasonCode(activeReasonCode)) {
      setMutationProblem(decodePilotProblem({
        code: "TRANSITION_FORM_INVALID",
        title: "Thao tác chưa hợp lệ",
        detail: "Chọn trạng thái đích và nhập mã lý do gồm chữ hoa, số hoặc dấu gạch dưới.",
      }, 422));
      return;
    }
    const body = { toStatus: activeTransitionTarget, reasonCode: activeReasonCode };
    const fingerprint = JSON.stringify({ id: selectedOrder.id, version: selectedOrder.version, ...body });
    const pendingKey = mutationKey(transitionMutationRef.current, fingerprint, "transition");
    transitionMutationRef.current = pendingKey;
    setBusy("transition");
    setMutationProblem(null);
    try {
      const updated = await requestJson(
        `/api/v1/cargo-orders/${encodeURIComponent(selectedOrder.id)}/transitions`,
        decodePilotOrderEnvelope,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": pendingKey.value,
            "if-match": `"cargo-order-v${selectedOrder.version}"`,
          },
          body: JSON.stringify(body),
        },
      );
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
      transitionMutationRef.current = null;
      setAnnouncement(`${updated.publicCode} đã chuyển sang ${pilotOrderStatusLabel(updated.status)}.`);
    } catch (error) {
      const apiError = error instanceof PilotApiError
        ? error
        : new PilotApiError(decodePilotProblem(null, 503));
      if (apiError.status === 401) {
        setPhase("unauthenticated");
      } else if (apiError.status === 412) {
        transitionMutationRef.current = null;
        try {
          await refreshOrders();
          setMutationProblem(decodePilotProblem({
            code: "VERSION_MISMATCH",
            title: "Đơn hàng vừa được cập nhật",
            detail: "KSOps đã tải lại phiên bản mới nhất. Hãy kiểm tra trạng thái trước khi thao tác lại.",
            requestId: apiError.problem.requestId,
          }, 412));
        } catch (refreshError) {
          const refreshProblem = refreshError instanceof PilotApiError
            ? refreshError.problem
            : decodePilotProblem(null, 503);
          if (refreshProblem.status === 401) {
            setPhase("unauthenticated");
          } else {
            setMutationProblem(decodePilotProblem({
              code: "VERSION_REFRESH_FAILED",
              title: "Đơn hàng đã đổi phiên bản",
              detail: "Không thể tải phiên bản mới nhất. Hãy dùng nút Đồng bộ dữ liệu trước khi thao tác lại.",
              requestId: refreshProblem.requestId ?? apiError.problem.requestId,
            }, refreshProblem.status));
          }
        }
      } else {
        setMutationProblem(apiError.problem);
        if (apiError.status >= 400 && apiError.status < 500) transitionMutationRef.current = null;
      }
    } finally {
      setBusy(null);
    }
  }

  if (phase !== "ready") {
    return <WorkspaceState phase={phase} problem={problem} onRetry={() => void loadWorkspace()} />;
  }

  const activeCount = orders.filter((order) => !["reconciled", "cancelled"].includes(order.status)).length;
  const exceptionCount = orders.filter((order) => order.status === "exception").length;
  const dueSoonCount = orders.filter((order) => (
    !["delivered", "reconciled", "cancelled"].includes(order.status)
    && Date.parse(order.slaDueAt) - currentTime <= 6 * 60 * 60 * 1000
  )).length;

  return (
    <div className={styles.page}>
      <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>

      <section className={`${styles.hero} ${styles.pilotHero}`} aria-labelledby="pilot-orders-title">
        <div>
          <span className={styles.eyebrow}>Cargo pilot · SSO + PostgreSQL</span>
          <h2 id="pilot-orders-title">Điều hành đơn hàng trong phạm vi được cấp quyền.</h2>
          <p>Phiên SSO đã được API xác minh. Mọi thao tác vẫn được kiểm tra quyền, tenant và phiên bản ở máy chủ.</p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.ghostButtonDark} type="button" disabled={busy !== null} onClick={() => void handleRefresh()}>
            {busy === "refresh" ? "Đang đồng bộ…" : "Đồng bộ dữ liệu"}
          </button>
          <button ref={createTriggerRef} className={styles.heroButton} type="button" disabled={!canCreate || busy !== null} onClick={openCreateForm}>
            <span aria-hidden="true">＋</span> Tạo đơn vận hành
          </button>
        </div>
      </section>

      <section className={styles.pilotIdentityBar} aria-label="Phiên và phạm vi vận hành">
        <span className={styles.pilotVerifiedDot} aria-hidden="true" />
        <p><strong>Phiên SSO đã xác minh</strong><span>Principal {principal?.id.slice(0, 8)}… · {cargoReadScope === "*" ? "Toàn doanh nghiệp" : `${cargoReadScope?.length ?? 0} chi nhánh cho cargo-order:read`}</span></p>
        <small>Quyền hiển thị lấy từ ánh xạ nội bộ; API luôn kiểm tra lại.</small>
      </section>

      {mutationProblem ? (
        <div className={styles.pilotInlineProblem} id="pilot-mutation-problem" role="alert">
          <div><strong>{mutationProblem.title}</strong><p>{mutationProblem.detail}</p></div>
          {mutationProblem.requestId ? <small>Mã yêu cầu: {mutationProblem.requestId}</small> : null}
          <button type="button" aria-label="Đóng thông báo lỗi" onClick={() => setMutationProblem(null)}>×</button>
        </div>
      ) : null}

      {createOpen ? (
        <section className={styles.pilotCreatePanel} aria-labelledby="pilot-create-title">
          <div className={styles.panelHeading}>
            <div><span className={styles.eyebrow}>Lệnh vận chuyển mới</span><h2 id="pilot-create-title">Tạo đơn vào PostgreSQL</h2><p>Chỉ sử dụng mã chi nhánh và địa điểm vận hành không chứa PII.</p></div>
            <button className={styles.iconButton} type="button" aria-label="Đóng biểu mẫu tạo đơn" onClick={closeCreateForm}>×</button>
          </div>
          <form className={styles.pilotCreateForm} aria-describedby={mutationProblem ? "pilot-mutation-problem" : undefined} onSubmit={(event) => void handleCreate(event)}>
            <fieldset aria-invalid={mutationProblem?.code === "FORM_INVALID" || undefined} disabled={busy !== null || !canCreate}>
              <legend className={styles.srOnly}>Thông tin đơn vận chuyển</legend>
              <label className={styles.field}><span>Chi nhánh sở hữu</span><select ref={firstCreateFieldRef} required value={createForm.owningBranchId} onChange={(event) => setCreateForm((current) => ({ ...current, owningBranchId: event.target.value }))}>{creatableBranchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}</select></label>
              <label className={styles.field}><span>Mức dịch vụ</span><select value={createForm.serviceLevel} onChange={(event) => setCreateForm((current) => ({ ...current, serviceLevel: event.target.value as PilotServiceLevel }))}>{PILOT_SERVICE_LEVELS.map((level) => <option key={level} value={level}>{pilotServiceLevelLabel(level)}</option>)}</select></label>
              <label className={styles.field}><span>Điểm đi</span><select required value={createForm.originLocationId} onChange={(event) => setCreateForm((current) => ({ ...current, originLocationId: event.target.value }))}>{referenceData.locations.map((location) => <option key={location.id} value={location.id}>{location.publicCode} · {location.displayName}</option>)}</select></label>
              <label className={styles.field}><span>Điểm đến</span><select required value={createForm.destinationLocationId} onChange={(event) => setCreateForm((current) => ({ ...current, destinationLocationId: event.target.value }))}>{referenceData.locations.map((location) => <option key={location.id} value={location.id}>{location.publicCode} · {location.displayName}</option>)}</select></label>
              <label className={styles.field}><span>Số kiện</span><input required type="number" min="1" max="10000" step="1" value={createForm.packageCount} onChange={(event) => setCreateForm((current) => ({ ...current, packageCount: event.target.value }))} /></label>
              <label className={styles.field}><span>Khối lượng (kg)</span><input required type="number" min="0.001" max="100000" step="0.001" value={createForm.weightKilograms} onChange={(event) => setCreateForm((current) => ({ ...current, weightKilograms: event.target.value }))} /></label>
              <label className={styles.field}><span>Giá trị khai báo (VND)</span><input type="number" min="0" max="9000000000000" step="1" placeholder="Không bắt buộc" value={createForm.declaredValueMinor} onChange={(event) => setCreateForm((current) => ({ ...current, declaredValueMinor: event.target.value }))} /></label>
              <label className={styles.field}><span>Hạn SLA</span><input required type="datetime-local" min={minimumSla} max={maximumSla} value={createForm.slaDueAt} onChange={(event) => setCreateForm((current) => ({ ...current, slaDueAt: event.target.value }))} /></label>
            </fieldset>
            <div className={styles.pilotFormActions}><p>Origin được trình duyệt gửi theo same-origin; khóa idempotency không chứa dữ liệu nghiệp vụ.</p><button className={styles.primaryButton} type="submit" disabled={!canCreate || busy !== null || creatableBranchOptions.length === 0 || referenceData.locations.length < 2}>{busy === "create" ? "Đang ghi đơn…" : "Tạo đơn vận hành"}</button></div>
          </form>
        </section>
      ) : null}

      <section className={styles.metrics} aria-label="Tổng hợp đơn hàng pilot">
        <article className={styles.metricCard}><span className={styles.metricIcon}>ĐH</span><div><p>Tổng đơn được phép xem</p><strong>{orders.length}</strong><small>tối đa 100 bản ghi mới nhất</small></div></article>
        <article className={styles.metricCard}><span className={`${styles.metricIcon} ${styles.metricBlue}`}>→</span><div><p>Đang hoạt động</p><strong>{activeCount}</strong><small>chưa đối soát hoặc hủy</small></div></article>
        <article className={styles.metricCard}><span className={`${styles.metricIcon} ${styles.metricAmber}`}>SLA</span><div><p>Đến hạn trong 6 giờ</p><strong>{dueSoonCount}</strong><small>bao gồm đơn đã quá hạn</small></div></article>
        <article className={styles.metricCard}><span className={`${styles.metricIcon} ${styles.metricGreen}`}>!</span><div><p>Luồng ngoại lệ</p><strong>{exceptionCount}</strong><small>cần người có quyền xử lý</small></div></article>
      </section>

      <section className={styles.controlPanel} aria-labelledby="pilot-order-list-title">
        <div className={styles.panelHeading}><div><span className={styles.eyebrow}>Không gian tác nghiệp thật</span><h2 id="pilot-order-list-title">Đơn vận chuyển</h2><p>Mã công khai và dữ liệu vận hành không chứa thông tin liên hệ khách hàng.</p></div><span className={styles.resultCount} role="status" aria-live="polite">{visibleOrders.length} kết quả</span></div>
        <div className={`${styles.filters} ${styles.pilotFilters}`}>
          <label className={styles.searchField} htmlFor="pilot-order-search"><span>Tìm đơn</span><div><i aria-hidden="true">⌕</i><input id="pilot-order-search" type="search" placeholder="Mã đơn, chi nhánh hoặc tuyến…" value={query} onChange={(event) => setQuery(event.target.value)} /></div></label>
          <label className={styles.filterField}><span>Trạng thái</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as PilotOrderStatus | "all")}><option value="all">Tất cả trạng thái</option>{PILOT_ORDER_STATUSES.map((status) => <option key={status} value={status}>{pilotOrderStatusLabel(status)}</option>)}</select></label>
          <button className={styles.clearButton} type="button" onClick={() => { setQuery(""); setStatusFilter("all"); }}>Xóa lọc</button>
        </div>

        <div className={styles.workspace}>
          <div className={styles.orderListWrap}>
            {visibleOrders.length ? <ol className={styles.orderList} aria-label="Các đơn vận tải pilot">{visibleOrders.map((order) => <li key={order.id}><button className={selectedOrder?.id === order.id ? styles.orderCardSelected : styles.orderCard} type="button" aria-pressed={selectedOrder?.id === order.id} onClick={() => setSelectedId(order.id)}><span className={styles.orderTopline}><span><strong>{order.publicCode}</strong><small>{pilotServiceLevelLabel(order.serviceLevel)} · v{order.version}</small></span><StatusBadge status={order.status} /></span><span className={styles.orderRoute}><strong>{locationById.get(order.originLocationId)?.displayName ?? order.originLocationId}</strong><i aria-hidden="true">→</i><strong>{locationById.get(order.destinationLocationId)?.displayName ?? order.destinationLocationId}</strong></span><span className={styles.orderMeta}><span>{branchById.get(order.owningBranchId)?.name ?? order.owningBranchId}</span><span>{order.packageCount} kiện · {formatPilotWeight(order.totalWeightGrams)}</span></span><span className={styles.orderBottomline}><span>SLA: {formatPilotDate(order.slaDueAt)}</span><span>Cập nhật: {formatPilotDate(order.updatedAt)}</span></span></button></li>)}</ol> : <div className={styles.emptyState}><span aria-hidden="true">⌕</span><h3>Không có đơn phù hợp</h3><p>Thay đổi bộ lọc hoặc tạo đơn mới nếu bạn có quyền.</p></div>}
          </div>

          {selectedOrder ? (
            <aside className={styles.detailPanel} aria-labelledby="pilot-order-detail-title">
              <div className={styles.detailHeading}><div><span className={styles.eyebrow}>Chi tiết aggregate</span><h2 id="pilot-order-detail-title">{selectedOrder.publicCode}</h2></div><StatusBadge status={selectedOrder.status} /></div>
              <div className={styles.routeCard}><div className={styles.routeNodes} aria-hidden="true"><span>ĐI</span><i /><span>ĐẾN</span></div><div className={styles.routeCopy}><strong>{locationById.get(selectedOrder.originLocationId)?.displayName ?? selectedOrder.originLocationId}</strong><span>{pilotServiceLevelLabel(selectedOrder.serviceLevel)}</span><strong>{locationById.get(selectedOrder.destinationLocationId)?.displayName ?? selectedOrder.destinationLocationId}</strong></div></div>
              <dl className={styles.detailGrid}>
                <div><dt>Chi nhánh</dt><dd>{branchById.get(selectedOrder.owningBranchId)?.name ?? selectedOrder.owningBranchId}</dd></div><div><dt>Phiên bản</dt><dd>v{selectedOrder.version}</dd></div>
                <div><dt>Số kiện</dt><dd>{selectedOrder.packageCount}</dd></div><div><dt>Khối lượng</dt><dd>{formatPilotWeight(selectedOrder.totalWeightGrams)}</dd></div>
                <div><dt>Giá trị khai báo</dt><dd>{formatPilotMoney(selectedOrder.declaredValueMinor, selectedOrder.currency)}</dd></div><div><dt>Hạn SLA</dt><dd>{formatPilotDate(selectedOrder.slaDueAt)}</dd></div>
                <div className={styles.detailWide}><dt>Khởi tạo / cập nhật</dt><dd>{formatPilotDate(selectedOrder.createdAt)} · {formatPilotDate(selectedOrder.updatedAt)}</dd></div>
              </dl>
              <form className={styles.pilotTransitionForm} aria-describedby={mutationProblem ? "pilot-mutation-problem" : undefined} onSubmit={(event) => void handleTransition(event)}>
                <div className={styles.sectionTitleRow}><h3>Chuyển trạng thái có điều kiện</h3><span>If-Match v{selectedOrder.version}</span></div>
                {transitionTargets.length ? <><label className={styles.field}><span>Trạng thái đích</span><select value={activeTransitionTarget} onChange={(event) => { const target = event.target.value as PilotOrderStatus; setTransitionTarget(target); setReasonCode(reasonForTarget(target)); transitionMutationRef.current = null; }}>{transitionTargets.map((target) => <option key={target} value={target}>{pilotOrderStatusLabel(target)}</option>)}</select></label><label className={styles.field}><span>Mã lý do</span><input required minLength={3} maxLength={60} pattern="[A-Z][A-Z0-9_:-]*" value={activeReasonCode} onChange={(event) => { setReasonCode(event.target.value.toUpperCase()); setTransitionTarget(activeTransitionTarget); transitionMutationRef.current = null; }} /></label><button className={styles.primaryButton} type="submit" disabled={!canTransition || busy !== null}>{busy === "transition" ? "Đang cập nhật…" : "Xác nhận chuyển trạng thái"}</button><small>{canTransition ? "API sẽ kiểm tra lại quyền, idempotency và optimistic version." : "Principal hiện tại không có quyền thực hiện chuyển trạng thái này."}</small></> : <p className={styles.pilotTerminalNote}>Đơn ở trạng thái kết thúc, không còn bước chuyển hợp lệ.</p>}
              </form>
            </aside>
          ) : null}
        </div>
      </section>
    </div>
  );
}
