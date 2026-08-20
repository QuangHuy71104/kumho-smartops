"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type RangeKey = "24h" | "7d" | "30d";
type ServiceState = "Ổn định" | "Theo dõi" | "Bảo trì";

const rangeLabels: Record<RangeKey, string> = {
  "24h": "24 giờ",
  "7d": "7 ngày",
  "30d": "30 ngày",
};

const latencySeries: Record<RangeKey, number[]> = {
  "24h": [26, 29, 24, 31, 28, 34, 32, 38, 42, 35, 44, 39, 47, 53, 46, 58, 49, 56, 61, 52, 48, 44, 57, 64, 71, 59, 51, 47, 43, 39, 45, 49, 42, 37, 35, 33],
  "7d": [35, 37, 34, 42, 46, 39, 41, 48, 52, 45, 50, 54, 61, 49, 46, 43, 47, 55, 58, 52, 48, 57, 66, 73, 62, 56, 51, 47, 44, 49, 53, 46, 42, 39, 37, 40],
  "30d": [39, 42, 45, 41, 48, 52, 46, 55, 59, 51, 57, 63, 69, 61, 58, 52, 49, 54, 62, 67, 59, 56, 64, 77, 69, 61, 58, 54, 51, 56, 61, 53, 49, 46, 43, 45],
};

const services: Array<{
  name: string;
  kind: string;
  state: ServiceState;
  uptime: string;
  latency: string;
  score: number;
}> = [
  { name: "Cổng nghiệp vụ mẫu", kind: "Ứng dụng", state: "Ổn định", uptime: "99,99%", latency: "82 ms", score: 99 },
  { name: "Kênh điều hành demo", kind: "Dịch vụ", state: "Ổn định", uptime: "99,96%", latency: "94 ms", score: 97 },
  { name: "Mạng nội bộ mô phỏng", kind: "Kết nối", state: "Ổn định", uptime: "99,98%", latency: "31 ms", score: 99 },
  { name: "Đồng bộ dữ liệu thử nghiệm", kind: "Tác vụ", state: "Theo dõi", uptime: "98,74%", latency: "286 ms", score: 76 },
  { name: "Kho lưu trữ mẫu", kind: "Dữ liệu", state: "Bảo trì", uptime: "99,42%", latency: "118 ms", score: 88 },
  { name: "Sao lưu định kỳ demo", kind: "Tác vụ", state: "Ổn định", uptime: "100%", latency: "—", score: 100 },
];

const alerts = [
  {
    code: "ALR-DEMO-031",
    level: "Cao",
    title: "Độ trễ đồng bộ vượt ngưỡng mô phỏng",
    detail: "Tín hiệu mẫu kéo dài 6 phút · Đang phân tích",
    time: "08:36",
  },
  {
    code: "ALR-DEMO-029",
    level: "Trung bình",
    title: "Tác vụ sao lưu demo kéo dài hơn đường cơ sở",
    detail: "Chênh lệch +18% · Đã giao Nhóm Hạ tầng",
    time: "08:12",
  },
  {
    code: "ALR-DEMO-026",
    level: "Thông tin",
    title: "Cửa sổ bảo trì kho lưu trữ mẫu đã bắt đầu",
    detail: "Theo kế hoạch · Dự kiến hoàn tất lúc 10:00",
    time: "07:45",
  },
] as const;

const availabilityCells = Array.from({ length: 72 }, (_, index) =>
  index === 46 || index === 47 ? "warning" : index === 18 ? "maintenance" : "healthy",
);

const stateClass: Record<ServiceState, string> = {
  "Ổn định": styles.stateGood,
  "Theo dõi": styles.stateWarn,
  "Bảo trì": styles.stateMaintenance,
};

export default function MonitoringDashboard() {
  const [range, setRange] = useState<RangeKey>("24h");
  const [isLive, setIsLive] = useState(true);

  const trend = latencySeries[range];
  const trendStats = useMemo(() => {
    const mean = Math.round(trend.reduce((sum, value) => sum + value, 0) / trend.length * 2.1);
    const peak = Math.round(Math.max(...trend) * 3.2);
    return { mean, peak };
  }, [trend]);

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="monitor-title">
        <div>
          <div className={styles.telemetryLabel}>
            <span aria-hidden="true" /> Telemetry mô phỏng
          </div>
          <h2 id="monitor-title">Mọi tín hiệu, một nhịp vận hành.</h2>
          <p>Theo dõi sức khỏe dịch vụ, luồng phụ thuộc và cảnh báo thử nghiệm mà không chạm vào hạ tầng thật.</p>
        </div>
        <div className={styles.liveControl}>
          <div className={styles.liveCopy} aria-live="polite">
            <span className={isLive ? styles.liveDot : styles.pausedDot} aria-hidden="true" />
            <div><strong>{isLive ? "Đang phát tín hiệu mẫu" : "Đã tạm dừng mô phỏng"}</strong><small>Lần nhận cuối: 08:42:18</small></div>
          </div>
          <button type="button" onClick={() => setIsLive((current) => !current)} aria-pressed={!isLive}>
            <span aria-hidden="true">{isLive ? "Ⅱ" : "▶"}</span>
            {isLive ? "Tạm dừng" : "Tiếp tục"}
          </button>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Chỉ số giám sát chính">
        <article className={styles.metricCard}>
          <div className={styles.metricTop}><span>Độ sẵn sàng</span><i className={styles.greenSignal} aria-hidden="true" /></div>
          <strong>99,94%</strong>
          <div className={styles.metricBottom}><span className={styles.goodText}>↑ 0,08%</span><small>so với kỳ trước</small></div>
        </article>
        <article className={styles.metricCard}>
          <div className={styles.metricTop}><span>Phản hồi trung bình</span><i className={styles.blueSignal} aria-hidden="true" /></div>
          <strong>{trendStats.mean} <em>ms</em></strong>
          <div className={styles.metricBottom}><span className={styles.goodText}>↓ 12 ms</span><small>trong ngưỡng mẫu</small></div>
        </article>
        <article className={styles.metricCard}>
          <div className={styles.metricTop}><span>Dịch vụ theo dõi</span><i className={styles.greenSignal} aria-hidden="true" /></div>
          <strong>12 <em>/ 12</em></strong>
          <div className={styles.metricBottom}><span className={styles.goodText}>Đủ tín hiệu</span><small>6 hiển thị bên dưới</small></div>
        </article>
        <article className={styles.metricCard}>
          <div className={styles.metricTop}><span>Cảnh báo đang mở</span><i className={styles.amberSignal} aria-hidden="true" /></div>
          <strong>03</strong>
          <div className={styles.metricBottom}><span className={styles.warnText}>1 ưu tiên cao</span><small>SLA mẫu còn 24 phút</small></div>
        </article>
      </section>

      <div className={styles.primaryGrid}>
        <section className={styles.panel} aria-labelledby="latency-title">
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.kicker}>Hiệu năng tổng hợp</span>
              <h2 id="latency-title">Xu hướng độ trễ</h2>
              <p>Giá trị minh họa từ các dịch vụ thử nghiệm.</p>
            </div>
            <div className={styles.rangeTabs} aria-label="Khoảng thời gian">
              {(Object.keys(rangeLabels) as RangeKey[]).map((key) => (
                <button
                  className={range === key ? styles.rangeActive : undefined}
                  key={key}
                  type="button"
                  aria-pressed={range === key}
                  onClick={() => setRange(key)}
                >
                  {rangeLabels[key]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.chartSummary}>
            <div><span>Trung bình</span><strong>{trendStats.mean} ms</strong></div>
            <div><span>Cao nhất</span><strong>{trendStats.peak} ms</strong></div>
            <div><span>Ngưỡng cảnh báo</span><strong>250 ms</strong></div>
          </div>

          <div className={styles.chartArea} aria-label={`Biểu đồ độ trễ mô phỏng trong ${rangeLabels[range]}`} role="img">
            <div className={styles.yLabels} aria-hidden="true"><span>300</span><span>200</span><span>100</span><span>0 ms</span></div>
            <div className={styles.barField}>
              <span className={styles.thresholdLine}><i>Ngưỡng</i></span>
              <div className={styles.bars}>
                {trend.map((value, index) => (
                  <span
                    className={value >= 70 ? styles.barHot : styles.bar}
                    key={`${range}-${index}`}
                    style={{ "--bar-height": `${value}%`, "--delay": `${index * 12}ms` } as CSSProperties}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className={styles.xAxis} aria-hidden="true">
            <span>{range === "24h" ? "00:00" : range === "7d" ? "15/08" : "23/07"}</span>
            <span>{range === "24h" ? "06:00" : range === "7d" ? "17/08" : "30/07"}</span>
            <span>{range === "24h" ? "12:00" : range === "7d" ? "19/08" : "06/08"}</span>
            <span>{range === "24h" ? "18:00" : range === "7d" ? "21/08" : "13/08"}</span>
            <span>Hiện tại</span>
          </div>

          <div className={styles.availability}>
            <div><strong>Độ sẵn sàng dịch vụ</strong><span>72 điểm kiểm tra mẫu</span></div>
            <div className={styles.availabilityTrack} aria-label="69 điểm ổn định, 2 điểm cảnh báo, 1 điểm bảo trì">
              {availabilityCells.map((cell, index) => (
                <i className={cell === "healthy" ? styles.cellGood : cell === "warning" ? styles.cellWarn : styles.cellMaintenance} key={index} />
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.servicePanel}`} aria-labelledby="service-title">
          <div className={styles.panelHeading}>
            <div><span className={styles.kicker}>6 / 6 có tín hiệu</span><h2 id="service-title">Sức khỏe dịch vụ</h2><p>Cập nhật mẫu 08:42:18</p></div>
            <span className={styles.overallState}><i /> Có chú ý</span>
          </div>
          <div className={styles.serviceList}>
            {services.map((service) => (
              <article className={styles.serviceRow} key={service.name}>
                <div className={styles.serviceIdentity}>
                  <span className={styles.serviceGlyph} aria-hidden="true">{service.kind.slice(0, 2).toLocaleUpperCase("vi")}</span>
                  <div><strong>{service.name}</strong><span>{service.kind} · Mock</span></div>
                </div>
                <span className={`${styles.serviceState} ${stateClass[service.state]}`}><i />{service.state}</span>
                <div className={styles.serviceNumbers}><span><small>Uptime</small><strong>{service.uptime}</strong></span><span><small>Độ trễ</small><strong>{service.latency}</strong></span></div>
                <div className={styles.scoreTrack}><span style={{ "--score": `${service.score}%` } as CSSProperties} /></div>
              </article>
            ))}
          </div>
          <a className={styles.panelLink} href="#luong-phu-thuoc">Xem luồng phụ thuộc <span aria-hidden="true">→</span></a>
        </section>
      </div>

      <div className={styles.secondaryGrid}>
        <section className={`${styles.panel} ${styles.alertPanel}`} aria-labelledby="alerts-title">
          <div className={styles.panelHeading}>
            <div><span className={styles.kicker}>Cần phản hồi</span><h2 id="alerts-title">Cảnh báo gần đây</h2><p>Luồng sự kiện tổng hợp từ môi trường mô phỏng.</p></div>
            <span className={styles.alertCount}>03 đang mở</span>
          </div>
          <div className={styles.alertList}>
            {alerts.map((alert) => (
              <article className={styles.alertRow} key={alert.code}>
                <div className={alert.level === "Cao" ? styles.alertHigh : alert.level === "Trung bình" ? styles.alertMedium : styles.alertInfo} aria-hidden="true">!</div>
                <div className={styles.alertCopy}><strong>{alert.title}</strong><span>{alert.code} · {alert.detail}</span></div>
                <span className={styles.alertLevel}>{alert.level}</span>
                <time dateTime={`2026-08-21T${alert.time}:00+07:00`}>{alert.time}</time>
              </article>
            ))}
          </div>
          <div className={styles.alertFooter}><span><i /> Tự động làm mới đang bật</span><Link href="/su-co">Mở trung tâm sự cố →</Link></div>
        </section>

        <section className={`${styles.panel} ${styles.flowPanel}`} id="luong-phu-thuoc" aria-labelledby="flow-title">
          <div className={styles.panelHeading}>
            <div><span className={styles.kicker}>Service map</span><h2 id="flow-title">Luồng phụ thuộc mẫu</h2><p>Minh họa logic, không phải sơ đồ hạ tầng thật.</p></div>
            <span className={styles.mapBadge}>DEMO MAP</span>
          </div>
          <div className={styles.flowMap} aria-label="Luồng từ người dùng demo qua cổng ứng dụng, dịch vụ xử lý đến kho dữ liệu mẫu">
            <div className={styles.flowNode}><span aria-hidden="true">ND</span><strong>Người dùng demo</strong><small>Nguồn truy cập mẫu</small></div>
            <span className={styles.connector}><i /><b>31 ms</b></span>
            <div className={styles.flowNode}><span aria-hidden="true">CG</span><strong>Cổng nghiệp vụ</strong><small>99,99% sẵn sàng</small></div>
            <span className={styles.connector}><i /><b>82 ms</b></span>
            <div className={styles.flowNode}><span aria-hidden="true">DV</span><strong>Dịch vụ xử lý</strong><small>12 tác vụ / phút</small></div>
            <span className={`${styles.connector} ${styles.connectorWarn}`}><i /><b>286 ms</b></span>
            <div className={`${styles.flowNode} ${styles.flowNodeWarn}`}><span aria-hidden="true">DL</span><strong>Kho dữ liệu mẫu</strong><small>Đang theo dõi</small></div>
          </div>
          <div className={styles.flowLegend}><span><i className={styles.legendGood} /> Ổn định</span><span><i className={styles.legendWarn} /> Vượt ngưỡng mẫu</span><span>Kiểm tra gần nhất: 08:42</span></div>
        </section>
      </div>
    </div>
  );
}
