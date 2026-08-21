"use client";

import { useMemo, useState } from "react";
import {
  buildReportCsv,
  routePerformance,
  servicePerformance,
  snapshots,
  type ReportPeriod,
} from "./_lib/reports";
import styles from "./Reports.module.css";

const periods = ["7 ngày", "30 ngày", "Quý 3"] satisfies ReportPeriod[];

export default function ReportsDashboard() {
  const [period, setPeriod] = useState<ReportPeriod>("30 ngày");
  const [message, setMessage] = useState("");
  const snapshot = snapshots[period];
  const maxTrend = useMemo(() => Math.max(...snapshot.trend), [snapshot.trend]);

  function exportCsv() {
    const blob = new Blob([buildReportCsv(period)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ksops-bao-cao-${period.replaceAll(" ", "-").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Đã xuất báo cáo ${period} từ dữ liệu mô phỏng.`);
  }

  return (
    <div className={styles.reports}>
      <section className={styles.hero} aria-labelledby="report-title">
        <div>
          <span className={styles.kicker}>Báo cáo điều hành</span>
          <h2 id="report-title">Từ từng chuyến xe đến quyết định vận hành.</h2>
          <p>Đối chiếu doanh thu, hiệu suất đội xe, đúng giờ và trải nghiệm khách hàng trên cùng bộ chỉ số.</p>
        </div>
        <button type="button" onClick={exportCsv}>Xuất CSV</button>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.periodTabs} aria-label="Chọn kỳ báo cáo">
          {periods.map((item) => <button type="button" key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>)}
        </div>
        <span>Chốt dữ liệu demo lúc 17:30 · 21/08/2026</span>
      </div>
      <p className={styles.liveMessage} aria-live="polite">{message}</p>

      <section className={styles.metricGrid} aria-label={`Chỉ số kỳ ${period}`}>
        <article><span>Doanh thu ghi nhận</span><strong>{snapshot.revenue}</strong><small>{snapshot.revenueDelta} so với kỳ trước</small></article>
        <article><span>Hiệu suất sử dụng xe</span><strong>{snapshot.utilization}</strong><small>{snapshot.utilizationDelta} so với kỳ trước</small></article>
        <article><span>Chuyến đúng giờ</span><strong>{snapshot.onTime}</strong><small>{snapshot.onTimeDelta} so với kỳ trước</small></article>
        <article><span>Hài lòng khách hàng</span><strong>{snapshot.satisfaction}</strong><small>{snapshot.satisfactionDelta} so với kỳ trước</small></article>
      </section>

      <div className={styles.reportGrid}>
        <section className={styles.panel} aria-labelledby="trend-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>Xu hướng {period}</span><h2 id="trend-title">Chỉ số doanh thu tương đối</h2></div><strong>{snapshot.revenue}</strong></div>
          <div className={styles.trendChart} role="img" aria-label={`Biểu đồ xu hướng doanh thu tương đối trong ${period}`}>
            {snapshot.trend.map((value, index) => <span key={`${period}-${index}`} style={{ height: `${Math.round((value / maxTrend) * 100)}%` }}><i>{value}</i></span>)}
          </div>
          <div className={styles.axis}><span>Đầu kỳ</span><span>Giữa kỳ</span><span>Cuối kỳ</span></div>
        </section>

        <section className={styles.panel} aria-labelledby="service-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>Cơ cấu doanh thu</span><h2 id="service-title">Theo nhóm dịch vụ</h2></div></div>
          <div className={styles.serviceList}>
            {servicePerformance.map((item) => (
              <article key={item.service}>
                <div><strong>{item.service}</strong><span>{item.orders} · đúng giờ {item.onTime}</span></div>
                <b>{item.revenue}</b>
                <div className={styles.progress}><span style={{ width: `${item.contribution}%` }} /></div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="route-title">
        <div className={styles.panelHeading}><div><span className={styles.kicker}>Hiệu quả mạng lưới</span><h2 id="route-title">Tuyến và khu vực ưu tiên</h2></div><span className={styles.modelNote}>Mô hình demo, không phải lịch chạy thực tế</span></div>
        <div className={styles.routeGrid}>
          {routePerformance.map((route) => (
            <article key={route.route}>
              <div className={styles.routeScore} style={{ background: `conic-gradient(var(--brand) ${route.load}%, #edf0f3 0)` }}><span>{route.load}%</span></div>
              <div><strong>{route.route}</strong><span>{route.note}</span><small data-score={route.score}>{route.score}</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.insight} aria-label="Khuyến nghị vận hành mô phỏng">
        <span aria-hidden="true">01</span>
        <div><strong>Khuyến nghị cho ca kế tiếp</strong><p>Tăng một xe hàng chiều về từ Đồng Nai và giữ hai xe 29 chỗ ở trạng thái dự phòng cho hợp đồng phát sinh.</p></div>
      </section>
    </div>
  );
}
