import type { CSSProperties } from "react";
import type { Asset, AssetSort, AssetStatus, SortKey } from "../_lib/assets";
import styles from "../page.module.css";

type AriaSortValue = "none" | "ascending" | "descending";

type AssetTableProps = {
  assets: readonly Asset[];
  filteredCount: number;
  firstResult: number;
  lastResult: number;
  page: number;
  pageCount: number;
  sort: AssetSort;
  onSort: (key: SortKey) => void;
  onClear: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

const statusClass: Record<AssetStatus, string> = {
  "Đang hoạt động": styles.statusActive,
  "Cần theo dõi": styles.statusAttention,
  "Đang bảo trì": styles.statusMaintenance,
  "Dự phòng": styles.statusStandby,
};

function getAriaSort(sort: AssetSort, key: SortKey): AriaSortValue {
  if (sort.key !== key) return "none";
  return sort.direction === "asc" ? "ascending" : "descending";
}

function getSortActionLabel(label: string, sort: AssetSort, key: SortKey) {
  const nextDirection = sort.key === key && sort.direction === "asc" ? "giảm dần" : "tăng dần";
  return `Sắp xếp ${label} theo thứ tự ${nextDirection}`;
}

export default function AssetTable({
  assets,
  filteredCount,
  firstResult,
  lastResult,
  page,
  pageCount,
  sort,
  onSort,
  onClear,
  onPreviousPage,
  onNextPage,
}: AssetTableProps) {
  return (
    <>
      <div
        className={styles.tableWrap}
        role="region"
        aria-label="Bảng danh mục tài sản, có thể cuộn ngang"
      >
        <table className={styles.assetTable}>
          <caption className={styles.srOnly}>
            Danh mục tài sản CNTT mô phỏng, gồm vị trí, nhóm phụ trách, tình trạng và sức khỏe thiết bị.
          </caption>
          <thead>
            <tr>
              <th scope="col" aria-sort={getAriaSort(sort, "code")}>
                <button type="button" aria-label={getSortActionLabel("mã tài sản", sort, "code")} onClick={() => onSort("code")}>Mã tài sản <span aria-hidden="true">↕</span></button>
              </th>
              <th scope="col" aria-sort={getAriaSort(sort, "name")}>
                <button type="button" aria-label={getSortActionLabel("tên thiết bị", sort, "name")} onClick={() => onSort("name")}>Thiết bị <span aria-hidden="true">↕</span></button>
              </th>
              <th scope="col">Điểm vận hành</th>
              <th scope="col">Nhóm phụ trách</th>
              <th scope="col" aria-sort={getAriaSort(sort, "status")}>
                <button type="button" aria-label={getSortActionLabel("tình trạng", sort, "status")} onClick={() => onSort("status")}>Tình trạng <span aria-hidden="true">↕</span></button>
              </th>
              <th scope="col" aria-sort={getAriaSort(sort, "health")}>
                <button type="button" aria-label={getSortActionLabel("sức khỏe", sort, "health")} onClick={() => onSort("health")}>Sức khỏe <span aria-hidden="true">↕</span></button>
              </th>
              <th scope="col">Kiểm tra cuối</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.code}>
                <td><code>{asset.code}</code></td>
                <td>
                  <div className={styles.assetName}>
                    <span className={styles.categoryGlyph} aria-hidden="true">{asset.category.slice(0, 2).toLocaleUpperCase("vi")}</span>
                    <div><strong>{asset.name}</strong><span>{asset.category} · Dữ liệu demo</span></div>
                  </div>
                </td>
                <td><span className={styles.siteName}>{asset.site}</span></td>
                <td>{asset.team}</td>
                <td><span className={`${styles.status} ${statusClass[asset.status]}`}><i aria-hidden="true" />{asset.status}</span></td>
                <td>
                  <div className={styles.healthCell}>
                    <div
                      className={styles.healthTrack}
                      role="progressbar"
                      aria-label={`Sức khỏe ${asset.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={asset.health}
                      aria-valuetext={`${asset.health} phần trăm`}
                    >
                      <span style={{ "--health": `${asset.health}%` } as CSSProperties} />
                    </div>
                    <strong aria-hidden="true">{asset.health}%</strong>
                  </div>
                </td>
                <td><time dateTime="2026-08-21">{asset.lastCheck}</time></td>
              </tr>
            ))}
          </tbody>
        </table>

        {assets.length === 0 ? (
          <div className={styles.emptyState} role="status" aria-live="polite">
            <span aria-hidden="true">⌕</span>
            <strong>Không có tài sản phù hợp</strong>
            <p>Thử đổi từ khóa hoặc đặt lại bộ lọc để xem toàn bộ dữ liệu mẫu.</p>
            <button type="button" onClick={onClear}>Xóa bộ lọc</button>
          </div>
        ) : null}
      </div>

      <div className={styles.tableFooter}>
        <p>Hiển thị <strong>{firstResult}–{lastResult}</strong> trong số <strong>{filteredCount}</strong> bản ghi</p>
        <nav className={styles.pagination} aria-label="Phân trang tài sản">
          <button type="button" disabled={page === 1} onClick={onPreviousPage} aria-label="Trang trước">←</button>
          <span>Trang <strong>{page}</strong> / {pageCount}</span>
          <button type="button" disabled={page === pageCount} onClick={onNextPage} aria-label="Trang sau">→</button>
        </nav>
      </div>
    </>
  );
}
