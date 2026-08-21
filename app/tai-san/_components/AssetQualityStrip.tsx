import styles from "../page.module.css";

export default function AssetQualityStrip() {
  return (
    <section className={styles.qualityStrip} aria-label="Chất lượng dữ liệu mô phỏng">
      <div>
        <span className={styles.qualityMark} aria-hidden="true">DQ</span>
        <div><strong>Chất lượng dữ liệu: 98,6%</strong><p>146/148 bản ghi mẫu có đủ chủ sở hữu, vị trí và trạng thái vòng đời.</p></div>
      </div>
      <div className={styles.qualityLegend}>
        <span><i className={styles.dotGood} aria-hidden="true" /> Đã xác minh 146</span>
        <span><i className={styles.dotWarn} aria-hidden="true" /> Cần bổ sung 2</span>
      </div>
    </section>
  );
}
