import type { CSSProperties } from "react";

export type RangeKey = "24h" | "7d" | "30d";
export type ServiceState = "Ổn định" | "Theo dõi" | "Bảo trì";
export type AlertLevel = "Cao" | "Trung bình" | "Thông tin";
export type AvailabilityState = "healthy" | "warning" | "maintenance";
export type SignalTone = "green" | "blue" | "amber";
export type EmphasisTone = "good" | "warning";

export type TrendStats = {
  mean: number;
  peak: number;
};

export type Service = {
  name: string;
  kind: string;
  state: ServiceState;
  uptime: string;
  latency: string;
  score: number;
};

export type Alert = {
  code: string;
  level: AlertLevel;
  title: string;
  detail: string;
  time: string;
};

export type MetricDefinition = {
  label: string;
  value: string;
  suffix?: string;
  change: string;
  note: string;
  signal: SignalTone;
  emphasis: EmphasisTone;
};

export type FlowNodeItem = {
  type: "node";
  key: string;
  glyph: string;
  title: string;
  detail: string;
  warning?: boolean;
};

export type FlowConnectorItem = {
  type: "connector";
  key: string;
  latency: string;
  warning?: boolean;
};

type FlowItem = FlowNodeItem | FlowConnectorItem;

export const RANGE_KEYS = [
  "24h",
  "7d",
  "30d",
] as const satisfies readonly RangeKey[];

export const RANGE_LABELS: Record<RangeKey, string> = {
  "24h": "24 giờ",
  "7d": "7 ngày",
  "30d": "30 ngày",
};

export const X_AXIS_LABELS: Record<
  RangeKey,
  readonly [string, string, string, string, string]
> = {
  "24h": ["00:00", "06:00", "12:00", "18:00", "Hiện tại"],
  "7d": ["15/08", "17/08", "19/08", "21/08", "Hiện tại"],
  "30d": ["23/07", "30/07", "06/08", "13/08", "Hiện tại"],
};

export const LATENCY_SERIES: Record<RangeKey, readonly number[]> = {
  "24h": [
    26, 29, 24, 31, 28, 34, 32, 38, 42, 35, 44, 39, 47, 53, 46, 58, 49,
    56, 61, 52, 48, 44, 57, 64, 71, 59, 51, 47, 43, 39, 45, 49, 42, 37,
    35, 33,
  ],
  "7d": [
    35, 37, 34, 42, 46, 39, 41, 48, 52, 45, 50, 54, 61, 49, 46, 43, 47,
    55, 58, 52, 48, 57, 66, 73, 62, 56, 51, 47, 44, 49, 53, 46, 42, 39,
    37, 40,
  ],
  "30d": [
    39, 42, 45, 41, 48, 52, 46, 55, 59, 51, 57, 63, 69, 61, 58, 52, 49,
    54, 62, 67, 59, 56, 64, 77, 69, 61, 58, 54, 51, 56, 61, 53, 49, 46,
    43, 45,
  ],
};

export const SERVICES = [
  {
    name: "Cổng nghiệp vụ mẫu",
    kind: "Ứng dụng",
    state: "Ổn định",
    uptime: "99,99%",
    latency: "82 ms",
    score: 99,
  },
  {
    name: "Kênh điều hành demo",
    kind: "Dịch vụ",
    state: "Ổn định",
    uptime: "99,96%",
    latency: "94 ms",
    score: 97,
  },
  {
    name: "Mạng nội bộ mô phỏng",
    kind: "Kết nối",
    state: "Ổn định",
    uptime: "99,98%",
    latency: "31 ms",
    score: 99,
  },
  {
    name: "Đồng bộ dữ liệu thử nghiệm",
    kind: "Tác vụ",
    state: "Theo dõi",
    uptime: "98,74%",
    latency: "286 ms",
    score: 76,
  },
  {
    name: "Kho lưu trữ mẫu",
    kind: "Dữ liệu",
    state: "Bảo trì",
    uptime: "99,42%",
    latency: "118 ms",
    score: 88,
  },
  {
    name: "Sao lưu định kỳ demo",
    kind: "Tác vụ",
    state: "Ổn định",
    uptime: "100%",
    latency: "—",
    score: 100,
  },
] as const satisfies readonly Service[];

export const ALERTS = [
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
] as const satisfies readonly Alert[];

export const AVAILABILITY_CELLS: readonly AvailabilityState[] = Array.from(
  { length: 72 },
  (_, index) =>
    index === 46 || index === 47
      ? "warning"
      : index === 18
        ? "maintenance"
        : "healthy",
);

export const FLOW_ITEMS = [
  {
    type: "node",
    key: "user",
    glyph: "ND",
    title: "Người dùng demo",
    detail: "Nguồn truy cập mẫu",
  },
  { type: "connector", key: "user-gateway", latency: "31 ms" },
  {
    type: "node",
    key: "gateway",
    glyph: "CG",
    title: "Cổng nghiệp vụ",
    detail: "99,99% sẵn sàng",
  },
  { type: "connector", key: "gateway-service", latency: "82 ms" },
  {
    type: "node",
    key: "service",
    glyph: "DV",
    title: "Dịch vụ xử lý",
    detail: "12 tác vụ / phút",
  },
  {
    type: "connector",
    key: "service-database",
    latency: "286 ms",
    warning: true,
  },
  {
    type: "node",
    key: "database",
    glyph: "DL",
    title: "Kho dữ liệu mẫu",
    detail: "Đang theo dõi",
    warning: true,
  },
] as const satisfies readonly FlowItem[];

export function calculateTrendStats(trend: readonly number[]): TrendStats {
  if (trend.length === 0) return { mean: 0, peak: 0 };

  const total = trend.reduce((sum, value) => sum + value, 0);
  return {
    mean: Math.round((total / trend.length) * 2.1),
    peak: Math.round(Math.max(...trend) * 3.2),
  };
}

export function buildMetricDefinitions(
  stats: TrendStats,
): readonly MetricDefinition[] {
  return [
    {
      label: "Độ sẵn sàng",
      value: "99,94%",
      change: "↑ 0,08%",
      note: "so với kỳ trước",
      signal: "green",
      emphasis: "good",
    },
    {
      label: "Phản hồi trung bình",
      value: String(stats.mean),
      suffix: "ms",
      change: "↓ 12 ms",
      note: "trong ngưỡng mẫu",
      signal: "blue",
      emphasis: "good",
    },
    {
      label: "Dịch vụ theo dõi",
      value: "12",
      suffix: "/ 12",
      change: "Đủ tín hiệu",
      note: "6 hiển thị bên dưới",
      signal: "green",
      emphasis: "good",
    },
    {
      label: "Cảnh báo đang mở",
      value: "03",
      change: "1 ưu tiên cao",
      note: "SLA mẫu còn 24 phút",
      signal: "amber",
      emphasis: "warning",
    },
  ];
}

export function serviceGlyph(kind: string): string {
  return kind.slice(0, 2).toLocaleUpperCase("vi");
}

export function barStyle(value: number, index: number): CSSProperties {
  return {
    "--bar-height": `${value}%`,
    "--delay": `${index * 12}ms`,
  } as CSSProperties;
}

export function scoreStyle(score: number): CSSProperties {
  return { "--score": `${score}%` } as CSSProperties;
}
