import { architecture } from "../_lib/plan";
import styles from "../Roadmap.module.css";
import SectionHeading from "./SectionHeading";

export default function ArchitectureSection() {
  return (
    <section className={styles.architecture} aria-labelledby="architecture-title">
      <SectionHeading eyebrow="Target state" title="Kiến trúc production đề xuất" titleId="architecture-title" note="API-first · Zero trust · Observable" />
      <div className={styles.archStack}>
        {architecture.map((layer, index) => (
          <article key={layer.code}>
            <span>{layer.code}</span>
            <div><strong>{layer.title}</strong><p>{layer.text}</p></div>
            <i aria-hidden="true">{index < architecture.length - 1 ? "↓" : "✓"}</i>
          </article>
        ))}
      </div>
    </section>
  );
}
