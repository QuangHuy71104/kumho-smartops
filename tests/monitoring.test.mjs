import assert from "node:assert/strict";
import test from "node:test";
import {
  AVAILABILITY_CELLS,
  LATENCY_SERIES,
  RANGE_KEYS,
  SERVICES,
  barStyle,
  buildMetricDefinitions,
  calculateTrendStats,
  scoreStyle,
  serviceGlyph,
} from "../app/giam-sat/_lib/monitoring.ts";

test("all monitoring ranges contain deterministic, non-empty telemetry", () => {
  assert.deepEqual(RANGE_KEYS, ["24h", "7d", "30d"]);
  RANGE_KEYS.forEach((range) => {
    assert.ok(LATENCY_SERIES[range].length > 20);
    assert.ok(LATENCY_SERIES[range].every((sample) => sample > 0));
  });
});

test("trend statistics handle empty and populated samples", () => {
  assert.deepEqual(calculateTrendStats([]), { mean: 0, peak: 0 });
  assert.deepEqual(calculateTrendStats([10, 20, 30]), { mean: 42, peak: 96 });
});

test("monitoring metrics derive latency from calculated statistics", () => {
  const stats = calculateTrendStats(LATENCY_SERIES["24h"]);
  const metrics = buildMetricDefinitions(stats);
  const latency = metrics.find((metric) => metric.label === "Phản hồi trung bình");

  assert.equal(metrics.length, 4);
  assert.equal(latency?.value, String(stats.mean));
  assert.equal(latency?.suffix, "ms");
});

test("service and availability fixtures cover operational edge states", () => {
  assert.ok(SERVICES.some((service) => service.state === "Theo dõi"));
  assert.ok(SERVICES.some((service) => service.state === "Bảo trì"));
  assert.ok(AVAILABILITY_CELLS.includes("warning"));
  assert.ok(AVAILABILITY_CELLS.includes("maintenance"));
});

test("monitoring style helpers expose bounded custom properties", () => {
  assert.equal(serviceGlyph("Ứng dụng"), "ỨN");
  assert.deepEqual(barStyle(72, 3), { "--bar-height": "72%", "--delay": "36ms" });
  assert.deepEqual(scoreStyle(99), { "--score": "99%" });
});
