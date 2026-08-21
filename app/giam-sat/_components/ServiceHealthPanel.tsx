import {
  SERVICES,
  scoreStyle,
  serviceGlyph,
  type Service,
  type ServiceState,
} from "../_lib/monitoring";
import styles from "../page.module.css";
import { PanelHeading } from "./PanelHeading";

const SERVICE_STATE_CLASS: Record<ServiceState, string> = {
  "Ổn định": styles.stateGood,
  "Theo dõi": styles.stateWarn,
  "Bảo trì": styles.stateMaintenance,
};

function ServiceRow({ service }: { service: Service }) {
  return (
    <article className={styles.serviceRow}>
      <div className={styles.serviceIdentity}>
        <span className={styles.serviceGlyph} aria-hidden="true">
          {serviceGlyph(service.kind)}
        </span>
        <div>
          <strong>{service.name}</strong>
          <span>{service.kind} · Mock</span>
        </div>
      </div>
      <span
        className={`${styles.serviceState} ${SERVICE_STATE_CLASS[service.state]}`}
      >
        <i />
        {service.state}
      </span>
      <div className={styles.serviceNumbers}>
        <span>
          <small>Uptime</small>
          <strong>{service.uptime}</strong>
        </span>
        <span>
          <small>Độ trễ</small>
          <strong>{service.latency}</strong>
        </span>
      </div>
      <div className={styles.scoreTrack}>
        <span style={scoreStyle(service.score)} />
      </div>
    </article>
  );
}

export function ServiceHealthPanel() {
  return (
    <section className={styles.panel} aria-labelledby="service-title">
      <PanelHeading
        kicker="6 / 6 có tín hiệu"
        title="Sức khỏe dịch vụ"
        titleId="service-title"
        description="Cập nhật mẫu 08:42:18"
        accessory={
          <span className={styles.overallState}>
            <i /> Có chú ý
          </span>
        }
      />
      <div className={styles.serviceList}>
        {SERVICES.map((service) => (
          <ServiceRow key={service.name} service={service} />
        ))}
      </div>
      <a className={styles.panelLink} href="#luong-phu-thuoc">
        Xem luồng phụ thuộc <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}
