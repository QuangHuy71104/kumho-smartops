"use client";

import { useMemo, useState } from "react";
import { AlertsPanel } from "./_components/AlertsPanel";
import { DependencyFlowPanel } from "./_components/DependencyFlowPanel";
import { LatencyPanel } from "./_components/LatencyPanel";
import { Metrics } from "./_components/Metrics";
import { ServiceHealthPanel } from "./_components/ServiceHealthPanel";
import { TelemetryHero } from "./_components/TelemetryHero";
import {
  LATENCY_SERIES,
  calculateTrendStats,
  type RangeKey,
} from "./_lib/monitoring";
import styles from "./page.module.css";

export default function MonitoringDashboard() {
  const [range, setRange] = useState<RangeKey>("24h");
  const [isLive, setIsLive] = useState(true);

  const trend = LATENCY_SERIES[range];
  const trendStats = useMemo(() => calculateTrendStats(trend), [trend]);

  return (
    <div className={styles.page}>
      <TelemetryHero
        isLive={isLive}
        onToggle={() => setIsLive((current) => !current)}
      />
      <Metrics stats={trendStats} />

      <div className={styles.primaryGrid}>
        <LatencyPanel
          range={range}
          trend={trend}
          stats={trendStats}
          onRangeChange={setRange}
        />
        <ServiceHealthPanel />
      </div>

      <div className={styles.secondaryGrid}>
        <AlertsPanel />
        <DependencyFlowPanel />
      </div>
    </div>
  );
}
