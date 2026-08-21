import { qualityGates } from "../_lib/plan";
import styles from "../Roadmap.module.css";
import SectionHeading from "./SectionHeading";

export default function QualityGatesSection() {
  return (
    <section className={styles.gates} aria-labelledby="gates-title">
      <SectionHeading eyebrow="Quality gates" title="Definition of Done" titleId="gates-title" note="Mọi release" />
      <ul>
        {qualityGates.map((gate, index) => (
          <li key={gate.title}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div><strong>{gate.title}</strong><p>{gate.description}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
