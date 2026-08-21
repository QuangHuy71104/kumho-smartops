import { risks } from "../_lib/plan";
import styles from "../Roadmap.module.css";
import SectionHeading from "./SectionHeading";

export default function RisksSection() {
  return (
    <section className={styles.risks} aria-labelledby="risks-title">
      <SectionHeading eyebrow="Risk register" title="Rủi ro và kiểm soát" titleId="risks-title" note="Review hàng tuần" />
      <div className={styles.riskTable} role="table" aria-label="Danh sách rủi ro">
        <div role="row" className={styles.riskHeader}>
          <span role="columnheader">Rủi ro</span>
          <span role="columnheader">Mức độ</span>
          <span role="columnheader">Kiểm soát chính</span>
        </div>
        {risks.map((item) => (
          <div role="row" key={item.risk}>
            <strong role="cell">{item.risk}</strong>
            <span role="cell" data-impact={item.impact}>{item.impact}</span>
            <p role="cell">{item.control}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
