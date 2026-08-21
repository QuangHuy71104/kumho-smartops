import {
  INCIDENT_STATUSES,
  INCIDENT_WORKFLOW_STEPS,
  type IncidentRecord,
  type IncidentStatus,
} from "../_lib/incidents";
import styles from "../Incidents.module.css";

type IncidentDetailPaneProps = {
  incident: IncidentRecord | null;
  onStatusChange: (incident: IncidentRecord, status: IncidentStatus) => void;
};

export function IncidentDetailPane({ incident, onStatusChange }: IncidentDetailPaneProps) {
  return (
    <aside className={styles.detailPane} aria-label="Chi tiết sự cố" aria-live="polite">
      {incident ? (
        <>
          <div className={styles.detailHeading}><span>{incident.id}</span><i data-priority={incident.priority}>{incident.priority}</i><h2>{incident.title}</h2><p>{incident.summary}</p></div>
          <dl className={styles.detailGrid}>
            <div><dt>Trạng thái</dt><dd>{incident.status}</dd></div>
            <div><dt>SLA</dt><dd>{incident.sla}</dd></div>
            <div><dt>Địa điểm</dt><dd>{incident.site}</dd></div>
            <div><dt>Phụ trách</dt><dd>{incident.assignee}</dd></div>
            <div><dt>Phân loại</dt><dd>{incident.category}</dd></div>
            <div><dt>Khởi tạo</dt><dd>{incident.createdAt}</dd></div>
          </dl>
          <label className={styles.statusEditor}><span>Cập nhật trạng thái demo</span><select value={incident.status} onChange={(event) => onStatusChange(incident, event.target.value as IncidentStatus)}>{INCIDENT_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className={styles.timeline}>
            <h3>Luồng xử lý chuẩn</h3>
            {INCIDENT_WORKFLOW_STEPS.map((step, index) => <div key={step}><span>{index + 1}</span><p><strong>{step}</strong><small>{index === 0 ? "Đã ghi nhận" : "Theo workflow demo"}</small></p></div>)}
          </div>
        </>
      ) : (
        <div className={styles.detailEmpty}><span aria-hidden="true">SC</span><strong>Chọn một sự cố</strong><p>Chi tiết, SLA và luồng xử lý sẽ xuất hiện tại đây.</p></div>
      )}
    </aside>
  );
}
