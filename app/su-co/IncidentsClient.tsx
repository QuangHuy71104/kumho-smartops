"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  incidentRecords,
  type IncidentPriority,
  type IncidentRecord,
  type IncidentStatus,
} from "../../lib/demo-data";
import styles from "./Incidents.module.css";

const STORAGE_KEY = "ksops-demo-incidents-v1";
const priorities: Array<"Tất cả" | IncidentPriority> = ["Tất cả", "Khẩn cấp", "Cao", "Trung bình", "Thấp"];
const statuses: Array<"Tất cả" | IncidentStatus> = ["Tất cả", "Mới", "Đang xử lý", "Chờ phản hồi", "Đã giải quyết"];

type DraftIncident = {
  title: string;
  category: string;
  priority: IncidentPriority;
  site: string;
};

const emptyDraft: DraftIncident = {
  title: "",
  category: "Thiết bị đầu cuối",
  priority: "Trung bình",
  site: "Điểm vận hành demo",
};

function loadSavedIncidents(): IncidentRecord[] {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as IncidentRecord[]) : [];
  } catch {
    return [];
  }
}

export default function IncidentsClient() {
  const [created, setCreated] = useState<IncidentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("Tất cả");
  const [status, setStatus] = useState<(typeof statuses)[number]>("Tất cả");
  const [selected, setSelected] = useState<IncidentRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<DraftIncident>(emptyDraft);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCreated(loadSavedIncidents());
      const search = new URLSearchParams(window.location.search);
      if (search.get("new") === "1" || window.location.hash === "#tao-su-co") {
        setFormOpen(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const openFromHash = () => setFormOpen(window.location.hash === "#tao-su-co");
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const allIncidents = useMemo(() => [...created, ...incidentRecords], [created]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return allIncidents.filter((incident) => {
      const matchesQuery = !normalized || [incident.id, incident.title, incident.category, incident.site, incident.assignee]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(normalized);
      return matchesQuery
        && (priority === "Tất cả" || incident.priority === priority)
        && (status === "Tất cả" || incident.status === status);
    });
  }, [allIncidents, priority, query, status]);

  const stats = useMemo(() => ({
    open: allIncidents.filter((item) => item.status !== "Đã giải quyết").length,
    urgent: allIncidents.filter((item) => item.priority === "Khẩn cấp" || item.priority === "Cao").length,
    waiting: allIncidents.filter((item) => item.status === "Chờ phản hồi").length,
    resolved: allIncidents.filter((item) => item.status === "Đã giải quyết").length,
  }), [allIncidents]);

  function persist(next: IncidentRecord[]) {
    setCreated(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const incident: IncidentRecord = {
      id: `INC-D${String(Date.now()).slice(-4)}`,
      title: draft.title.trim(),
      category: draft.category,
      priority: draft.priority,
      status: "Mới",
      site: draft.site.trim(),
      assignee: "Chưa phân công",
      createdAt: "Vừa tạo · Trên thiết bị này",
      sla: draft.priority === "Cao" || draft.priority === "Khẩn cấp" ? "Còn 1 giờ" : "Còn 4 giờ",
      summary: "Sự cố demo do người xem tạo và chỉ được lưu trong trình duyệt hiện tại.",
    };
    persist([incident, ...created]);
    setDraft(emptyDraft);
    setFormOpen(false);
    setSelected(incident);
    setAnnouncement(`Đã tạo ${incident.id} trong dữ liệu demo.`);
    window.history.replaceState(null, "", window.location.pathname);
  }

  function updateStatus(incident: IncidentRecord, nextStatus: IncidentStatus) {
    const existsInCreated = created.some((item) => item.id === incident.id);
    const nextRecord = { ...incident, status: nextStatus };
    const nextCreated = existsInCreated
      ? created.map((item) => item.id === incident.id ? nextRecord : item)
      : [nextRecord, ...created];
    persist(nextCreated);
    setSelected(nextRecord);
    setAnnouncement(`Đã đổi trạng thái ${incident.id} thành ${nextStatus}.`);
  }

  function resetDemo() {
    window.localStorage.removeItem(STORAGE_KEY);
    setCreated([]);
    setSelected(null);
    setAnnouncement("Đã khôi phục dữ liệu demo ban đầu.");
  }

  return (
    <div className={styles.module}>
      <p className="sr-only" aria-live="polite">{announcement}</p>

      <section className={styles.stats} aria-label="Tổng hợp sự cố">
        <article><span>Đang mở</span><strong>{String(stats.open).padStart(2, "0")}</strong><small>Toàn bộ hàng đợi</small></article>
        <article><span>Ưu tiên cao</span><strong>{String(stats.urgent).padStart(2, "0")}</strong><small>Cần phản hồi sớm</small></article>
        <article><span>Chờ phản hồi</span><strong>{String(stats.waiting).padStart(2, "0")}</strong><small>Từ người yêu cầu</small></article>
        <article><span>Đã giải quyết</span><strong>{String(stats.resolved).padStart(2, "0")}</strong><small>Trong dữ liệu hiện tại</small></article>
      </section>

      <section className={styles.workspace} aria-labelledby="incident-list-title">
        <div className={styles.listPane}>
          <div className={styles.sectionHeading}>
            <div><p>Hàng đợi vận hành</p><h2 id="incident-list-title">Danh sách sự cố</h2></div>
            <button className={styles.resetButton} type="button" onClick={resetDemo}>Đặt lại demo</button>
          </div>

          <div className={styles.filters}>
            <label className={styles.searchField}>
              <span>Tìm kiếm</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã, tiêu đề, nhóm phụ trách..." type="search" />
            </label>
            <label><span>Ưu tiên</span><select value={priority} onChange={(event) => setPriority(event.target.value as (typeof priorities)[number])}>{priorities.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
            <button className={styles.createButton} type="button" onClick={() => setFormOpen(true)}>+ Tạo mới</button>
          </div>

          <div className={styles.resultsMeta}><span>{filtered.length} kết quả</span><span>Chỉ lưu thay đổi trên trình duyệt này</span></div>
          <div className={styles.ticketList}>
            {filtered.map((incident) => (
              <button
                className={selected?.id === incident.id ? styles.ticketActive : styles.ticket}
                key={`${incident.id}-${incident.status}`}
                onClick={() => setSelected(incident)}
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

        <aside className={styles.detailPane} aria-label="Chi tiết sự cố">
          {selected ? (
            <>
              <div className={styles.detailHeading}><span>{selected.id}</span><i data-priority={selected.priority}>{selected.priority}</i><h2>{selected.title}</h2><p>{selected.summary}</p></div>
              <dl className={styles.detailGrid}>
                <div><dt>Trạng thái</dt><dd>{selected.status}</dd></div>
                <div><dt>SLA</dt><dd>{selected.sla}</dd></div>
                <div><dt>Địa điểm</dt><dd>{selected.site}</dd></div>
                <div><dt>Phụ trách</dt><dd>{selected.assignee}</dd></div>
                <div><dt>Phân loại</dt><dd>{selected.category}</dd></div>
                <div><dt>Khởi tạo</dt><dd>{selected.createdAt}</dd></div>
              </dl>
              <label className={styles.statusEditor}><span>Cập nhật trạng thái demo</span><select value={selected.status} onChange={(event) => updateStatus(selected, event.target.value as IncidentStatus)}>{statuses.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
              <div className={styles.timeline}>
                <h3>Luồng xử lý chuẩn</h3>
                {["Tiếp nhận và xác nhận phạm vi", "Khoanh vùng và chẩn đoán", "Khắc phục theo runbook", "Kiểm tra lại và cập nhật nhật ký"].map((step, index) => <div key={step}><span>{index + 1}</span><p><strong>{step}</strong><small>{index === 0 ? "Đã ghi nhận" : "Theo workflow demo"}</small></p></div>)}
              </div>
            </>
          ) : (
            <div className={styles.detailEmpty}><span aria-hidden="true">SC</span><strong>Chọn một sự cố</strong><p>Chi tiết, SLA và luồng xử lý sẽ xuất hiện tại đây.</p></div>
          )}
        </aside>
      </section>

      {formOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setFormOpen(false); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="create-title" id="tao-su-co">
            <div className={styles.modalHeading}><div><span>Tạo dữ liệu trên thiết bị</span><h2 id="create-title">Sự cố demo mới</h2></div><button onClick={() => setFormOpen(false)} type="button" aria-label="Đóng biểu mẫu">×</button></div>
            <div className={styles.privacyCallout}><strong>Không nhập thông tin thật.</strong><p>Biểu mẫu không gửi dữ liệu đến máy chủ và chỉ lưu cục bộ trong trình duyệt.</p></div>
            <form onSubmit={createIncident}>
              <label className={styles.fullField}><span>Tiêu đề sự cố</span><input required minLength={8} maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ví dụ: Thiết bị demo không phản hồi" /></label>
              <label><span>Phân loại</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option>Thiết bị đầu cuối</option><option>Ứng dụng</option><option>Hạ tầng</option><option>Danh tính & quyền</option><option>An toàn thông tin</option></select></label>
              <label><span>Ưu tiên</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as IncidentPriority })}>{priorities.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className={styles.fullField}><span>Địa điểm mô phỏng</span><input required value={draft.site} onChange={(event) => setDraft({ ...draft, site: event.target.value })} /></label>
              <div className={styles.formActions}><button type="button" onClick={() => setFormOpen(false)}>Hủy</button><button type="submit">Tạo sự cố demo</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
