import Link from "next/link";
import styles from "./resilience.module.css";

export default function NotFound() {
  return (
    <main className={styles.viewport} aria-labelledby="not-found-title">
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

          <p className={styles.statusCode}>404 · KHÔNG TÌM THẤY</p>
          <h1 className={styles.title} id="not-found-title">
            Không tìm thấy không gian vận hành
          </h1>
          <p className={styles.description}>
            Liên kết có thể đã thay đổi hoặc bạn chưa được dẫn đến đúng khu vực. Hãy quay về tổng quan để tiếp tục công việc.
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/">
              Về tổng quan
            </Link>
            <Link className={styles.secondaryAction} href="/don-hang">
              Mở danh sách đơn hàng
            </Link>
          </div>

          <p className={styles.footnote}>
            <span className={styles.footnoteDot} aria-hidden="true" />
            Mã trạng thái 404 — yêu cầu không làm thay đổi dữ liệu vận hành.
          </p>
        </div>
      </section>
    </main>
  );
}
