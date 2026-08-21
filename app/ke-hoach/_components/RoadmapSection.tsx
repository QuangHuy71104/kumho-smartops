import { roadmapPhases } from "../_lib/plan";
import styles from "../Roadmap.module.css";
import SectionHeading from "./SectionHeading";

export default function RoadmapSection() {
  return (
    <section className={styles.roadmap} id="roadmap" aria-labelledby="roadmap-title">
      <SectionHeading eyebrow="Workstream theo tuần" title="Roadmap triển khai" titleId="roadmap-title" note="Stage-gate ở cuối mỗi giai đoạn" />
      <div className={styles.phaseList}>
        {roadmapPhases.map((phase, index) => (
          <article key={phase.weeks} data-status={phase.status}>
            <span className={styles.phaseIndex}>{String(index + 1).padStart(2, "0")}</span>
            <div><span>{phase.weeks}</span><h3>{phase.name}</h3><p>{phase.outcome}</p></div>
            <i>{phase.status}</i>
          </article>
        ))}
      </div>
    </section>
  );
}
