"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDemoAccess } from "../../_components/access/DemoAccessProvider";
import { useLocalStorageState } from "../../_hooks/useLocalStorageState";
import CreateOrderDialog from "./CreateOrderDialog";
import {
  ORDER_STATUSES,
  ORDER_STORAGE_KEY,
  SERVICE_TYPES,
  createDemoOrder,
  decodeStoredOrders,
  demoOrders,
  filterOrders,
  formatDateTime,
  formatWeight,
  getNextOrderStatus,
  getOrderSummary,
  type CreateOrderInput,
  type OrderFilters,
  type OrderStatus,
  type SlaState,
  type TransportOrder,
} from "../_lib/orders";
import styles from "../page.module.css";

const initialFilters: OrderFilters = {
  query: "",
  status: "Tất cả trạng thái",
  service: "Tất cả dịch vụ",
};

const statusClass: Record<OrderStatus, string> = {
  "Mới tiếp nhận": styles.statusNew,
  "Đã xác nhận": styles.statusConfirmed,
  "Đang lấy hàng": styles.statusPickup,
  "Đang vận chuyển": styles.statusTransit,
  "Hoàn tất": styles.statusDone,
  "Cần xử lý": styles.statusRisk,
};

const slaClass: Record<SlaState, string> = {
  "Trong SLA": styles.slaSafe,
  "Sắp đến hạn": styles.slaWarning,
  "Trễ SLA": styles.slaLate,
};

const workflow: OrderStatus[] = [
  "Mới tiếp nhận",
  "Đã xác nhận",
  "Đang lấy hàng",
  "Đang vận chuyển",
  "Hoàn tất",
];

function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`${styles.statusBadge} ${statusClass[status]}`}>{status}</span>;
}

function SlaBadge({ state }: { state: SlaState }) {
  return <span className={`${styles.slaBadge} ${slaClass[state]}`}>{state}</span>;
}

function OrderDetail({
  order,
  onAdvance,
  canAdvance,
}: {
  order: TransportOrder;
  onAdvance: (order: TransportOrder) => void;
  canAdvance: boolean;
}) {
  const nextStatus = getNextOrderStatus(order.status);
  const activeIndex = workflow.indexOf(order.status);

  return (
    <aside className={styles.detailPanel} aria-labelledby="order-detail-title">
      <div className={styles.detailHeading}>
        <div>
          <span className={styles.eyebrow}>Chi tiết lệnh vận chuyển</span>
          <h2 id="order-detail-title">{order.id}</h2>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className={styles.routeCard}>
        <div className={styles.routeNodes} aria-hidden="true">
          <span>ĐI</span><i /><span>ĐẾN</span>
        </div>
        <div className={styles.routeCopy}>
          <strong>{order.origin}</strong>
          <span>{order.distanceLabel}</span>
          <strong>{order.destination}</strong>
        </div>
      </div>

      <dl className={styles.detailGrid}>
        <div><dt>Khách hàng</dt><dd>{order.customerAlias}</dd></div>
        <div><dt>Dịch vụ</dt><dd>{order.service}</dd></div>
        <div><dt>Loại hàng</dt><dd>{order.cargo}</dd></div>
        <div><dt>Quy mô</dt><dd>{order.packageCount} kiện · {formatWeight(order.weightKg)}</dd></div>
        <div><dt>Lấy hàng</dt><dd>{order.pickupWindow}</dd></div>
        <div><dt>Hạn SLA</dt><dd>{formatDateTime(order.slaDeadline)} · <SlaBadge state={order.slaState} /></dd></div>
        <div className={styles.detailWide}><dt>Phụ trách</dt><dd>{order.assigneeAlias}</dd></div>
        <div className={styles.detailWide}><dt>Ghi chú an toàn</dt><dd>{order.note}</dd></div>
      </dl>

      <div className={styles.progressBlock}>
        <div className={styles.sectionTitleRow}>
          <h3>Tiến trình xử lý</h3>
          <span>{order.source === "local-demo" ? "Tạo trên trình duyệt" : "Kịch bản mẫu"}</span>
        </div>
        {order.status === "Cần xử lý" ? (
          <div className={styles.exceptionNote} role="note">
            <strong>Đang ở luồng ngoại lệ</strong>
            <p>Xác nhận xử lý để đưa đơn về bước “Đã xác nhận”.</p>
          </div>
        ) : (
          <ol className={styles.timeline} aria-label="Các bước xử lý đơn hàng">
            {workflow.map((step, index) => {
              const state = index < activeIndex ? "done" : index === activeIndex ? "current" : "pending";
              return (
                <li className={styles[`timeline_${state}`]} key={step} aria-current={state === "current" ? "step" : undefined}>
                  <span aria-hidden="true">{state === "done" ? "✓" : index + 1}</span>
                  <p>{step}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className={styles.detailActions}>
        <button
          className={styles.primaryButton}
          type="button"
          disabled={!nextStatus || !canAdvance}
          title={!canAdvance ? "Vai trò demo hiện tại không có quyền chuyển trạng thái đơn" : undefined}
          onClick={() => onAdvance(order)}
        >
          {nextStatus ? `Chuyển sang “${nextStatus}”` : "Đơn đã hoàn tất"}
        </button>
        <small>Thao tác chỉ cập nhật dữ liệu demo trong trình duyệt.</small>
      </div>
    </aside>
  );
}

export default function OrderWorkspace() {
  const { can } = useDemoAccess();
  const canCreateOrder = can("cargo-order:create");
  const searchParams = useSearchParams();
  const requestedOrderId = searchParams.get("id")?.trim() ?? "";
  const requestedOrder = /^DH-(?:MAU|DEMO)-[A-Z0-9-]{1,24}$/u.test(requestedOrderId)
    ? demoOrders.find((order) => order.id === requestedOrderId)
    : undefined;
  const initialSelectedId = requestedOrder?.id ?? demoOrders[0].id;
  const shouldOpenCreateDialog = searchParams.get("new") === "1";
  const [orders, setOrders, resetOrders] = useLocalStorageState({
    key: ORDER_STORAGE_KEY,
    initialValue: demoOrders,
    decode: decodeStoredOrders,
  });
  const [filters, setFilters] = useState(initialFilters);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [announcement, setAnnouncement] = useState(
    requestedOrder
      ? `Đã mở đơn ${initialSelectedId} từ liên kết tổng quan.`
      : requestedOrderId
        ? "Không tìm thấy mã đơn trong dữ liệu mô phỏng; đang hiển thị đơn đầu tiên."
        : "Dữ liệu vận tải mẫu đã sẵn sàng.",
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const openedCreateIntentRef = useRef(false);

  const summary = useMemo(() => getOrderSummary(orders), [orders]);
  const visibleOrders = useMemo(() => filterOrders(orders, filters), [filters, orders]);
  const selectedOrder = visibleOrders.find((order) => order.id === selectedId) ?? visibleOrders[0] ?? null;

  useEffect(() => {
    if (!shouldOpenCreateDialog || !canCreateOrder) {
      openedCreateIntentRef.current = false;
      return;
    }
    if (openedCreateIntentRef.current) return;

    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    openedCreateIntentRef.current = true;
    dialog.showModal();
    window.requestAnimationFrame(() => dialog.querySelector<HTMLInputElement>("input")?.focus());
  }, [canCreateOrder, shouldOpenCreateDialog]);

  function openCreateDialog() {
    if (!canCreateOrder) {
      setAnnouncement("Vai trò demo hiện tại không có quyền tạo đơn hàng.");
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    window.requestAnimationFrame(() => dialog.querySelector<HTMLInputElement>("input")?.focus());
  }

  function handleCreate(input: CreateOrderInput) {
    if (!canCreateOrder) {
      setAnnouncement("Không thể tạo đơn: vai trò demo hiện tại không có quyền.");
      return;
    }
    const order = createDemoOrder(input);
    setOrders((current) => [order, ...current]);
    setFilters(initialFilters);
    setSelectedId(order.id);
    setAnnouncement(`Đã tạo ${order.id} và lưu cục bộ trên trình duyệt.`);
  }

  function handleAdvance(order: TransportOrder) {
    const permission = order.status === "Cần xử lý"
      ? "cargo-order:resolve-exception"
      : "cargo-order:transition";
    if (!can(permission)) {
      setAnnouncement("Không thể chuyển trạng thái: vai trò demo hiện tại không có quyền.");
      return;
    }
    const nextStatus = getNextOrderStatus(order.status);
    if (!nextStatus) return;
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: nextStatus } : item));
    setAnnouncement(`${order.id} đã chuyển sang trạng thái ${nextStatus}.`);
  }

  function handleReset() {
    resetOrders();
    setFilters(initialFilters);
    setSelectedId(demoOrders[0].id);
    setAnnouncement("Đã khôi phục bộ đơn hàng mô phỏng ban đầu.");
  }

  return (
    <div className={styles.page}>
      <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>

      <section className={styles.hero} aria-labelledby="orders-hero-title">
        <div>
          <span className={styles.eyebrow}>Order control tower · Dữ liệu tổng hợp</span>
          <h2 id="orders-hero-title">Theo sát từng đơn, từ tiếp nhận đến giao hoàn tất.</h2>
          <p>
            Một luồng làm việc hợp nhất cho hàng ghép, nguyên chuyến và last-mile trên các tuyến tỉnh mô phỏng.
          </p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.ghostButtonDark} type="button" onClick={handleReset}>Khôi phục mẫu</button>
          <button
            className={styles.heroButton}
            ref={createButtonRef}
            type="button"
            disabled={!canCreateOrder}
            title={!canCreateOrder ? "Vai trò demo hiện tại không có quyền tạo đơn" : undefined}
            onClick={openCreateDialog}
          >
            <span aria-hidden="true">＋</span> Tạo đơn demo
          </button>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Tổng hợp đơn vận tải">
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>ĐH</span>
          <div><p>Tổng đơn đang quản lý</p><strong>{summary.total}</strong><small>gồm dữ liệu tạo cục bộ</small></div>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.metricBlue}`}>→</span>
          <div><p>Đơn đang hoạt động</p><strong>{summary.active}</strong><small>chưa hoàn tất / ngoại lệ</small></div>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.metricAmber}`}>!</span>
          <div><p>Cần chú ý SLA</p><strong>{summary.atRisk}</strong><small>sắp hạn, trễ hoặc ngoại lệ</small></div>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.metricGreen}`}>LM</span>
          <div><p>Đơn last-mile</p><strong>{summary.lastMile}</strong><small>tuyến giao chặng cuối mẫu</small></div>
        </article>
      </section>

      <section className={styles.controlPanel} aria-labelledby="order-list-title">
        <div className={styles.panelHeading}>
          <div>
            <span className={styles.eyebrow}>Không gian tác nghiệp</span>
            <h2 id="order-list-title">Danh sách đơn vận tải</h2>
            <p>Tìm bằng mã mẫu, bí danh khách hàng, hàng hóa hoặc tuyến.</p>
          </div>
          <span className={styles.resultCount} role="status" aria-live="polite">{visibleOrders.length} kết quả</span>
        </div>

        <div className={styles.filters}>
          <label className={styles.searchField} htmlFor="order-search">
            <span>Tìm đơn</span>
            <div>
              <i aria-hidden="true">⌕</i>
              <input
                id="order-search"
                type="search"
                placeholder="Mã đơn, tuyến hoặc hàng hóa…"
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              />
              <kbd aria-label="Phím tắt Control hoặc Command K">⌘ K</kbd>
            </div>
          </label>
          <label className={styles.filterField}>
            <span>Trạng thái</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as OrderFilters["status"] }))}
            >
              <option>Tất cả trạng thái</option>
              {ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className={styles.filterField}>
            <span>Dịch vụ</span>
            <select
              value={filters.service}
              onChange={(event) => setFilters((current) => ({ ...current, service: event.target.value as OrderFilters["service"] }))}
            >
              <option>Tất cả dịch vụ</option>
              {SERVICE_TYPES.map((service) => <option key={service}>{service}</option>)}
            </select>
          </label>
          <button className={styles.clearButton} type="button" onClick={() => setFilters(initialFilters)}>Xóa lọc</button>
        </div>

        <div className={styles.workspace}>
          <div className={styles.orderListWrap}>
            {visibleOrders.length ? (
              <ol className={styles.orderList} aria-label="Các đơn vận tải phù hợp">
                {visibleOrders.map((order) => (
                  <li key={order.id}>
                    <button
                      className={selectedOrder?.id === order.id ? styles.orderCardSelected : styles.orderCard}
                      type="button"
                      aria-pressed={selectedOrder?.id === order.id}
                      onClick={() => setSelectedId(order.id)}
                    >
                      <span className={styles.orderTopline}>
                        <span><strong>{order.id}</strong><small>{order.service}</small></span>
                        <StatusBadge status={order.status} />
                      </span>
                      <span className={styles.orderRoute}>
                        <strong>{order.origin}</strong><i aria-hidden="true">→</i><strong>{order.destination}</strong>
                      </span>
                      <span className={styles.orderMeta}>
                        <span>{order.customerAlias}</span>
                        <span>{order.cargo} · {formatWeight(order.weightKg)}</span>
                      </span>
                      <span className={styles.orderBottomline}>
                        <span>Lấy: {order.pickupWindow}</span>
                        <SlaBadge state={order.slaState} />
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <div className={styles.emptyState}>
                <span aria-hidden="true">⌕</span>
                <h3>Chưa có đơn phù hợp</h3>
                <p>Thử thay đổi từ khóa hoặc đưa bộ lọc về mặc định.</p>
                <button className={styles.secondaryButton} type="button" onClick={() => setFilters(initialFilters)}>Xóa bộ lọc</button>
              </div>
            )}
          </div>
          {selectedOrder ? (
            <OrderDetail
              order={selectedOrder}
              onAdvance={handleAdvance}
              canAdvance={can(selectedOrder.status === "Cần xử lý" ? "cargo-order:resolve-exception" : "cargo-order:transition")}
            />
          ) : null}
        </div>
      </section>

      <CreateOrderDialog dialogRef={dialogRef} returnFocusRef={createButtonRef} onCreate={handleCreate} />
    </div>
  );
}
