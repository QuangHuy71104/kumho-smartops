import type { AssetFilters as AssetFilterValues } from "../_lib/assets";
import { ALL_FILTER, categories, sites, statusOrder } from "../_lib/assets";
import styles from "../page.module.css";

type AssetFiltersProps = {
  filters: AssetFilterValues;
  onChange: (field: keyof AssetFilterValues, value: string) => void;
  onClear: () => void;
};

export default function AssetFilters({ filters, onChange, onClear }: AssetFiltersProps) {
  return (
    <div className={styles.filters} role="search" aria-label="Bộ lọc danh mục tài sản">
      <label className={styles.searchField} htmlFor="asset-search">
        <span className={styles.filterLabel}>Tìm kiếm</span>
        <span className={styles.inputShell}>
          <span aria-hidden="true">⌕</span>
          <input
            id="asset-search"
            name="asset-search"
            type="search"
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Mã, tên, điểm hoặc nhóm..."
            autoComplete="off"
          />
        </span>
      </label>
      <label htmlFor="asset-category">
        <span className={styles.filterLabel}>Loại thiết bị</span>
        <select
          id="asset-category"
          name="asset-category"
          value={filters.category}
          onChange={(event) => onChange("category", event.target.value)}
        >
          <option value={ALL_FILTER}>{ALL_FILTER}</option>
          {categories.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
      </label>
      <label htmlFor="asset-site">
        <span className={styles.filterLabel}>Điểm vận hành</span>
        <select
          id="asset-site"
          name="asset-site"
          value={filters.site}
          onChange={(event) => onChange("site", event.target.value)}
        >
          <option value={ALL_FILTER}>{ALL_FILTER}</option>
          {sites.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
      </label>
      <label htmlFor="asset-status">
        <span className={styles.filterLabel}>Tình trạng</span>
        <select
          id="asset-status"
          name="asset-status"
          value={filters.status}
          onChange={(event) => onChange("status", event.target.value)}
        >
          <option value={ALL_FILTER}>{ALL_FILTER}</option>
          {statusOrder.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
      </label>
      <button className={styles.clearButton} type="button" onClick={onClear}>
        Đặt lại
      </button>
    </div>
  );
}
