"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { operatingClock } from "../../_lib/operating-time.ts";
import { filterVehicles, getFleetSummary, getLiveVehicles, vehicles, vehicleStatuses, vehicleTypes } from "../_lib/fleet";
import type { VehicleStatus } from "../_lib/fleet";
import styles from "../page.module.css";

const statusClass: Record<VehicleStatus, string> = {
  "Sẵn sàng": styles.statusReady,
  "Đang chạy": styles.statusRunning,
  "Bảo dưỡng": styles.statusMaintenance,
};

export default function FleetDashboard() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Tất cả");
  const [status, setStatus] = useState("Tất cả");
  const [view, setView] = useState<"table" | "cards">("table");
  const [selectedId, setSelectedId] = useState(vehicles[0].id);
  const [now, setNow] = useState(() => new Date());
  const liveVehicles = useMemo(() => getLiveVehicles(now), [now]);
  const fleetSummary = useMemo(() => getFleetSummary(liveVehicles), [liveVehicles]);

  const filteredVehicles = useMemo(
    () => filterVehicles(liveVehicles, search, type, status),
    [liveVehicles, search, status, type],
  );
  const selectedVehicle = liveVehicles.find((vehicle) => vehicle.id === selectedId) ?? liveVehicles[0];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function resetFilters() {
    setSearch("");
    setType("Tất cả");
    setStatus("Tất cả");
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="fleet-hero-title">
        <div>
          <span className={styles.eyebrow}>ĐỘI XE TRỰC TUYẾN · {operatingClock(now)}</span>
          <h2 id="fleet-hero-title">Đúng xe, đúng thời điểm</h2>
          <p>Xe khách · Xe giường nằm · Xe hàng</p>
        </div>
        <div className={styles.heroStatus}>
          <span className={styles.heroPulse} aria-hidden="true" />
          <div><strong>{fleetSummary.ready} xe sẵn sàng</strong><small>Cập nhật lúc {operatingClock(now)}</small></div>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Chỉ số đội xe vận hành">
        <article><span className={styles.metricGlyph}>DX</span><div><p>Tổng phương tiện</p><strong>{fleetSummary.total}</strong><small>5 nhóm phương tiện</small></div></article>
        <article><span className={`${styles.metricGlyph} ${styles.green}`}>✓</span><div><p>Sẵn sàng</p><strong>{fleetSummary.ready}</strong><small>{Math.round(fleetSummary.ready / fleetSummary.total * 100)}% quy mô đội xe</small></div></article>
        <article><span className={`${styles.metricGlyph} ${styles.blue}`}>→</span><div><p>Đang chạy</p><strong>{fleetSummary.running}</strong><small>{fleetSummary.running} hành trình đang khai thác</small></div></article>
        <article><span className={`${styles.metricGlyph} ${styles.amber}`}>BD</span><div><p>Trong xưởng</p><strong>{fleetSummary.maintenance}</strong><small>Sẵn sàng trung bình {fleetSummary.averageReadiness}%</small></div></article>
      </section>

      <div className={styles.workspaceGrid}>
        <section className={styles.panel} aria-labelledby="fleet-list-title">
          <div className={styles.panelHeading}>
            <div><span>Danh mục vận hành</span><h2 id="fleet-list-title">Phương tiện</h2><p>Mã xe và hành trình đều là dữ liệu nghiệp vụ.</p></div>
            <span className={styles.resultCount} role="status" aria-live="polite">{filteredVehicles.length} kết quả</span>
          </div>

          <div className={styles.toolbar} role="search" aria-label="Tìm và lọc phương tiện">
            <label className={styles.searchField} htmlFor="fleet-search">
              <span className={styles.srOnly}>Tìm phương tiện</span>
              <span aria-hidden="true">⌕</span>
              <input id="fleet-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã xe, tài xế, hành trình..." />
            </label>
            <label><span className={styles.srOnly}>Loại xe</span><select value={type} onChange={(event) => setType(event.target.value)}><option>Tất cả</option>{vehicleTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span className={styles.srOnly}>Trạng thái xe</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Tất cả</option>{vehicleStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
            <button className={styles.resetButton} type="button" onClick={resetFilters}>Đặt lại</button>
            <div className={styles.viewToggle} aria-label="Kiểu hiển thị">
              <button type="button" className={view === "table" ? styles.viewActive : undefined} aria-pressed={view === "table"} onClick={() => setView("table")}>Bảng</button>
              <button type="button" className={view === "cards" ? styles.viewActive : undefined} aria-pressed={view === "cards"} onClick={() => setView("cards")}>Thẻ</button>
            </div>
          </div>

          {view === "table" ? (
            <div className={styles.tableWrap} role="region" aria-label="Bảng đội xe có thể cuộn ngang">
              <table className={styles.table}>
                <caption className={styles.srOnly}>Danh sách phương tiện vận hành</caption>
                <thead><tr><th scope="col">Phương tiện</th><th scope="col">Loại</th><th scope="col">Trạng thái</th><th scope="col">Tài xế / công việc</th><th scope="col">Sẵn sàng</th></tr></thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} data-selected={vehicle.id === selectedVehicle.id}>
                      <td><button type="button" onClick={() => setSelectedId(vehicle.id)}><strong>{vehicle.name}</strong><code>{vehicle.id}</code></button></td>
                      <td>{vehicle.type}<small>{vehicle.capacity}</small></td>
                      <td><span className={`${styles.status} ${statusClass[vehicle.status]}`}><i aria-hidden="true" />{vehicle.status}</span></td>
                      <td><strong>{vehicle.driver}</strong><small>{vehicle.assignment}</small></td>
                      <td><div className={styles.readiness}><span><i style={{ "--value": `${vehicle.readiness}%` } as CSSProperties} /></span><b>{vehicle.readiness}%</b></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {filteredVehicles.map((vehicle) => (
                <button className={styles.vehicleCard} data-selected={vehicle.id === selectedVehicle.id} type="button" key={vehicle.id} onClick={() => setSelectedId(vehicle.id)}>
                  <span className={`${styles.status} ${statusClass[vehicle.status]}`}><i aria-hidden="true" />{vehicle.status}</span>
                  <strong>{vehicle.name}</strong><code>{vehicle.id}</code>
                  <div><span>{vehicle.type}</span><span>{vehicle.readiness}% sẵn sàng</span></div>
                  <small>{vehicle.assignment}</small>
                </button>
              ))}
            </div>
          )}

          {filteredVehicles.length === 0 ? <div className={styles.empty} role="status"><strong>Không tìm thấy phương tiện</strong><p>Thử đổi từ khóa hoặc đặt lại bộ lọc.</p><button type="button" onClick={resetFilters}>Xóa bộ lọc</button></div> : null}
        </section>

        <aside className={styles.detail} aria-labelledby="vehicle-detail-title" aria-live="polite">
          <div className={styles.detailTop}>
            <span className={styles.vehicleBadge} aria-hidden="true">{selectedVehicle.type === "Xe hàng" ? "HH" : "XE"}</span>
            <span className={`${styles.status} ${statusClass[selectedVehicle.status]}`}><i aria-hidden="true" />{selectedVehicle.status}</span>
          </div>
          <p className={styles.detailKicker}>Hồ sơ phương tiện</p>
          <h2 id="vehicle-detail-title">{selectedVehicle.name}</h2>
          <code>{selectedVehicle.id}</code>
          <div className={styles.detailReadiness}>
            <div><span>Mức sẵn sàng</span><strong>{selectedVehicle.readiness}%</strong></div>
            <div className={styles.largeTrack}><span style={{ "--value": `${selectedVehicle.readiness}%` } as CSSProperties} /></div>
          </div>
          <dl className={styles.detailList}>
            <div><dt>Loại / sức chứa</dt><dd>{selectedVehicle.type}<small>{selectedVehicle.capacity}</small></dd></div>
            <div><dt>Vị trí hiện tại</dt><dd>{selectedVehicle.depot}</dd></div>
            <div><dt>Người điều khiển</dt><dd>{selectedVehicle.driver}</dd></div>
            <div><dt>Công việc hiện tại</dt><dd>{selectedVehicle.assignment}</dd></div>
          </dl>
          <div className={styles.milestone}><span aria-hidden="true">→</span><div><small>Mốc tiếp theo</small><strong>{selectedVehicle.nextMilestone}</strong></div></div>
          <div className={styles.technicalGrid}>
            <div><span>ODO hiện tại</span><strong>{selectedVehicle.odometer.toLocaleString("vi-VN")} km</strong></div>
            <div><span>Còn đến bảo dưỡng</span><strong className={selectedVehicle.serviceRemaining <= 0 ? styles.dangerText : undefined}>{selectedVehicle.serviceRemaining <= 0 ? "Đến hạn" : `${selectedVehicle.serviceRemaining.toLocaleString("vi-VN")} km`}</strong></div>
          </div>
          <p className={styles.inspection}>Kiểm tra gần nhất · {selectedVehicle.lastInspection}</p>
        </aside>
      </div>
    </div>
  );
}
