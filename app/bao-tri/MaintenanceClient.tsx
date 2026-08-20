"use client";

import { useEffect, useMemo, useState } from "react";
import { maintenanceRecords, type MaintenanceRecord, type MaintenanceStatus } from "../../lib/demo-data";
import styles from "./Maintenance.module.css";

const STORAGE_KEY = "ksops-demo-maintenance-checklist-v1";
const filters: Array<"Tất cả" | MaintenanceStatus> = ["Tất cả", "Sắp tới", "Đang thực hiện", "Hoàn tất", "Quá hạn"];

type CheckState = Record<string, boolean[]>;

function readState(): CheckState {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as CheckState : {};
  } catch {
    return {};
  }
}

export default function MaintenanceClient() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Tất cả");
  const [selected, setSelected] = useState<MaintenanceRecord>(maintenanceRecords[0]);
  const [checks, setChecks] = useState<CheckState>({});
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setChecks(readState()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const visible = useMemo(
    () => maintenanceRecords.filter((item) => filter === "Tất cả" || item.status === filter),
    [filter],
  );
  const selectedChecks = checks[selected.id] ?? selected.checklist.map(() => selected.status === "Hoàn tất");
  const doneCount = selectedChecks.filter(Boolean).length;

  function toggleCheck(index: number) {
    const nextForTask = selectedChecks.map((value, current) => current === index ? !value : value);
    const next = { ...checks, [selected.id]: nextForTask };
    setChecks(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAnnouncement(`Đã cập nhật checklist ${selected.id}: ${nextForTask.filter(Boolean).length}/${nextForTask.length} bước.`);
  }

  function resetChecks() {
    window.localStorage.removeItem(STORAGE_KEY);
    setChecks({});
    setAnnouncement("Đã khôi phục checklist demo ban đầu.");
  }

  return (
    <div className={styles.module}>
      <p className="sr-only" aria-live="polite">{announcement}</p>

      <section className={styles.overview} aria-label="Tổng hợp bảo trì">
        <article><span>Tuần này</span><strong>03</strong><small>công việc đã lên lịch</small></article>
        <article><span>Tuân thủ lịch</span><strong>94%</strong><small>mục tiêu pilot ≥ 92%</small></article>
        <article><span>Quá hạn</span><strong>01</strong><small>cần xử lý trong hôm nay</small></article>
        <article><span>Restore drill</span><strong>Đạt</strong><small>lần gần nhất: dữ liệu mẫu</small></article>
      </section>

      <div className={styles.bodyGrid}>
        <section className={styles.schedule} id="lich-cong-viec" aria-labelledby="schedule-title">
          <div className={styles.sectionHeading}>
            <div><span>Tháng 08 / 2026</span><h2 id="schedule-title">Lịch công việc</h2></div>
            <button type="button" onClick={resetChecks}>Đặt lại checklist</button>
          </div>

          <div className={styles.filterTabs} role="group" aria-label="Lọc theo trạng thái">
            {filters.map((item) => <button className={item === filter ? styles.tabActive : styles.tab} onClick={() => setFilter(item)} type="button" key={item}>{item}</button>)}
          </div>

          <div className={styles.taskList}>
            {visible.map((task) => {
              const [day, month] = task.date.split("/");
              return (
                <button className={selected.id === task.id ? styles.taskActive : styles.task} onClick={() => setSelected(task)} type="button" key={task.id}>
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

        <aside className={styles.workOrder} aria-labelledby="work-order-title">
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
            <b>{Math.round((doneCount / selected.checklist.length) * 100)}%</b>
          </div>
          <div className={styles.progress}><span style={{ width: `${(doneCount / selected.checklist.length) * 100}%` }} /></div>

          <div className={styles.checklist}>
            {selected.checklist.map((item, index) => (
              <label htmlFor={`${selected.id}-check-${index}`} key={item}>
                <span className="sr-only">Đánh dấu bước bảo trì</span>
                <input id={`${selected.id}-check-${index}`} checked={Boolean(selectedChecks[index])} onChange={() => toggleCheck(index)} type="checkbox" />
                <span><strong>{item}</strong><small>{selectedChecks[index] ? "Đã ghi nhận trên thiết bị này" : "Chưa thực hiện"}</small></span>
              </label>
            ))}
          </div>

          <div className={styles.changeGate}>
            <span aria-hidden="true">✓</span>
            <div><strong>Change gate</strong><p>Mọi thay đổi production phải có phê duyệt, phương án quay lui và bằng chứng sau triển khai.</p></div>
          </div>
        </aside>
      </div>

      <section className={styles.monthStrip} aria-label="Cường độ bảo trì theo tuần">
        <div><span>Lịch công việc theo tuần</span><strong>Tháng 08 / 2026</strong></div>
        {[3, 5, 2, 4].map((count, index) => <article key={index}><span>Tuần {index + 1}</span><div><i style={{ width: `${count * 18}%` }} /></div><strong>{count}</strong></article>)}
        <p>Biểu đồ chỉ dùng dữ liệu tổng hợp mẫu.</p>
      </section>
    </div>
  );
}
