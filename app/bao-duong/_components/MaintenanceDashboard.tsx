"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useDemoAccess } from "../../_components/access/DemoAccessProvider";
import { useWorkspaceState } from "../../_hooks/useWorkspaceState";
import { CHECKLIST_STORAGE_KEY, decodeChecklistStore, EMPTY_CHECKLIST_STORE, filterWorkOrders, maintenanceSchedule, maintenanceSummary, mileageAlerts, priorityOptions, statusOptions, workOrders } from "../_lib/maintenance";
import type { ChecklistStore, WorkOrder, WorkOrderPriority, WorkOrderStatus } from "../_lib/maintenance";
import styles from "../page.module.css";

const statusClass: Record<WorkOrderStatus, string> = {
  "Quá hạn": styles.statusOverdue,
  "Sắp đến hạn": styles.statusDue,
  "Đang thực hiện": styles.statusProgress,
  "Đã lên lịch": styles.statusPlanned,
  "Hoàn tất": styles.statusDone,
};

const priorityClass: Record<WorkOrderPriority, string> = {
  "Khẩn": styles.priorityCritical,
  "Cao": styles.priorityHigh,
  "Trung bình": styles.priorityMedium,
  "Thấp": styles.priorityLow,
};

function effectiveChecklist(order: WorkOrder, store: ChecklistStore) {
  return order.checklist.map((item) => ({ ...item, done: store[order.id]?.[item.id] ?? item.done }));
}

export default function MaintenanceDashboard() {
  const { can } = useDemoAccess();
  const canUpdateChecklist = can("maintenance:update-checklist");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [priority, setPriority] = useState("Tất cả");
  const [selectedId, setSelectedId] = useState(workOrders[0].id);
  const [checklistStore, setChecklistStore] = useWorkspaceState({
    stateKey: "maintenance-checklists",
    cacheKey: CHECKLIST_STORAGE_KEY,
    initialValue: EMPTY_CHECKLIST_STORE,
    decode: decodeChecklistStore,
  });

  const filteredOrders = useMemo(
    () => filterWorkOrders(workOrders, search, status, priority),
    [priority, search, status],
  );
  const selectedOrder = workOrders.find((order) => order.id === selectedId) ?? workOrders[0];
  const selectedChecklist = effectiveChecklist(selectedOrder, checklistStore);
  const completedItems = selectedChecklist.filter((item) => item.done).length;
  const completion = Math.round(completedItems / selectedChecklist.length * 100);

  function resetFilters() { setSearch(""); setStatus("Tất cả"); setPriority("Tất cả"); }

  function toggleChecklist(itemId: string) {
    if (!canUpdateChecklist) return;
    const currentOrderState = Object.fromEntries(selectedChecklist.map((item) => [item.id, item.done]));
    setChecklistStore((current) => ({ ...current, [selectedOrder.id]: { ...currentOrderState, [itemId]: !currentOrderState[itemId] } }));
  }

  function resetChecklist() {
    setChecklistStore((current) => {
      const next = { ...current };
      delete next[selectedOrder.id];
      return next;
    });
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="maintenance-hero-title">
        <div><span>WORKSHOP DESK · 3 KHOANG</span><h2 id="maintenance-hero-title">Bảo dưỡng trước khi bị động.</h2><p>Kết hợp quãng đường đã chạy, cường độ km/ngày và năng lực xưởng để ưu tiên đúng work order.</p></div>
        <div className={styles.heroAction}><span aria-hidden="true">✓</span><div><strong>Checklist công việc</strong><small>Cập nhật theo tiến độ kỹ thuật</small></div></div>
      </section>

      <section className={styles.metrics} aria-label="Chỉ số bảo dưỡng">
        <article><span>WO</span><div><p>Lệnh đang mở</p><strong>{maintenanceSummary.open}</strong><small>lệnh công việc đang theo dõi</small></div></article>
        <article><span className={styles.blue}>→</span><div><p>Đang thực hiện</p><strong>{maintenanceSummary.inProgress}</strong><small>3 khoang xưởng đang hoạt động</small></div></article>
        <article><span className={styles.amber}>!</span><div><p>Sắp đến hạn</p><strong>{maintenanceSummary.dueSoon}</strong><small>Theo ngày hoặc quãng đường</small></div></article>
        <article><span className={styles.red}>×</span><div><p>Quá hạn</p><strong>{maintenanceSummary.overdue}</strong><small>Cần khóa điều phối xe</small></div></article>
      </section>

      <section className={styles.alerts} aria-labelledby="mileage-alert-title">
        <div className={styles.sectionHeading}><div><span>Km/day intelligence</span><h2 id="mileage-alert-title">Cảnh báo theo quãng đường & cường độ chạy</h2><p>Tổng hợp từ quãng đường và lịch khai thác gần nhất của từng xe.</p></div><b>{mileageAlerts.length} cảnh báo</b></div>
        <div className={styles.alertGrid}>
          {mileageAlerts.map((order) => {
            const days = order.remainingKm <= 0 ? 0 : Math.ceil(order.remainingKm / order.dailyKm);
            return <article key={order.id}><span className={order.remainingKm <= 0 ? styles.alertCritical : styles.alertWarn} aria-hidden="true">{order.remainingKm <= 0 ? "!" : "KM"}</span><div><strong>{order.vehicle}</strong><code>{order.vehicleCode}</code><p>{order.dailyKm} km/ngày · {order.remainingKm <= 0 ? "Đã chạm ngưỡng bảo dưỡng" : `Còn ${order.remainingKm} km`}</p></div><em>{days === 0 ? "Xử lý ngay" : `≈ ${days} ngày`}</em></article>;
          })}
        </div>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.orders} aria-labelledby="orders-title">
          <div className={styles.sectionHeading}><div><span>Maintenance queue</span><h2 id="orders-title">Work orders</h2><p>Chọn một lệnh để cập nhật checklist kỹ thuật.</p></div><b role="status" aria-live="polite">{filteredOrders.length} kết quả</b></div>
          <div className={styles.filters} role="search" aria-label="Tìm và lọc work order">
            <label className={styles.searchField} htmlFor="maintenance-search"><span aria-hidden="true">⌕</span><span className={styles.srOnly}>Tìm work order</span><input id="maintenance-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã lệnh, xe, hạng mục..." /></label>
            <label><span className={styles.srOnly}>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Tất cả</option>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span className={styles.srOnly}>Ưu tiên</span><select value={priority} onChange={(event) => setPriority(event.target.value)}><option>Tất cả</option>{priorityOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <button type="button" onClick={resetFilters}>Đặt lại</button>
          </div>
          <div className={styles.tableWrap} role="region" aria-label="Bảng work order có thể cuộn ngang">
            <table><caption className={styles.srOnly}>Danh sách lệnh bảo dưỡng</caption><thead><tr><th scope="col">Work order</th><th scope="col">Phương tiện</th><th scope="col">Hạn / km còn lại</th><th scope="col">Ưu tiên</th><th scope="col">Trạng thái</th></tr></thead><tbody>
              {filteredOrders.map((order) => <tr key={order.id} data-selected={order.id === selectedOrder.id}><td><button type="button" onClick={() => setSelectedId(order.id)}><strong>{order.job}</strong><code>{order.id}</code></button></td><td><strong>{order.vehicle}</strong><small>{order.vehicleCode}</small></td><td><time>{order.dueDate}</time><small className={order.remainingKm <= 0 ? styles.dangerText : undefined}>{order.remainingKm <= 0 ? "Đã đến ngưỡng" : `${order.remainingKm.toLocaleString("vi-VN")} km`}</small></td><td><span className={`${styles.priority} ${priorityClass[order.priority]}`}>{order.priority}</span></td><td><span className={`${styles.status} ${statusClass[order.status]}`}><i aria-hidden="true" />{order.status}</span></td></tr>)}
            </tbody></table>
          </div>
          {filteredOrders.length === 0 ? <div className={styles.empty} role="status"><strong>Không có work order phù hợp</strong><p>Thử thay đổi bộ lọc.</p><button type="button" onClick={resetFilters}>Xóa bộ lọc</button></div> : null}
        </section>

        <aside className={styles.detail} aria-labelledby="order-detail-title" aria-live="polite">
          <div className={styles.detailTop}><span className={styles.orderBadge} aria-hidden="true">WO</span><span className={`${styles.status} ${statusClass[selectedOrder.status]}`}><i aria-hidden="true" />{selectedOrder.status}</span></div>
          <p>Phiếu công việc</p><h2 id="order-detail-title">{selectedOrder.job}</h2><code>{selectedOrder.id}</code>
          <div className={styles.vehicleBox}><span>Phương tiện</span><strong>{selectedOrder.vehicle}</strong><code>{selectedOrder.vehicleCode}</code></div>
          <dl><div><dt>Ưu tiên</dt><dd><span className={`${styles.priority} ${priorityClass[selectedOrder.priority]}`}>{selectedOrder.priority}</span></dd></div><div><dt>Kỹ thuật phụ trách</dt><dd>{selectedOrder.technician}</dd></div><div><dt>Khoang xưởng</dt><dd>{selectedOrder.bay}</dd></div><div><dt>Thời lượng dự kiến</dt><dd>{selectedOrder.duration}</dd></div><div><dt>Ngưỡng ODO</dt><dd>{selectedOrder.dueOdometer.toLocaleString("vi-VN")} km</dd></div></dl>

          <section className={styles.checklist} aria-labelledby="checklist-title">
            <div className={styles.checklistHeading}><div><h3 id="checklist-title">Checklist công việc</h3><span aria-live="polite">{completedItems}/{selectedChecklist.length} hoàn tất</span></div><button type="button" onClick={resetChecklist}>Làm mới checklist</button></div>
            <div className={styles.progressTrack} role="progressbar" aria-label="Tiến độ checklist" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion} aria-valuetext={`${completion} phần trăm`}><span style={{ "--progress": `${completion}%` } as CSSProperties} /></div>
            <p className={styles.srOnly} id="maintenance-checklist-permission">Vai trò hiện tại không có quyền cập nhật checklist bảo dưỡng.</p>
            <div className={styles.checkItems}>{selectedChecklist.map((item) => <label key={item.id}><input type="checkbox" checked={item.done} disabled={!canUpdateChecklist} aria-describedby={!canUpdateChecklist ? "maintenance-checklist-permission" : undefined} title={canUpdateChecklist ? undefined : "Vai trò hiện tại không có quyền cập nhật checklist bảo dưỡng."} onChange={() => toggleChecklist(item.id)} /><span aria-hidden="true">✓</span><strong>{item.label}</strong></label>)}</div>
            <p>Tiến độ checklist được tự động lưu sau mỗi cập nhật.</p>
          </section>
        </aside>
      </div>

      <section className={styles.scheduleStrip} aria-labelledby="workshop-schedule-title">
        <div className={styles.sectionHeading}><div><span>Workshop calendar</span><h2 id="workshop-schedule-title">Lịch xưởng sắp tới</h2><p>Các mốc thời gian hoàn toàn hiện hành.</p></div></div>
        <div>{maintenanceSchedule.map((item) => <article key={`${item.day}-${item.time}-${item.title}`}><span><strong>{item.day}</strong><small>{item.month}</small></span><div><time>{item.time}</time><strong>{item.title}</strong><small>{item.team}</small></div></article>)}</div>
      </section>
    </div>
  );
}
