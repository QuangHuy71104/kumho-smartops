import styles from "./resilience.module.css";

export default function Loading() {
  return (
    <main
      className={styles.viewport}
      aria-busy="true"
      aria-labelledby="loading-title"
      aria-live="polite"
      role="status"
    >
      <section className={styles.card}>
        <div className={styles.accent} aria-hidden="true" />
        <div className={styles.content}>
          <div className={styles.brandRow} aria-hidden="true">
            <span className={styles.brandMark}>KS</span>
            <span className={styles.brandCopy}>
              <span className={styles.brandName}>KSOps</span>
              <span className={styles.brandDescriptor}>Transport Control</span>
            </span>
          </div>

          <p className={styles.eyebrow}>Đang kết nối dữ liệu</p>
          <h1 className={styles.title} id="loading-title">
            Đang đồng bộ không gian điều hành
          </h1>
          <p className={styles.description}>
            Hệ thống đang chuẩn bị dữ liệu đội xe, đơn vận chuyển và lịch điều phối mới nhất.
          </p>

          <div className={styles.loadingStage} aria-hidden="true">
            <span className={styles.loader} />
            <span className={styles.loadingCopy}>
              <span className={styles.loadingLine} />
              <span className={styles.loadingLineShort} />
            </span>
          </div>

          <p className={styles.footnote}>
            <span className={styles.footnoteDot} aria-hidden="true" />
            Vui lòng giữ trang này mở trong khi KSOps hoàn tất đồng bộ.
          </p>
        </div>
      </section>
    </main>
  );
}
