"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  DISPATCH_DATES,
  DISPATCH_SHIFTS,
  DISPATCH_STATUSES,
  DISPATCH_TYPES,
  demoDispatchTasks,
  demoDrivers,
  demoVehicles,
  filterDispatchTasks,
  formatDispatchDate,
  getDispatchSummary,
  getUtilization,
  simulateAssignment,
  type DispatchFilters,
  type DispatchStatus,
  type DispatchTask,
  type RiskLevel,
} from "../_lib/dispatch";
import styles from "../page.module.css";

const initialFilters: DispatchFilters = {
  date: "2026-08-21",
  type: "Tất cả loại hình",
  status: "Tất cả trạng thái",
  shift: "Tất cả ca",
};

const statusClass: Record<DispatchStatus, string> = {
  "Chờ điều phối": styles.statusWaiting,
  "Sẵn sàng": styles.statusReady,
  "Đang chạy": styles.statusRunning,
  "Có xung đột": styles.statusConflict,
};

const riskClass: Record<RiskLevel, string> = {
  "Ổn định": styles.riskStable,
  "Theo dõi": styles.riskWatch,
  "Cao": styles.riskHigh,
};

function StatusBadge({ status }: { status: DispatchStatus }) {
  return <span className={`${styles.statusBadge} ${statusClass[status]}`}>{status}</span>;
}

function Utilization({ task, compact = false }: { task: DispatchTask; compact?: boolean }) {
  const value = getUtilization(task);
  return (
    <div className={compact ? styles.utilizationCompact : styles.utilization}>
      <div>
        <span>{task.capacityUnit === "kg" ? "Mức tải" : "Lấp đầy"}</span>
        <strong>{value}%</strong>
      </div>
      <span
        className={value >= 90 ? styles.loadTrackRisk : styles.loadTrack}
        role="progressbar"
        aria-label={`${task.capacityUnit === "kg" ? "Mức tải" : "Mức lấp đầy"} của ${task.id}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <i style={{ width: `${value}%` }} />
      </span>
      {!compact ? <small>{task.capacityLabel}</small> : null}
    </div>
  );
}

function DispatchCard({
  task,
  selected,
  onSelect,
}: {
  task: DispatchTask;
  selected: boolean;
  onSelect: (task: DispatchTask) => void;
}) {
  return (
    <button
      className={selected ? styles.taskCardSelected : styles.taskCard}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(task)}
    >
      <span className={styles.taskTopline}>
        <span className={styles.typePill}>{task.type}</span>
        <StatusBadge status={task.status} />
      </span>
      <span className={styles.taskIdentity}>
        <strong>{task.id}</strong>
        <small>{task.routeCode} · {task.time}</small>
      </span>
      <span className={styles.taskRoute}>
        <strong>{task.origin}</strong><i aria-hidden="true">→</i><strong>{task.destination}</strong>
      </span>
      <span className={styles.resourcePair}>
        <span><i aria-hidden="true">XE</i><span>{task.vehicleAlias}</span></span>
        <span><i aria-hidden="true">TX</i><span>{task.driverAlias}</span></span>
      </span>
      <Utilization task={task} compact />
      {task.warnings.length ? (
        <span className={`${styles.cardWarning} ${riskClass[task.risk]}`}>
          <i aria-hidden="true">!</i> {task.warnings[0]}
          {task.warnings.length > 1 ? ` +${task.warnings.length - 1}` : ""}
        </span>
      ) : (
        <span className={styles.cardClear}><i aria-hidden="true">✓</i> Không có cảnh báo đang mở</span>
      )}
    </button>
  );
}

function AssignmentPanel({
  task,
  onAssign,
}: {
  task: DispatchTask;
  onAssign: (task: DispatchTask, vehicle: string, driver: string) => void;
}) {
  const vehicleDefault = demoVehicles.includes(task.vehicleAlias as (typeof demoVehicles)[number])
    ? task.vehicleAlias
    : demoVehicles[0];
  const driverDefault = demoDrivers.includes(task.driverAlias as (typeof demoDrivers)[number])
    ? task.driverAlias
    : demoDrivers[0];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const vehicle = data.get("vehicle");
    const driver = data.get("driver");
    if (typeof vehicle === "string" && typeof driver === "string") onAssign(task, vehicle, driver);
  }

  return (
    <aside className={styles.assignmentPanel} aria-labelledby="assignment-title">
      <div className={styles.detailHeading}>
        <div>
          <span className={styles.eyebrow}>Bàn điều phối mô phỏng</span>
          <h2 id="assignment-title">{task.id}</h2>
          <p>{task.routeCode} · {task.type}</p>
        </div>
        <span className={`${styles.riskBadge} ${riskClass[task.risk]}`}>Rủi ro: {task.risk}</span>
      </div>

      <div className={styles.routeSummary}>
        <span><small>Điểm đi</small><strong>{task.origin}</strong></span>
        <i aria-hidden="true">→</i>
        <span><small>Điểm đến</small><strong>{task.destination}</strong></span>
      </div>

      <dl className={styles.taskFacts}>
        <div><dt>Ngày / ca</dt><dd>{formatDispatchDate(task.date)} · {task.shift}</dd></div>
        <div><dt>Khung giờ</dt><dd>{task.time}</dd></div>
        <div><dt>Xe hiện tại</dt><dd>{task.vehicleAlias}</dd></div>
        <div><dt>Tài xế hiện tại</dt><dd>{task.driverAlias}</dd></div>
      </dl>

      <Utilization task={task} />

      <section className={styles.warningSection} aria-labelledby="warning-title">
        <div className={styles.sectionHeading}>
          <h3 id="warning-title">Cảnh báo và kiểm tra</h3>
          <span>{task.warnings.length} cảnh báo</span>
        </div>
        {task.warnings.length ? (
          <ul>
            {task.warnings.map((warning) => <li key={warning}><span aria-hidden="true">!</span>{warning}</li>)}
          </ul>
        ) : (
          <p className={styles.noWarning}><span aria-hidden="true">✓</span> Chưa phát hiện xung đột trong kịch bản hiện tại.</p>
        )}
      </section>

      <form className={styles.assignmentForm} key={`${task.id}-${task.vehicleAlias}-${task.driverAlias}`} onSubmit={handleSubmit}>
        <div className={styles.sectionHeading}>
          <div><h3>Gán nguồn lực</h3><p>Hệ thống sẽ kiểm tra trùng xe/tài xế trong cùng ngày và ca.</p></div>
        </div>
        <label>
          <span>Xe mô phỏng</span>
          <select name="vehicle" defaultValue={vehicleDefault}>
            {demoVehicles.map((vehicle) => <option key={vehicle}>{vehicle}</option>)}
          </select>
        </label>
        <label>
          <span>Tài xế mô phỏng</span>
          <select name="driver" defaultValue={driverDefault}>
            {demoDrivers.map((driver) => <option key={driver}>{driver}</option>)}
          </select>
        </label>
        <button className={styles.primaryButton} type="submit">Xác nhận điều phối mô phỏng</button>
        <small>Không gửi lệnh đến xe, tài xế hoặc hệ thống bên ngoài.</small>
      </form>

      <div className={styles.detailNote}><strong>Ghi chú lệnh</strong><p>{task.note}</p></div>
    </aside>
  );
}

export default function DispatchBoard() {
  const [tasks, setTasks] = useState(demoDispatchTasks);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedId, setSelectedId] = useState(demoDispatchTasks[0].id);
  const [announcement, setAnnouncement] = useState("Bảng điều phối mẫu đã sẵn sàng.");

  const visibleTasks = useMemo(() => filterDispatchTasks(tasks, filters), [filters, tasks]);
  const summary = useMemo(() => getDispatchSummary(tasks, filters.date), [filters.date, tasks]);
  const selectedTask = visibleTasks.find((task) => task.id === selectedId) ?? visibleTasks[0] ?? null;

  function selectTask(task: DispatchTask) {
    setSelectedId(task.id);
    setAnnouncement(`Đã mở lệnh ${task.id}.`);
  }

  function assignTask(task: DispatchTask, vehicle: string, driver: string) {
    const result = simulateAssignment(tasks, task.id, vehicle, driver);
    setTasks(result.tasks);
    setSelectedId(task.id);
    setAnnouncement(result.message);
  }

  function autoAssignNext() {
    const waiting = visibleTasks.find((task) => task.status === "Chờ điều phối");
    if (!waiting) {
      setAnnouncement("Không có lệnh chờ điều phối trong bộ lọc hiện tại.");
      return;
    }
    const usedVehicles = new Set(tasks.filter((task) => task.date === waiting.date && task.shift === waiting.shift).map((task) => task.vehicleAlias));
    const usedDrivers = new Set(tasks.filter((task) => task.date === waiting.date && task.shift === waiting.shift).map((task) => task.driverAlias));
    const vehicle = demoVehicles.find((item) => !usedVehicles.has(item)) ?? demoVehicles[0];
    const driver = demoDrivers.find((item) => !usedDrivers.has(item)) ?? demoDrivers[0];
    assignTask(waiting, vehicle, driver);
  }

  function resetBoard() {
    setTasks(demoDispatchTasks);
    setFilters(initialFilters);
    setSelectedId(demoDispatchTasks[0].id);
    setAnnouncement("Đã khôi phục kịch bản điều phối ban đầu.");
  }

  return (
    <div className={styles.page}>
      <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>

      <section className={styles.hero} aria-labelledby="dispatch-hero-title">
        <div>
          <span className={styles.eyebrow}>Dispatch control · Lập kế hoạch đa dịch vụ</span>
          <h2 id="dispatch-hero-title">Cân bằng chuyến, xe và tài xế theo từng ca.</h2>
          <p>
            Theo dõi chuyến cố định, xe hợp đồng và hàng hóa trên một bảng điều phối có cảnh báo xung đột.
          </p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.ghostButtonDark} type="button" onClick={resetBoard}>Khôi phục kịch bản</button>
          <button className={styles.heroButton} type="button" onClick={autoAssignNext}>
            <span aria-hidden="true">↯</span> Tự xếp lệnh tiếp theo
          </button>
        </div>
      </section>

      <section className={styles.metrics} aria-label={`Tổng hợp điều phối ngày ${formatDispatchDate(filters.date)}`}>
        <article className={styles.metricCard}><span className={styles.metricIcon}>CA</span><div><p>Lệnh trong ngày</p><strong>{summary.total}</strong><small>tất cả loại hình</small></div></article>
        <article className={styles.metricCard}><span className={`${styles.metricIcon} ${styles.metricGreen}`}>✓</span><div><p>Đã sẵn sàng</p><strong>{summary.ready}</strong><small>đủ nguồn lực mô phỏng</small></div></article>
        <article className={styles.metricCard}><span className={`${styles.metricIcon} ${styles.metricBlue}`}>→</span><div><p>Đang chạy</p><strong>{summary.running}</strong><small>trong ca hiện tại</small></div></article>
        <article className={styles.metricCard}><span className={`${styles.metricIcon} ${styles.metricAmber}`}>!</span><div><p>Cần can thiệp</p><strong>{summary.attention}</strong><small>chờ gán hoặc rủi ro cao</small></div></article>
      </section>

      <section className={styles.boardPanel} aria-labelledby="dispatch-board-title">
        <div className={styles.panelHeading}>
          <div><span className={styles.eyebrow}>Bảng ca vận hành</span><h2 id="dispatch-board-title">Điều phối theo thời gian</h2><p>Chọn một lệnh để xem tải, cảnh báo và thử gán nguồn lực.</p></div>
          <span className={styles.resultCount} role="status" aria-live="polite">{visibleTasks.length} lệnh phù hợp</span>
        </div>

        <div className={styles.filters}>
          <label><span>Ngày vận hành</span><select value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value as DispatchFilters["date"] }))}>{DISPATCH_DATES.map((date) => <option value={date} key={date}>{formatDispatchDate(date)}</option>)}</select></label>
          <label><span>Loại hình</span><select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as DispatchFilters["type"] }))}><option>Tất cả loại hình</option>{DISPATCH_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label><span>Ca thời gian</span><select value={filters.shift} onChange={(event) => setFilters((current) => ({ ...current, shift: event.target.value as DispatchFilters["shift"] }))}><option>Tất cả ca</option>{DISPATCH_SHIFTS.map((shift) => <option key={shift}>{shift}</option>)}</select></label>
          <label><span>Trạng thái</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as DispatchFilters["status"] }))}><option>Tất cả trạng thái</option>{DISPATCH_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <button className={styles.clearButton} type="button" onClick={() => setFilters((current) => ({ ...initialFilters, date: current.date }))}>Xóa lọc</button>
        </div>

        <div className={styles.workspace}>
          <div className={styles.lanes}>
            {DISPATCH_SHIFTS.map((shift) => {
              const shiftTasks = visibleTasks.filter((task) => task.shift === shift);
              if (!shiftTasks.length && filters.shift !== shift) return null;
              return (
                <section className={styles.lane} key={shift} aria-labelledby={`lane-${shift.replace(" ", "-")}`}>
                  <div className={styles.laneHeading}>
                    <div><span aria-hidden="true">{shift === "Ca sáng" ? "☀" : shift === "Ca chiều" ? "◒" : "☾"}</span><h3 id={`lane-${shift.replace(" ", "-")}`}>{shift}</h3></div>
                    <small>{shiftTasks.length} lệnh</small>
                  </div>
                  {shiftTasks.length ? (
                    <div className={styles.laneCards}>
                      {shiftTasks.map((task) => <DispatchCard key={task.id} task={task} selected={selectedTask?.id === task.id} onSelect={selectTask} />)}
                    </div>
                  ) : <p className={styles.emptyLane}>Không có lệnh trong ca theo bộ lọc.</p>}
                </section>
              );
            })}
            {!visibleTasks.length && filters.shift === "Tất cả ca" ? (
              <div className={styles.emptyBoard}><span aria-hidden="true">◇</span><h3>Chưa có lệnh phù hợp</h3><p>Hãy chọn ngày khác hoặc xóa bớt bộ lọc.</p></div>
            ) : null}
          </div>
          {selectedTask ? <AssignmentPanel task={selectedTask} onAssign={assignTask} /> : null}
        </div>
      </section>
    </div>
  );
}
