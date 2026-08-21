import type { RefObject } from "react";
import {
  PRIORITY_FILTERS,
  STATUS_FILTERS,
  type IncidentRecord,
  type PriorityFilter,
  type StatusFilter,
} from "../_lib/incidents";
import styles from "../Incidents.module.css";

type IncidentListPaneProps = {
  createButtonRef: RefObject<HTMLButtonElement | null>;
  filtered: IncidentRecord[];
  formOpen: boolean;
  priority: PriorityFilter;
  query: string;
  selectedId: string | null;
  status: StatusFilter;
  onOpenCreate: () => void;
  onPriorityChange: (priority: PriorityFilter) => void;
  onQueryChange: (query: string) => void;
  onReset: () => void;
  onSelect: (id: string) => void;
  onStatusChange: (status: StatusFilter) => void;
};

export function IncidentListPane({
  createButtonRef,
  filtered,
  formOpen,
  priority,
  query,
  selectedId,
  status,
  onOpenCreate,
  onPriorityChange,
  onQueryChange,
  onReset,
  onSelect,
  onStatusChange,
}: IncidentListPaneProps) {
  return (
    <div className={styles.listPane}>
      <div className={styles.sectionHeading}>
        <div><p>Hàng đợi vận hành</p><h2 id="incident-list-title">Danh sách sự cố</h2></div>
        <button className={styles.resetButton} type="button" onClick={onReset}>Đặt lại demo</button>
      </div>

      <div className={styles.filters}>
        <label className={styles.searchField}>
          <span>Tìm kiếm</span>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Mã, tiêu đề, nhóm phụ trách..." type="search" />
        </label>
        <label><span>Ưu tiên</span><select value={priority} onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)}>{PRIORITY_FILTERS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Trạng thái</span><select value={status} onChange={(event) => onStatusChange(event.target.value as StatusFilter)}>{STATUS_FILTERS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button ref={createButtonRef} aria-controls="create-incident-dialog" aria-expanded={formOpen} className={styles.createButton} type="button" onClick={onOpenCreate}>+ Tạo mới</button>
      </div>

      <div className={styles.resultsMeta}><span>{filtered.length} kết quả</span><span>Chỉ lưu thay đổi trên trình duyệt này</span></div>
      <div className={styles.ticketList} aria-label="Kết quả sự cố">
        {filtered.map((incident) => (
          <button
            aria-pressed={selectedId === incident.id}
            className={selectedId === incident.id ? styles.ticketActive : styles.ticket}
            key={incident.id}
            onClick={() => onSelect(incident.id)}
            type="button"
          >
            <span className={styles.ticketTopline}><b>{incident.id}</b><i data-priority={incident.priority}>{incident.priority}</i></span>
            <strong>{incident.title}</strong>
            <span>{incident.category} · {incident.site}</span>
            <span className={styles.ticketFooter}><em>{incident.status}</em><small>{incident.sla}</small></span>
          </button>
        ))}
        {filtered.length === 0 ? <div className={styles.emptyState}><strong>Không có kết quả phù hợp</strong><p>Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa khác.</p></div> : null}
      </div>
    </div>
  );
}
