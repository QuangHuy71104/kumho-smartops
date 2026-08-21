import {
  AVAILABILITY_CELLS,
  RANGE_KEYS,
  RANGE_LABELS,
  X_AXIS_LABELS,
  barStyle,
  type AvailabilityState,
  type RangeKey,
  type TrendStats,
} from "../_lib/monitoring";
import styles from "../page.module.css";
import { PanelHeading } from "./PanelHeading";

const AVAILABILITY_CLASS: Record<AvailabilityState, string> = {
  healthy: styles.cellGood,
  warning: styles.cellWarn,
  maintenance: styles.cellMaintenance,
};

type RangeTabsProps = {
  range: RangeKey;
  onChange: (range: RangeKey) => void;
};

function RangeTabs({ range, onChange }: RangeTabsProps) {
  return (
    <div className={styles.rangeTabs} aria-label="Khoảng thời gian">
      {RANGE_KEYS.map((key) => (
        <button
          className={range === key ? styles.rangeActive : undefined}
          key={key}
          type="button"
          aria-pressed={range === key}
          onClick={() => onChange(key)}
        >
          {RANGE_LABELS[key]}
        </button>
      ))}
    </div>
  );
}

function ChartSummary({ stats }: { stats: TrendStats }) {
  const items = [
    ["Trung bình", `${stats.mean} ms`],
    ["Cao nhất", `${stats.peak} ms`],
    ["Ngưỡng cảnh báo", "250 ms"],
  ] as const;

  return (
    <div className={styles.chartSummary}>
      {items.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

type LatencyChartProps = {
  range: RangeKey;
  trend: readonly number[];
};

function LatencyChart({ range, trend }: LatencyChartProps) {
  return (
    <>
      <div
        className={styles.chartArea}
        aria-label={`Biểu đồ độ trễ mô phỏng trong ${RANGE_LABELS[range]}`}
        role="img"
      >
        <div className={styles.yLabels} aria-hidden="true">
          <span>300</span>
          <span>200</span>
          <span>100</span>
          <span>0 ms</span>
        </div>
        <div className={styles.barField}>
          <span className={styles.thresholdLine}>
            <i>Ngưỡng</i>
          </span>
          <div className={styles.bars}>
            {trend.map((value, index) => (
              <span
                className={value >= 70 ? styles.barHot : styles.bar}
                key={`${range}-${index}`}
                style={barStyle(value, index)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className={styles.xAxis} aria-hidden="true">
        {X_AXIS_LABELS[range].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </>
  );
}

function AvailabilityStrip() {
  return (
    <div className={styles.availability}>
      <div>
        <strong>Độ sẵn sàng dịch vụ</strong>
        <span>72 điểm kiểm tra mẫu</span>
      </div>
      <div
        className={styles.availabilityTrack}
        aria-label="69 điểm ổn định, 2 điểm cảnh báo, 1 điểm bảo trì"
      >
        {AVAILABILITY_CELLS.map((cell, index) => (
          <i className={AVAILABILITY_CLASS[cell]} key={index} />
        ))}
      </div>
    </div>
  );
}

type LatencyPanelProps = {
  range: RangeKey;
  trend: readonly number[];
  stats: TrendStats;
  onRangeChange: (range: RangeKey) => void;
};

export function LatencyPanel({
  range,
  trend,
  stats,
  onRangeChange,
}: LatencyPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="latency-title">
      <PanelHeading
        kicker="Hiệu năng tổng hợp"
        title="Xu hướng độ trễ"
        titleId="latency-title"
        description="Giá trị minh họa từ các dịch vụ thử nghiệm."
        accessory={<RangeTabs range={range} onChange={onRangeChange} />}
      />
      <ChartSummary stats={stats} />
      <LatencyChart range={range} trend={trend} />
      <AvailabilityStrip />
    </section>
  );
}
