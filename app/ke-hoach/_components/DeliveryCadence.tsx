import { deliveryCadence } from "../_lib/plan";
import styles from "../Roadmap.module.css";

export default function DeliveryCadence() {
  return (
    <section className={styles.cadence} aria-label="Nhịp điều hành dự án">
      {deliveryCadence.map((item) => (
        <div key={item.schedule}>
          <span>{item.schedule}</span>
          <strong>{item.title}</strong>
          <p>{item.description}</p>
        </div>
      ))}
    </section>
  );
}
