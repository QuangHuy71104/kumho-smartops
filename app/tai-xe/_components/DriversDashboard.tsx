"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { availabilityOptions, drivers, driverSummary, filterDrivers, shiftOptions, shiftSummary } from "../_lib/drivers";
import type { DocumentState, DriverAvailability } from "../_lib/drivers";
import styles from "../page.module.css";

const availabilityClass: Record<DriverAvailability, string> = {
  "Sẵn sàng": styles.available,
  "Đang làm việc": styles.working,
  "Nghỉ phép": styles.leave,
  "Chờ xác minh": styles.review,
};

const documentClass: Record<DocumentState, string> = {
  "Hợp lệ": styles.documentValid,
  "Sắp hết hạn": styles.documentExpiring,
  "Cần bổ sung": styles.documentMissing,
};

export default function DriversDashboard() {
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("Tất cả");
  const [shift, setShift] = useState("Tất cả");
  const [selectedId, setSelectedId] = useState(drivers[0].id);

  const filteredDrivers = useMemo(
    () => filterDrivers(drivers, search, availability, shift),
    [availability, search, shift],
  );
  const selectedDriver = drivers.find((driver) => driver.id === selectedId) ?? drivers[0];

  function resetFilters() {
    setSearch("");
    setAvailability("Tất cả");
    setShift("Tất cả");
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="drivers-hero-title">
        <div><span>WORKFORCE DESK · 08:42</span><h2 id="drivers-hero-title">Đúng người, đủ điều kiện, khớp ca.</h2><p>Điều phối tài xế dựa trên ca làm, giờ công và hồ sơ tuân thủ trong một luồng thống nhất.</p></div>
        <div className={styles.complianceHero}><div className={styles.heroRing}><strong>{driverSummary.compliance}</strong><small>điểm</small></div><div><strong>Tuân thủ toàn đội</strong><small>2 hồ sơ cần xác minh</small></div></div>
      </section>

      <section className={styles.metrics} aria-label="Chỉ số tài xế">
        <article><span>TX</span><div><p>Tổng tài xế</p><strong>{driverSummary.total}</strong><small>100% hồ sơ nghiệp vụ</small></div></article>
        <article><span className={styles.green}>✓</span><div><p>Sẵn sàng nhận ca</p><strong>{driverSummary.ready}</strong><small>Có thể phân công ngay</small></div></article>
        <article><span className={styles.blue}>→</span><div><p>Đang làm việc</p><strong>{driverSummary.working}</strong><small>Trên chuyến hoặc lệnh hàng</small></div></article>
        <article><span className={styles.amber}>HS</span><div><p>Chờ xác minh</p><strong>{driverSummary.review}</strong><small>Không tự động phân công</small></div></article>
      </section>

      <section className={styles.shiftStrip} aria-labelledby="shift-title">
        <div className={styles.stripHeading}><div><span>Coverage hôm nay</span><h2 id="shift-title">Phủ ca vận hành</h2></div><p>Cập nhật 08:42</p></div>
        <div className={styles.shiftGrid}>
          {shiftSummary.map((item) => (
            <article key={item.shift}><span>{item.shift}</span><strong>{item.count} tài xế</strong><p>{item.ready} sẵn sàng · {item.count - item.ready} đã xếp trạng thái</p><div><i style={{ "--coverage": `${Math.max(28, item.count / driverSummary.total * 260)}%` } as CSSProperties} /></div></article>
          ))}
        </div>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.directory} aria-labelledby="driver-list-title">
          <div className={styles.sectionHeading}><div><span>Danh bạ vận hành</span><h2 id="driver-list-title">Tài xế & khả năng sẵn sàng</h2><p>Tìm kiếm theo mã nhân viên, công việc, xe hoặc bãi xe.</p></div><b role="status" aria-live="polite">{filteredDrivers.length} kết quả</b></div>
          <div className={styles.filters} role="search" aria-label="Tìm và lọc tài xế">
            <label className={styles.searchField} htmlFor="driver-search"><span aria-hidden="true">⌕</span><span className={styles.srOnly}>Tìm tài xế</span><input id="driver-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã, công việc, biển số xe..." /></label>
            <label><span className={styles.srOnly}>Khả năng sẵn sàng</span><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option>Tất cả</option>{availabilityOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span className={styles.srOnly}>Ca làm</span><select value={shift} onChange={(event) => setShift(event.target.value)}><option>Tất cả</option>{shiftOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <button type="button" onClick={resetFilters}>Đặt lại</button>
          </div>
          <div className={styles.driverList}>
            {filteredDrivers.map((driver) => (
              <button type="button" key={driver.id} data-selected={driver.id === selectedDriver.id} onClick={() => setSelectedId(driver.id)}>
                <span className={styles.avatar} aria-hidden="true">{driver.id.slice(-2)}</span>
                <span className={styles.driverIdentity}><strong>{driver.name}</strong><code>{driver.id}</code></span>
                <span><strong>{driver.shift}</strong><small>{driver.shiftWindow}</small></span>
                <span><strong>{driver.assignment}</strong><small>{driver.vehicle}</small></span>
                <span className={`${styles.availability} ${availabilityClass[driver.availability]}`}><i aria-hidden="true" />{driver.availability}</span>
                <span className={styles.score}><strong>{driver.compliance}</strong><small>tuân thủ</small></span>
              </button>
            ))}
          </div>
          {filteredDrivers.length === 0 ? <div className={styles.empty} role="status"><strong>Không có tài xế phù hợp</strong><p>Thử đổi điều kiện tìm kiếm.</p><button type="button" onClick={resetFilters}>Xóa bộ lọc</button></div> : null}
        </section>

        <aside className={styles.profile} aria-labelledby="driver-profile-title" aria-live="polite">
          <div className={styles.profileHeader}><span className={styles.largeAvatar} aria-hidden="true">TX</span><span className={`${styles.availability} ${availabilityClass[selectedDriver.availability]}`}><i aria-hidden="true" />{selectedDriver.availability}</span></div>
          <p>Hồ sơ nhân sự</p><h2 id="driver-profile-title">{selectedDriver.name}</h2><code>{selectedDriver.id}</code>
          <div className={styles.profileStats}>
            <div><span>Điểm tuân thủ</span><strong>{selectedDriver.compliance}/100</strong></div>
            <div><span>Giờ tuần này</span><strong>{selectedDriver.hoursThisWeek}h / 48h</strong></div>
          </div>
          <dl>
            <div><dt>Ca làm</dt><dd>{selectedDriver.shift}<small>{selectedDriver.shiftWindow}</small></dd></div>
            <div><dt>Phân công</dt><dd>{selectedDriver.assignment}<small>{selectedDriver.vehicle}</small></dd></div>
            <div><dt>Điểm trực</dt><dd>{selectedDriver.homeBase}</dd></div>
            <div><dt>Hạng bằng</dt><dd>{selectedDriver.licenseClass}<small>Hạn {selectedDriver.licenseExpiry}</small></dd></div>
          </dl>

          <section className={styles.documents} aria-labelledby="documents-title">
            <div><h3 id="documents-title">Giấy tờ & chứng nhận</h3><span>3 mục</span></div>
            {selectedDriver.documents.map((document) => <article key={document.label}><span className={documentClass[document.state]} aria-hidden="true">{document.state === "Hợp lệ" ? "✓" : "!"}</span><div><strong>{document.label}</strong><small>{document.note}</small></div><em>{document.state}</em></article>)}
          </section>

          <section className={styles.schedule} aria-labelledby="schedule-title">
            <h3 id="schedule-title">Lịch ca hôm nay</h3>
            <ol>{selectedDriver.schedule.map((item) => <li key={`${item.time}-${item.task}`}><time>{item.time}</time><span><strong>{item.task}</strong><small>{item.note}</small></span></li>)}</ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
