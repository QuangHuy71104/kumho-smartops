"use client";

import Link from "next/link";
import styles from "./resilience.module.css";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorPage({ retry }: ErrorPageProps) {
  const handleReset = () => retry();

  return (
    <main className={styles.viewport} aria-labelledby="error-title">
      <section className={styles.card} role="alert">
        <div className={styles.accent} aria-hidden="true" />
        <div className={styles.content}>
          <div className={styles.brandRow} aria-hidden="true">
            <span className={styles.brandMark}>KS</span>
            <span className={styles.brandCopy}>
              <span className={styles.brandName}>KSOps</span>
              <span className={styles.brandDescriptor}>Transport Control</span>
            </span>
          </div>

          <p className={styles.statusCode}>SYSTEM · TẠM GIÁN ĐOẠN</p>
          <h1 className={styles.title} id="error-title">
            Không thể tải không gian điều hành
          </h1>
          <p className={styles.description}>
            Một sự cố tạm thời đã xảy ra. Dữ liệu vận hành của bạn không bị thay đổi; hãy thử tải lại khu vực này.
          </p>

          <div className={styles.actions}>
            <button className={styles.primaryAction} onClick={handleReset} type="button">
              Thử tải lại
            </button>
            <Link className={styles.secondaryAction} href="/">
              Về tổng quan
            </Link>
          </div>

          <p className={styles.footnote}>
            <span className={styles.footnoteDot} aria-hidden="true" />
            Nếu sự cố tiếp diễn, hãy ghi lại thời điểm xảy ra để bộ phận kỹ thuật kiểm tra nhật ký hệ thống.
          </p>
        </div>
      </section>
    </main>
  );
}
