"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { runbooks, type RunbookRecord } from "../../lib/demo-data";
import styles from "./Knowledge.module.css";

const categories = ["Tất cả", ...Array.from(new Set(runbooks.map((item) => item.category)))] as const;
const COPY_FEEDBACK_DURATION_MS = 1_800;

type CopyStatus = "idle" | "copied" | "failed";

function filterRunbooks(records: readonly RunbookRecord[], query: string, category: string) {
  const normalized = query.trim().toLocaleLowerCase("vi");

  return records.filter((item) => (
    (category === "Tất cả" || item.category === category)
    && (!normalized || [item.code, item.title, item.description, item.owner]
      .join(" ")
      .toLocaleLowerCase("vi")
      .includes(normalized))
  ));
}

function runbookFromHash(hash: string) {
  try {
    const slug = decodeURIComponent(hash.replace(/^#/, ""));
    return runbooks.find((runbook) => runbook.slug === slug) ?? null;
  } catch {
    return null;
  }
}

function buildRunbookUrl(origin: string, slug: string) {
  const url = new URL("/tri-thuc", origin);
  url.hash = slug;
  return url.toString();
}

type RunbookCardProps = {
  item: RunbookRecord;
  selected: boolean;
  onSelect: (slug: string) => void;
};

function RunbookCard({ item, selected, onSelect }: RunbookCardProps) {
  return (
    <button
      aria-controls="reader-title"
      aria-pressed={selected}
      className={selected ? styles.cardActive : styles.card}
      id={item.slug}
      onClick={() => onSelect(item.slug)}
      type="button"
    >
      <span className={styles.cardCode}>{item.code}</span>
      <span className={styles.cardCategory}>{item.category}</span>
      <strong>{item.title}</strong>
      <span className={styles.cardDescription}>{item.description}</span>
      <span className={styles.cardMeta}><em>{item.minutes} phút</em><small>Cập nhật {item.updatedAt}</small></span>
    </button>
  );
}

export default function KnowledgeClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("Tất cả");
  const [selectedSlug, setSelectedSlug] = useState(runbooks[0].slug);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const copyResetTimer = useRef<number | null>(null);

  useEffect(() => {
    const selectFromHash = () => {
      const runbook = runbookFromHash(window.location.hash);
      if (runbook) setSelectedSlug(runbook.slug);
    };
    const frame = window.requestAnimationFrame(selectFromHash);
    window.addEventListener("hashchange", selectFromHash);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", selectFromHash);
      if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current);
    };
  }, []);

  const filtered = useMemo(() => filterRunbooks(runbooks, query, category), [category, query]);
  const selected = useMemo(
    () => runbooks.find((runbook) => runbook.slug === selectedSlug) ?? runbooks[0],
    [selectedSlug],
  );

  function scheduleCopyStatusReset() {
    if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current);
    copyResetTimer.current = window.setTimeout(() => {
      setCopyStatus("idle");
      copyResetTimer.current = null;
    }, COPY_FEEDBACK_DURATION_MS);
  }

  async function copyRunbookLink() {
    const url = buildRunbookUrl(window.location.origin, selected.slug);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    scheduleCopyStatusReset();
  }

  const copyAnnouncement = copyStatus === "copied"
    ? "Đã sao chép liên kết runbook."
    : copyStatus === "failed"
      ? "Không thể sao chép liên kết. Vui lòng thử lại."
      : "";

  return (
    <div className={styles.module}>
      <p className="sr-only" id="copy-status" aria-atomic="true" aria-live="polite">{copyAnnouncement}</p>

      <section className={styles.lead}>
        <div>
          <span>Single source of truth</span>
          <h2>Biến kinh nghiệm xử lý thành quy trình có thể lặp lại.</h2>
          <p>Mỗi hướng dẫn nêu rõ phạm vi, chủ sở hữu, thời gian dự kiến và bước xác nhận. Không chứa lệnh, địa chỉ hoặc cấu hình thật.</p>
        </div>
        <dl>
          <div><dt>Runbook mẫu</dt><dd>04</dd></div>
          <div><dt>Đã rà soát</dt><dd>100%</dd></div>
          <div><dt>Chu kỳ review</dt><dd>90 ngày</dd></div>
        </dl>
      </section>

      <div className={styles.contentGrid} id="danh-sach-runbook">
        <section className={styles.library} aria-labelledby="library-title">
          <div className={styles.heading}><div><span>Danh mục nội bộ demo</span><h2 id="library-title">Runbook đang áp dụng</h2></div><b>{filtered.length} tài liệu</b></div>
          <div className={styles.filters}>
            <label><span>Tìm runbook</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã, tiêu đề, chủ sở hữu..." /></label>
            <label><span>Nhóm</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className={styles.cards} aria-label="Kết quả runbook">
            {filtered.map((item) => (
              <RunbookCard
                item={item}
                key={item.slug}
                onSelect={setSelectedSlug}
                selected={selected.slug === item.slug}
              />
            ))}
            {filtered.length === 0 ? <div className={styles.empty}><strong>Không tìm thấy runbook</strong><p>Thử từ khóa hoặc nhóm tài liệu khác.</p></div> : null}
          </div>
        </section>

        <aside className={styles.reader} aria-labelledby="reader-title" aria-live="polite">
          <div className={styles.readerTop}><span>{selected.code} · v1.0</span><button aria-describedby="copy-status" type="button" onClick={copyRunbookLink}>{copyStatus === "copied" ? "Đã sao chép" : "Sao chép liên kết"}</button></div>
          <h2 id="reader-title">{selected.title}</h2>
          <p>{selected.description}</p>
          <dl>
            <div><dt>Chủ sở hữu</dt><dd>{selected.owner}</dd></div>
            <div><dt>Thời gian</dt><dd>Khoảng {selected.minutes} phút</dd></div>
            <div><dt>Rà soát</dt><dd>{selected.updatedAt}</dd></div>
            <div><dt>Phạm vi</dt><dd>Môi trường demo</dd></div>
          </dl>
          <div className={styles.steps}>
            <h3>Các bước thực hiện</h3>
            {selected.steps.map((step, index) => <article key={step}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{step}</strong><p>{index === selected.steps.length - 1 ? "Kết thúc bằng xác nhận và bằng chứng audit." : "Thực hiện theo phạm vi được phê duyệt; dừng nếu phát sinh rủi ro."}</p></div></article>)}
          </div>
          <div className={styles.warning}><strong>Nguyên tắc an toàn</strong><p>Chỉ kỹ thuật viên được phân quyền mới thực hiện thay đổi. Mọi ví dụ trong bản demo đã được tổng quát hóa.</p></div>
        </aside>
      </div>

      <section className={styles.governance} aria-label="Vòng đời quản trị runbook">
        <div><span>01</span><strong>Soạn thảo</strong><p>Owner tạo nội dung từ sự cố lặp lại hoặc thay đổi đã nghiệm thu.</p></div>
        <div><span>02</span><strong>Peer review</strong><p>Ít nhất một kỹ thuật viên khác kiểm tra tính đúng và rollback.</p></div>
        <div><span>03</span><strong>Phê duyệt</strong><p>Quản lý xác nhận phạm vi, bảo mật và ngày rà soát tiếp theo.</p></div>
        <div><span>04</span><strong>Đo lường</strong><p>Theo dõi mức sử dụng, thời gian xử lý và phản hồi cải tiến.</p></div>
      </section>
    </div>
  );
}
