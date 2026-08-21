import { deliverables } from "../_lib/plan";
import styles from "../Roadmap.module.css";
import SectionHeading from "./SectionHeading";

export default function DeliverablesSection() {
  return (
    <section className={styles.deliverables} aria-labelledby="deliverables-title">
      <SectionHeading eyebrow="Bộ bàn giao" title="Deliverables theo chuẩn doanh nghiệp" titleId="deliverables-title" note="Owner và bằng chứng rõ ràng" />
      <div>
        {deliverables.map(([name, text], index) => (
          <article key={name}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{name}</strong>
            <p>{text}</p>
            <i>Ready gate</i>
          </article>
        ))}
      </div>
    </section>
  );
}
