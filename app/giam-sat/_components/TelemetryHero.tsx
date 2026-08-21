import styles from "../page.module.css";

type TelemetryHeroProps = {
  isLive: boolean;
  onToggle: () => void;
};

export function TelemetryHero({ isLive, onToggle }: TelemetryHeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="monitor-title">
      <div>
        <div className={styles.telemetryLabel}>
          <span aria-hidden="true" /> Telemetry mô phỏng
        </div>
        <h2 id="monitor-title">Mọi tín hiệu, một nhịp vận hành.</h2>
        <p>
          Theo dõi sức khỏe dịch vụ, luồng phụ thuộc và cảnh báo thử nghiệm mà
          không chạm vào hạ tầng thật.
        </p>
      </div>
      <div className={styles.liveControl}>
        <div className={styles.liveCopy} aria-live="polite">
          <span
            className={isLive ? styles.liveDot : styles.pausedDot}
            aria-hidden="true"
          />
          <div>
            <strong>
              {isLive ? "Đang phát tín hiệu mẫu" : "Đã tạm dừng mô phỏng"}
            </strong>
            <small>Lần nhận cuối: 08:42:18</small>
          </div>
        </div>
        <button type="button" onClick={onToggle} aria-pressed={!isLive}>
          <span aria-hidden="true">{isLive ? "Ⅱ" : "▶"}</span>
          {isLive ? "Tạm dừng" : "Tiếp tục"}
        </button>
      </div>
    </section>
  );
}
