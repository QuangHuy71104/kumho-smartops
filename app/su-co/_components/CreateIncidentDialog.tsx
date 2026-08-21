import type { FormEventHandler, RefObject } from "react";
import {
  INCIDENT_PRIORITIES,
  type DraftIncident,
  type IncidentPriority,
} from "../_lib/incidents";
import styles from "../Incidents.module.css";

type CreateIncidentDialogProps = {
  draft: DraftIncident;
  titleInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onDraftChange: (values: Partial<DraftIncident>) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function CreateIncidentDialog({
  draft,
  titleInputRef,
  onClose,
  onDraftChange,
  onSubmit,
}: CreateIncidentDialogProps) {
  return (
    <div className={styles.modalLayer}>
      <button
        aria-hidden="true"
        className={styles.modalBackdrop}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-describedby="create-description"
        aria-labelledby="create-title"
        aria-modal="true"
        className={styles.modal}
        id="create-incident-dialog"
        role="dialog"
      >
        <div className={styles.modalHeading}><div><span>Tạo dữ liệu trên thiết bị</span><h2 id="create-title">Sự cố demo mới</h2></div><button onClick={onClose} type="button" aria-label="Đóng biểu mẫu">×</button></div>
        <div className={styles.privacyCallout}><strong>Không nhập thông tin thật.</strong><p id="create-description">Biểu mẫu không gửi dữ liệu đến máy chủ và chỉ lưu cục bộ trong trình duyệt.</p></div>
        <form onSubmit={onSubmit}>
          <label className={styles.fullField}><span>Tiêu đề sự cố</span><input ref={titleInputRef} required minLength={8} maxLength={100} value={draft.title} onChange={(event) => onDraftChange({ title: event.target.value })} placeholder="Ví dụ: Thiết bị demo không phản hồi" /></label>
          <label><span>Phân loại</span><select value={draft.category} onChange={(event) => onDraftChange({ category: event.target.value })}><option>Thiết bị đầu cuối</option><option>Ứng dụng</option><option>Hạ tầng</option><option>Danh tính & quyền</option><option>An toàn thông tin</option></select></label>
          <label><span>Ưu tiên</span><select value={draft.priority} onChange={(event) => onDraftChange({ priority: event.target.value as IncidentPriority })}>{INCIDENT_PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className={styles.fullField}><span>Địa điểm mô phỏng</span><input required value={draft.site} onChange={(event) => onDraftChange({ site: event.target.value })} /></label>
          <div className={styles.formActions}><button type="button" onClick={onClose}>Hủy</button><button type="submit">Tạo sự cố demo</button></div>
        </form>
      </section>
    </div>
  );
}
