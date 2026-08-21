"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorageState } from "../_hooks/useLocalStorageState";
import { CreateIncidentDialog } from "./_components/CreateIncidentDialog";
import { IncidentDetailPane } from "./_components/IncidentDetailPane";
import { IncidentListPane } from "./_components/IncidentListPane";
import { IncidentSummary } from "./_components/IncidentSummary";
import {
  buildIncidentRecord,
  decodeStoredIncidents,
  EMPTY_INCIDENT_DRAFT,
  EMPTY_INCIDENTS,
  filterIncidentRecords,
  INCIDENT_STORAGE_KEY,
  mergeIncidentRecords,
  shouldOpenIncidentForm,
  upsertIncidentRecord,
  urlWithoutIncidentFormTrigger,
  type DraftIncident,
  type IncidentRecord,
  type IncidentStatus,
  type PriorityFilter,
  type StatusFilter,
} from "./_lib/incidents";
import styles from "./Incidents.module.css";

function clearIncidentFormTriggerFromUrl() {
  const nextUrl = urlWithoutIncidentFormTrigger(window.location);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) window.history.replaceState(window.history.state, "", nextUrl);
}

export default function IncidentsClient() {
  const [created, setCreated, resetCreated] = useLocalStorageState({
    key: INCIDENT_STORAGE_KEY,
    initialValue: EMPTY_INCIDENTS,
    decode: decodeStoredIncidents,
  });
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<PriorityFilter>("Tất cả");
  const [status, setStatus] = useState<StatusFilter>("Tất cả");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<DraftIncident>(EMPTY_INCIDENT_DRAFT);
  const [announcement, setAnnouncement] = useState("");
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const openInitialForm = () => {
      setFormOpen(shouldOpenIncidentForm(window.location.search, window.location.hash));
    };
    const openFormFromHash = () => setFormOpen(window.location.hash === "#tao-su-co");
    const frame = window.requestAnimationFrame(openInitialForm);
    window.addEventListener("hashchange", openFormFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openFormFromHash);
    };
  }, []);

  useEffect(() => {
    if (!formOpen) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFormOpen(false);
      clearIncidentFormTriggerFromUrl();
      window.requestAnimationFrame(() => createButtonRef.current?.focus());
    };
    const frame = window.requestAnimationFrame(() => titleInputRef.current?.focus());
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [formOpen]);

  const allIncidents = useMemo(() => mergeIncidentRecords(created), [created]);
  const filtered = useMemo(
    () => filterIncidentRecords(allIncidents, query, priority, status),
    [allIncidents, priority, query, status],
  );
  const selected = useMemo(
    () => allIncidents.find((incident) => incident.id === selectedId) ?? null,
    [allIncidents, selectedId],
  );

  function closeCreateForm(restoreFocus = true) {
    setFormOpen(false);
    clearIncidentFormTriggerFromUrl();
    if (restoreFocus) window.requestAnimationFrame(() => createButtonRef.current?.focus());
  }

  function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.site.trim()) {
      setAnnouncement("Vui lòng nhập nội dung có ý nghĩa cho các trường bắt buộc.");
      return;
    }

    const incident = buildIncidentRecord(draft, Date.now());
    setCreated((current) => upsertIncidentRecord(current, incident));
    setDraft(EMPTY_INCIDENT_DRAFT);
    closeCreateForm(false);
    setSelectedId(incident.id);
    setAnnouncement(`Đã tạo ${incident.id} trong dữ liệu demo.`);
  }

  function updateStatus(incident: IncidentRecord, nextStatus: IncidentStatus) {
    const nextRecord = { ...incident, status: nextStatus };
    setCreated((current) => upsertIncidentRecord(current, nextRecord));
    setSelectedId(nextRecord.id);
    setAnnouncement(`Đã đổi trạng thái ${incident.id} thành ${nextStatus}.`);
  }

  function resetDemo() {
    resetCreated();
    setSelectedId(null);
    setAnnouncement("Đã khôi phục dữ liệu demo ban đầu.");
  }

  return (
    <div className={styles.module}>
      <p className="sr-only" aria-atomic="true" aria-live="polite">{announcement}</p>
      <IncidentSummary incidents={allIncidents} />
      <section className={styles.workspace} aria-labelledby="incident-list-title">
        <IncidentListPane
          createButtonRef={createButtonRef}
          filtered={filtered}
          formOpen={formOpen}
          priority={priority}
          query={query}
          selectedId={selected?.id ?? null}
          status={status}
          onOpenCreate={() => setFormOpen(true)}
          onPriorityChange={setPriority}
          onQueryChange={setQuery}
          onReset={resetDemo}
          onSelect={setSelectedId}
          onStatusChange={setStatus}
        />
        <IncidentDetailPane incident={selected} onStatusChange={updateStatus} />
      </section>
      {formOpen ? (
        <CreateIncidentDialog
          draft={draft}
          titleInputRef={titleInputRef}
          onClose={() => closeCreateForm()}
          onDraftChange={(values) => setDraft((current) => ({ ...current, ...values }))}
          onSubmit={createIncident}
        />
      ) : null}
    </div>
  );
}
