"use client";

import { useMemo, useState } from "react";
import AssetFilters from "./_components/AssetFilters";
import AssetHero from "./_components/AssetHero";
import AssetMetrics from "./_components/AssetMetrics";
import AssetQualityStrip from "./_components/AssetQualityStrip";
import AssetTable from "./_components/AssetTable";
import type { AssetFilters as AssetFilterValues, AssetSort, SortKey } from "./_lib/assets";
import {
  ALL_FILTER,
  demoAssets,
  demoAssetSummary,
  filterAndSortAssets,
  getNextSort,
  paginateAssets,
  serializeAssetsCsv,
} from "./_lib/assets";
import styles from "./page.module.css";

const initialFilters: AssetFilterValues = {
  search: "",
  category: ALL_FILTER,
  site: ALL_FILTER,
  status: ALL_FILTER,
};

const initialSort: AssetSort = {
  key: "code",
  direction: "asc",
};

export default function AssetInventory() {
  const [filters, setFilters] = useState<AssetFilterValues>(initialFilters);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<AssetSort>(initialSort);

  const filteredAssets = useMemo(
    () => filterAndSortAssets(demoAssets, filters, sort),
    [filters, sort],
  );
  const pageWindow = paginateAssets(filteredAssets, page);

  function updateFilter(field: keyof AssetFilterValues, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }

  function updateSort(key: SortKey) {
    setSort((current) => getNextSort(current, key));
  }

  function clearFilters() {
    setFilters(initialFilters);
    setPage(1);
  }

  function exportCsv() {
    const csv = serializeAssetsCsv(filteredAssets);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ksops-tai-san-demo.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>
      <AssetHero onExport={exportCsv} />
      <AssetMetrics summary={demoAssetSummary} total={demoAssets.length} />

      <section className={styles.registryPanel} aria-labelledby="registry-title">
        <div className={styles.panelHeading}>
          <div>
            <span className={styles.kicker}>CMDB thu gọn</span>
            <h2 id="registry-title">Danh mục tài sản</h2>
            <p>Tìm, lọc và kiểm tra nhanh 148 bản ghi an toàn cho bản trình diễn.</p>
          </div>
          <span className={styles.resultPill} role="status" aria-live="polite" aria-atomic="true">
            {filteredAssets.length} kết quả
          </span>
        </div>

        <AssetFilters filters={filters} onChange={updateFilter} onClear={clearFilters} />
        <AssetTable
          assets={pageWindow.items}
          filteredCount={filteredAssets.length}
          firstResult={pageWindow.firstResult}
          lastResult={pageWindow.lastResult}
          page={pageWindow.page}
          pageCount={pageWindow.pageCount}
          sort={sort}
          onSort={updateSort}
          onClear={clearFilters}
          onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setPage((current) => Math.min(pageWindow.pageCount, current + 1))}
        />
      </section>

      <AssetQualityStrip />
    </div>
  );
}
