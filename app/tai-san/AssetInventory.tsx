"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./page.module.css";

type AssetStatus = "Đang hoạt động" | "Cần theo dõi" | "Đang bảo trì" | "Dự phòng";
type AssetCategory = "Máy trạm" | "Thiết bị mạng" | "Máy in" | "Máy chủ demo" | "Thiết bị hỗ trợ";

type Asset = {
  code: string;
  name: string;
  category: AssetCategory;
  site: string;
  team: string;
  status: AssetStatus;
  health: number;
  lastCheck: string;
};

type SortKey = "code" | "name" | "status" | "health";

const categories: AssetCategory[] = [
  "Máy trạm",
  "Thiết bị mạng",
  "Máy in",
  "Máy chủ demo",
  "Thiết bị hỗ trợ",
];

const sites = [
  "Điểm mô phỏng A",
  "Điểm mô phỏng B",
  "Văn phòng demo",
  "Phòng lab thử nghiệm",
] as const;

const teams = ["Nhóm Hạ tầng", "Service Desk", "Nhóm Ứng dụng", "Nhóm Vận hành"] as const;

const categoryNames: Record<AssetCategory, string[]> = {
  "Máy trạm": ["Máy trạm điều hành", "Máy trạm nghiệp vụ", "Máy trạm hỗ trợ"],
  "Thiết bị mạng": ["Bộ chuyển mạch demo", "Thiết bị kết nối mẫu", "Điểm truy cập thử nghiệm"],
  "Máy in": ["Máy in văn phòng", "Máy in quầy demo", "Máy in dự phòng"],
  "Máy chủ demo": ["Máy chủ ứng dụng mẫu", "Máy chủ dữ liệu thử nghiệm", "Máy chủ giám sát demo"],
  "Thiết bị hỗ trợ": ["Bộ lưu điện mẫu", "Màn hình thông tin demo", "Thiết bị quét thử nghiệm"],
};

const statusOrder: AssetStatus[] = ["Cần theo dõi", "Đang bảo trì", "Dự phòng", "Đang hoạt động"];

const assets: Asset[] = Array.from({ length: 148 }, (_, index) => {
  const ordinal = index + 1;
  const category = categories[index % categories.length];
  const status: AssetStatus =
    ordinal % 29 === 0
      ? "Cần theo dõi"
      : ordinal % 23 === 0
        ? "Đang bảo trì"
        : ordinal % 11 === 0
          ? "Dự phòng"
          : "Đang hoạt động";
  const health = status === "Cần theo dõi"
    ? 72 + (ordinal % 8)
    : status === "Đang bảo trì"
      ? 82 + (ordinal % 7)
      : status === "Dự phòng"
        ? 94
        : 96 + (ordinal % 5);
  const hour = 7 + (ordinal % 3);
  const minute = (ordinal * 7) % 60;
  const itemName = categoryNames[category][index % categoryNames[category].length];

  return {
    code: `KS-DEMO-${String(ordinal).padStart(4, "0")}`,
    name: `${itemName} ${String((index % 24) + 1).padStart(2, "0")}`,
    category,
    site: sites[index % sites.length],
    team: teams[(index * 3) % teams.length],
    status,
    health,
    lastCheck: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} · 21/08/2026`,
  };
});

const statusClass: Record<AssetStatus, string> = {
  "Đang hoạt động": styles.statusActive,
  "Cần theo dõi": styles.statusAttention,
  "Đang bảo trì": styles.statusMaintenance,
  "Dự phòng": styles.statusStandby,
};

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function AssetInventory() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [site, setSite] = useState("Tất cả");
  const [status, setStatus] = useState("Tất cả");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "code",
    direction: "asc",
  });

  const summary = useMemo(() => ({
    active: assets.filter((asset) => asset.status === "Đang hoạt động").length,
    attention: assets.filter((asset) => asset.status === "Cần theo dõi").length,
    maintenance: assets.filter((asset) => asset.status === "Đang bảo trì").length,
    verified: assets.filter((asset) => asset.health >= 90).length,
  }), []);

  const filteredAssets = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return assets
      .filter((asset) => {
        const matchesSearch = keyword.length === 0 || [
          asset.code,
          asset.name,
          asset.site,
          asset.team,
        ].some((value) => value.toLocaleLowerCase("vi").includes(keyword));
        return matchesSearch
          && (category === "Tất cả" || asset.category === category)
          && (site === "Tất cả" || asset.site === site)
          && (status === "Tất cả" || asset.status === status);
      })
      .sort((first, second) => {
        const left = sort.key === "health" ? first.health : first[sort.key];
        const right = sort.key === "health" ? second.health : second[sort.key];
        const compared = typeof left === "number"
          ? left - Number(right)
          : String(left).localeCompare(String(right), "vi");
        return sort.direction === "asc" ? compared : -compared;
      });
  }, [category, search, site, sort, status]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
  const visiblePage = Math.min(page, pageCount);
  const pageAssets = filteredAssets.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  function updateSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  function clearFilters() {
    setSearch("");
    setCategory("Tất cả");
    setSite("Tất cả");
    setStatus("Tất cả");
    setPage(1);
  }

  function exportCsv() {
    const headers = ["Mã tài sản", "Tên", "Loại", "Điểm mô phỏng", "Nhóm phụ trách", "Tình trạng", "Sức khỏe", "Kiểm tra cuối"];
    const rows = filteredAssets.map((asset) => [
      asset.code,
      asset.name,
      asset.category,
      asset.site,
      asset.team,
      asset.status,
      `${asset.health}%`,
      asset.lastCheck,
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ksops-tai-san-demo.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const firstResult = filteredAssets.length === 0 ? 0 : (visiblePage - 1) * pageSize + 1;
  const lastResult = Math.min(visiblePage * pageSize, filteredAssets.length);

  return (
    <div className={styles.page}>
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
          <button className={styles.exportButton} type="button" onClick={exportCsv}>
            <span aria-hidden="true">↓</span> Xuất CSV
          </button>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Tổng quan danh mục tài sản">
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.iconRed}`} aria-hidden="true">TS</span>
          <div><p>Tổng tài sản</p><strong>{assets.length}</strong><small>100% bản ghi mô phỏng</small></div>
          <span className={styles.metricTrend}>+12 quý này</span>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.iconGreen}`} aria-hidden="true">✓</span>
          <div><p>Đang hoạt động</p><strong>{summary.active}</strong><small>{Math.round(summary.active / assets.length * 100)}% danh mục</small></div>
          <span className={styles.metricTrendGood}>Ổn định</span>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.iconAmber}`} aria-hidden="true">!</span>
          <div><p>Cần theo dõi</p><strong>{summary.attention}</strong><small>Cần đánh giá kỹ thuật</small></div>
          <span className={styles.metricTrendWarn}>Ưu tiên</span>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.iconBlue}`} aria-hidden="true">BT</span>
          <div><p>Đang bảo trì</p><strong>{summary.maintenance}</strong><small>{summary.verified} thiết bị đạt chuẩn</small></div>
          <span className={styles.metricTrend}>Theo lịch</span>
        </article>
      </section>

      <section className={styles.registryPanel} aria-labelledby="registry-title">
        <div className={styles.panelHeading}>
          <div>
            <span className={styles.kicker}>CMDB thu gọn</span>
            <h2 id="registry-title">Danh mục tài sản</h2>
            <p>Tìm, lọc và kiểm tra nhanh 148 bản ghi an toàn cho bản trình diễn.</p>
          </div>
          <span className={styles.resultPill}>{filteredAssets.length} kết quả</span>
        </div>

        <div className={styles.filters}>
          <label className={styles.searchField}>
            <span className={styles.filterLabel}>Tìm kiếm</span>
            <span className={styles.inputShell}>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Mã, tên, điểm hoặc nhóm..."
              />
            </span>
          </label>
          <label>
            <span className={styles.filterLabel}>Loại thiết bị</span>
            <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
              <option>Tất cả</option>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className={styles.filterLabel}>Điểm vận hành</span>
            <select value={site} onChange={(event) => { setSite(event.target.value); setPage(1); }}>
              <option>Tất cả</option>
              {sites.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className={styles.filterLabel}>Tình trạng</span>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option>Tất cả</option>
              {statusOrder.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <button className={styles.clearButton} type="button" onClick={clearFilters}>
            Đặt lại
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.assetTable}>
            <thead>
              <tr>
                <th aria-sort={sort.key === "code" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => updateSort("code")}>Mã tài sản <span aria-hidden="true">↕</span></button>
                </th>
                <th aria-sort={sort.key === "name" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => updateSort("name")}>Thiết bị <span aria-hidden="true">↕</span></button>
                </th>
                <th>Điểm vận hành</th>
                <th>Nhóm phụ trách</th>
                <th aria-sort={sort.key === "status" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => updateSort("status")}>Tình trạng <span aria-hidden="true">↕</span></button>
                </th>
                <th aria-sort={sort.key === "health" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => updateSort("health")}>Sức khỏe <span aria-hidden="true">↕</span></button>
                </th>
                <th>Kiểm tra cuối</th>
              </tr>
            </thead>
            <tbody>
              {pageAssets.map((asset) => (
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
                      <div className={styles.healthTrack}><span style={{ "--health": `${asset.health}%` } as CSSProperties} /></div>
                      <strong>{asset.health}%</strong>
                    </div>
                  </td>
                  <td><time dateTime="2026-08-21">{asset.lastCheck}</time></td>
                </tr>
              ))}
            </tbody>
          </table>

          {pageAssets.length === 0 ? (
            <div className={styles.emptyState} role="status">
              <span aria-hidden="true">⌕</span>
              <strong>Không có tài sản phù hợp</strong>
              <p>Thử đổi từ khóa hoặc đặt lại bộ lọc để xem toàn bộ dữ liệu mẫu.</p>
              <button type="button" onClick={clearFilters}>Xóa bộ lọc</button>
            </div>
          ) : null}
        </div>

        <div className={styles.tableFooter}>
          <p>Hiển thị <strong>{firstResult}–{lastResult}</strong> trong số <strong>{filteredAssets.length}</strong> bản ghi</p>
          <div className={styles.pagination} aria-label="Phân trang tài sản">
            <button type="button" disabled={visiblePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Trang trước">←</button>
            <span>Trang <strong>{visiblePage}</strong> / {pageCount}</span>
            <button type="button" disabled={visiblePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} aria-label="Trang sau">→</button>
          </div>
        </div>
      </section>

      <section className={styles.qualityStrip} aria-label="Chất lượng dữ liệu mô phỏng">
        <div>
          <span className={styles.qualityMark} aria-hidden="true">DQ</span>
          <div><strong>Chất lượng dữ liệu: 98,6%</strong><p>146/148 bản ghi mẫu có đủ chủ sở hữu, vị trí và trạng thái vòng đời.</p></div>
        </div>
        <div className={styles.qualityLegend}>
          <span><i className={styles.dotGood} /> Đã xác minh 146</span>
          <span><i className={styles.dotWarn} /> Cần bổ sung 2</span>
        </div>
      </section>
    </div>
  );
}
