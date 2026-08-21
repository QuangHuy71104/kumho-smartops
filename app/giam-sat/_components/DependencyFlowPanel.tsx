import {
  FLOW_ITEMS,
  type FlowConnectorItem,
  type FlowNodeItem,
} from "../_lib/monitoring";
import styles from "../page.module.css";
import { PanelHeading } from "./PanelHeading";

function FlowNode({ item }: { item: FlowNodeItem }) {
  return (
    <div
      className={`${styles.flowNode}${item.warning ? ` ${styles.flowNodeWarn}` : ""}`}
    >
      <span aria-hidden="true">{item.glyph}</span>
      <strong>{item.title}</strong>
      <small>{item.detail}</small>
    </div>
  );
}

function FlowConnector({ item }: { item: FlowConnectorItem }) {
  return (
    <span
      className={`${styles.connector}${item.warning ? ` ${styles.connectorWarn}` : ""}`}
    >
      <i />
      <b>{item.latency}</b>
    </span>
  );
}

export function DependencyFlowPanel() {
  return (
    <section
      className={styles.panel}
      id="luong-phu-thuoc"
      aria-labelledby="flow-title"
    >
      <PanelHeading
        kicker="Service map"
        title="Luồng phụ thuộc mẫu"
        titleId="flow-title"
        description="Minh họa logic, không phải sơ đồ hạ tầng thật."
        accessory={<span className={styles.mapBadge}>DEMO MAP</span>}
      />
      <div
        className={styles.flowMap}
        aria-label="Luồng từ người dùng demo qua cổng ứng dụng, dịch vụ xử lý đến kho dữ liệu mẫu"
      >
        {FLOW_ITEMS.map((item) =>
          item.type === "node" ? (
            <FlowNode key={item.key} item={item} />
          ) : (
            <FlowConnector key={item.key} item={item} />
          ),
        )}
      </div>
      <div className={styles.flowLegend}>
        <span>
          <i className={styles.legendGood} /> Ổn định
        </span>
        <span>
          <i className={styles.legendWarn} /> Vượt ngưỡng mẫu
        </span>
        <span>Kiểm tra gần nhất: 08:42</span>
      </div>
    </section>
  );
}
