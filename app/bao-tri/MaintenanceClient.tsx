"use client";

import { useMemo, useState } from "react";
import { useLocalStorageState } from "../_hooks/useLocalStorageState";
import {
  maintenanceRecords,
  type MaintenanceRecord,
  type MaintenanceStatus,
} from "../../lib/demo-data";
import styles from "./Maintenance.module.css";

const STORAGE_KEY = "ksops-demo-maintenance-checklist-v1";
const filters = ["Tất cả", "Sắp tới", "Đang thực hiện", "Hoàn tất", "Quá hạn"] as const satisfies readonly ("Tất cả" | MaintenanceStatus)[];
const EMPTY_CHECK_STATE: CheckState = {};

type MaintenanceFilter = (typeof filters)[number];
type CheckState = Record<string, boolean[]>;

function decodeCheckState(value: unknown): CheckState | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const stored = value as Record<string, unknown>;

  return maintenanceRecords.reduce<CheckState>((valid, task) => {
    const taskChecks = stored[task.id];
    if (
      Array.isArray(taskChecks)
      && taskChecks.length === task.checklist.length
      && taskChecks.every((item) => typeof item === "boolean")
    ) {
      valid[task.id] = taskChecks;
    }
    return valid;
  }, {});
}

function checksForTask(checks: CheckState, task: MaintenanceRecord) {
  return checks[task.id] ?? task.checklist.map(() => task.status === "Hoàn tất");
}

function toggleChecklistItem(values: boolean[], index: number) {
  return values.map((value, current) => current === index ? !value : value);
}

function completionPercentage(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function filterMaintenance(records: readonly MaintenanceRecord[], filter: MaintenanceFilter) {
  return records.filter((item) => filter === "Tất cả" || item.status === filter);
}

function MaintenanceOverview() {
  return (
    <section className={styles.overview} aria-label="Tổng hợp bảo trì">
      <article><span>Tuần này</span><strong>03</strong><small>công việc đã lên lịch</small></article>
      <article><span>Tuân thủ lịch</span><strong>94%</strong><small>mục tiêu pilot ≥ 92%</small></article>
      <article><span>Quá hạn</span><strong>01</strong><small>cần xử lý trong hôm nay</small></article>
      <article><span>Restore drill</span><strong>Đạt</strong><small>lần gần nhất: dữ liệu mẫu</small></article>
    </section>
  );
}

export default function MaintenanceClient() {
  const [filter, setFilter] = useState<MaintenanceFilter>("Tất cả");
  const [selectedId, setSelectedId] = useState(maintenanceRecords[0].id);
  const [checks, setChecks, resetStoredChecks] = useLocalStorageState({
    key: STORAGE_KEY,
    initialValue: EMPTY_CHECK_STATE,
    decode: decodeCheckState,
  });
  const [announcement, setAnnouncement] = useState("");

  const selected = useMemo(
    () => maintenanceRecords.find((task) => task.id === selectedId) ?? maintenanceRecords[0],
    [selectedId],
  );
  const visible = useMemo(() => filterMaintenance(maintenanceRecords, filter), [filter]);
  const selectedChecks = checksForTask(checks, selected);
  const doneCount = selectedChecks.filter(Boolean).length;
  const percentDone = completionPercentage(doneCount, selected.checklist.length);

  function toggleCheck(index: number) {
    const nextForTask = toggleChecklistItem(selectedChecks, index);
    setChecks((current) => ({ ...current, [selected.id]: nextForTask }));
    setAnnouncement(`Đã cập nhật checklist ${selected.id}: ${nextForTask.filter(Boolean).length}/${nextForTask.length} bước.`);
  }

  function resetChecks() {
    resetStoredChecks();
    setAnnouncement("Đã khôi phục checklist demo ban đầu.");
  }

  return (
    <div className={styles.module}>
      <p className="sr-only" aria-atomic="true" aria-live="polite">{announcement}</p>

      <MaintenanceOverview />

      <div className={styles.bodyGrid}>
        <section className={styles.schedule} id="lich-cong-viec" aria-labelledby="schedule-title">
          <div className={styles.sectionHeading}>
            <div><span>Tháng 08 / 2026</span><h2 id="schedule-title">Lịch công việc</h2></div>
            <button type="button" onClick={resetChecks}>Đặt lại checklist</button>
          </div>

          <div className={styles.filterTabs} role="group" aria-label="Lọc theo trạng thái">
            {filters.map((item) => (
              <button
                aria-pressed={item === filter}
                className={item === filter ? styles.tabActive : styles.tab}
                onClick={() => setFilter(item)}
                type="button"
                key={item}
              >
                {item}
              </button>
            ))}
          </div>

          <div className={styles.taskList} aria-label="Danh sách công việc bảo trì">
            {visible.map((task) => {
              const [day, month] = task.date.split("/");
              return (
                <button
                  aria-pressed={selected.id === task.id}
                  className={selected.id === task.id ? styles.taskActive : styles.task}
                  onClick={() => setSelectedId(task.id)}
                  type="button"
                  key={task.id}
                >
                  <span className={styles.dateTile}><strong>{day}</strong><small>THÁNG {month}</small></span>
                  <span className={styles.taskCopy}>
                    <span className={styles.taskMeta}>{task.id} · {task.type}</span>
                    <strong>{task.title}</strong>
                    <small>{task.time} · {task.site} · {task.owner}</small>
                  </span>
                  <i data-status={task.status}>{task.status}</i>
                </button>
              );
            })}
            {visible.length === 0 ? <div className={styles.empty}><strong>Chưa có công việc</strong><p>Không có lịch phù hợp bộ lọc đang chọn.</p></div> : null}
          </div>
        </section>

        <aside className={styles.workOrder} aria-labelledby="work-order-title" aria-live="polite">
          <div className={styles.workHeader}>
            <span>{selected.id}</span>
            <i data-status={selected.status}>{selected.status}</i>
            <h2 id="work-order-title">{selected.title}</h2>
            <p>{selected.type} · {selected.date}, {selected.time}</p>
          </div>

          <dl className={styles.workMeta}>
            <div><dt>Địa điểm</dt><dd>{selected.site}</dd></div>
            <div><dt>Đội phụ trách</dt><dd>{selected.owner}</dd></div>
            <div><dt>Cửa sổ</dt><dd>{selected.time}</dd></div>
            <div><dt>Thay đổi</dt><dd>Đã mô phỏng</dd></div>
          </dl>

          <div className={styles.progressHeading}>
            <div><span>Checklist thực hiện</span><strong>{doneCount}/{selected.checklist.length} hoàn tất</strong></div>
            <b>{percentDone}%</b>
          </div>
          <div
            aria-label={`Tiến độ checklist ${selected.id}`}
            aria-valuemax={selected.checklist.length}
            aria-valuemin={0}
            aria-valuenow={doneCount}
            className={styles.progress}
            role="progressbar"
          >
            <span style={{ width: `${percentDone}%` }} />
          </div>

          <div className={styles.checklist}>
            {selected.checklist.map((item, index) => {
              const inputId = `${selected.id}-check-${index}`;
              return (
                <label aria-label={`Bước bảo trì: ${item}`} htmlFor={inputId} key={item}>
                  <input id={inputId} checked={Boolean(selectedChecks[index])} onChange={() => toggleCheck(index)} type="checkbox" />
                  <span><strong>{item}</strong><small>{selectedChecks[index] ? "Đã ghi nhận trên thiết bị này" : "Chưa thực hiện"}</small></span>
                </label>
              );
            })}
          </div>

          <div className={styles.changeGate}>
            <span aria-hidden="true">✓</span>
            <div><strong>Change gate</strong><p>Mọi thay đổi production phải có phê duyệt, phương án quay lui và bằng chứng sau triển khai.</p></div>
          </div>
        </aside>
      </div>

      <section className={styles.monthStrip} aria-label="Cường độ bảo trì theo tuần">
        <div><span>Lịch công việc theo tuần</span><strong>Tháng 08 / 2026</strong></div>
        {[3, 5, 2, 4].map((count, index) => <article key={index}><span>Tuần {index + 1}</span><div aria-hidden="true"><i style={{ width: `${count * 18}%` }} /></div><strong>{count}</strong></article>)}
        <p>Biểu đồ chỉ dùng dữ liệu tổng hợp mẫu.</p>
      </section>
    </div>
  );
}
