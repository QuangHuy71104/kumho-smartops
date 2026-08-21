import {
  buildMetricDefinitions,
  type EmphasisTone,
  type MetricDefinition,
  type SignalTone,
  type TrendStats,
} from "../_lib/monitoring";
import styles from "../page.module.css";

const SIGNAL_CLASS: Record<SignalTone, string> = {
  green: styles.greenSignal,
  blue: styles.blueSignal,
  amber: styles.amberSignal,
};

const EMPHASIS_CLASS: Record<EmphasisTone, string> = {
  good: styles.goodText,
  warning: styles.warnText,
};

function MetricCard({ metric }: { metric: MetricDefinition }) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricTop}>
        <span>{metric.label}</span>
        <i className={SIGNAL_CLASS[metric.signal]} aria-hidden="true" />
      </div>
      <strong>
        {metric.value}
        {metric.suffix ? (
          <>
            {" "}
            <em>{metric.suffix}</em>
          </>
        ) : null}
      </strong>
      <div className={styles.metricBottom}>
        <span className={EMPHASIS_CLASS[metric.emphasis]}>{metric.change}</span>
        <small>{metric.note}</small>
      </div>
    </article>
  );
}

export function Metrics({ stats }: { stats: TrendStats }) {
  return (
    <section className={styles.metrics} aria-label="Chỉ số giám sát chính">
      {buildMetricDefinitions(stats).map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </section>
  );
}
