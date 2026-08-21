import styles from "../page.module.css";

type AssetHeroProps = {
  onExport: () => void;
};

export default function AssetHero({ onExport }: AssetHeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="asset-hero-title">
      <div className={styles.heroCopy}>
        <span className={styles.kicker}>Sổ tài sản số · Dữ liệu mẫu</span>
        <h2 id="asset-hero-title">Nắm trọn vòng đời thiết bị trong một màn hình.</h2>
        <p>
          Theo dõi vị trí mô phỏng, đơn vị phụ trách và mức độ sẵn sàng để đội IT chủ động bảo trì.
        </p>
      </div>
      <div className={styles.heroActions}>
        <div className={styles.syncState}>
          <span aria-hidden="true">✓</span>
          <div><strong>Đã đồng bộ bản mẫu</strong><small>08:42 hôm nay</small></div>
        </div>
        <button className={styles.exportButton} type="button" onClick={onExport}>
          <span aria-hidden="true">↓</span> Xuất CSV
        </button>
      </div>
    </section>
  );
}
