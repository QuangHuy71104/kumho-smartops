export type AssetStatus = "Đang hoạt động" | "Cần theo dõi" | "Đang bảo trì" | "Dự phòng";
export type AssetCategory = "Máy trạm" | "Thiết bị mạng" | "Máy in" | "Máy chủ demo" | "Thiết bị hỗ trợ";

export type Asset = {
  code: string;
  name: string;
  category: AssetCategory;
  site: string;
  team: string;
  status: AssetStatus;
  health: number;
  lastCheck: string;
};

export type SortKey = "code" | "name" | "status" | "health";

export type AssetSort = {
  key: SortKey;
  direction: "asc" | "desc";
};

export type AssetFilters = {
  search: string;
  category: string;
  site: string;
  status: string;
};

export type AssetSummary = {
  active: number;
  attention: number;
  maintenance: number;
  verified: number;
};

export const ALL_FILTER = "Tất cả";
export const ASSET_PAGE_SIZE = 10;

export const categories: readonly AssetCategory[] = [
  "Máy trạm",
  "Thiết bị mạng",
  "Máy in",
  "Máy chủ demo",
  "Thiết bị hỗ trợ",
];

export const sites = [
  "Điểm mô phỏng A",
  "Điểm mô phỏng B",
  "Văn phòng demo",
  "Phòng lab thử nghiệm",
] as const;

export const statusOrder: readonly AssetStatus[] = [
  "Cần theo dõi",
  "Đang bảo trì",
  "Dự phòng",
  "Đang hoạt động",
];

const teams = ["Nhóm Hạ tầng", "Service Desk", "Nhóm Ứng dụng", "Nhóm Vận hành"] as const;

const categoryNames: Record<AssetCategory, readonly string[]> = {
  "Máy trạm": ["Máy trạm điều hành", "Máy trạm nghiệp vụ", "Máy trạm hỗ trợ"],
  "Thiết bị mạng": ["Bộ chuyển mạch demo", "Thiết bị kết nối mẫu", "Điểm truy cập thử nghiệm"],
  "Máy in": ["Máy in văn phòng", "Máy in quầy demo", "Máy in dự phòng"],
  "Máy chủ demo": ["Máy chủ ứng dụng mẫu", "Máy chủ dữ liệu thử nghiệm", "Máy chủ giám sát demo"],
  "Thiết bị hỗ trợ": ["Bộ lưu điện mẫu", "Màn hình thông tin demo", "Thiết bị quét thử nghiệm"],
};

export function createDemoAssets(count = 148): Asset[] {
  return Array.from({ length: count }, (_, index) => {
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
}

export function summarizeAssets(assetList: readonly Asset[]): AssetSummary {
  return assetList.reduce<AssetSummary>((summary, asset) => ({
    active: summary.active + Number(asset.status === "Đang hoạt động"),
    attention: summary.attention + Number(asset.status === "Cần theo dõi"),
    maintenance: summary.maintenance + Number(asset.status === "Đang bảo trì"),
    verified: summary.verified + Number(asset.health >= 90),
  }), { active: 0, attention: 0, maintenance: 0, verified: 0 });
}

export function filterAndSortAssets(
  assetList: readonly Asset[],
  filters: AssetFilters,
  sort: AssetSort,
): Asset[] {
  const keyword = filters.search.trim().toLocaleLowerCase("vi");

  return assetList
    .filter((asset) => {
      const matchesSearch = keyword.length === 0 || [
        asset.code,
        asset.name,
        asset.site,
        asset.team,
      ].some((value) => value.toLocaleLowerCase("vi").includes(keyword));

      return matchesSearch
        && (filters.category === ALL_FILTER || asset.category === filters.category)
        && (filters.site === ALL_FILTER || asset.site === filters.site)
        && (filters.status === ALL_FILTER || asset.status === filters.status);
    })
    .sort((first, second) => {
      const left = first[sort.key];
      const right = second[sort.key];
      const compared = typeof left === "number"
        ? left - Number(right)
        : String(left).localeCompare(String(right), "vi");

      return sort.direction === "asc" ? compared : -compared;
    });
}

export function getNextSort(current: AssetSort, key: SortKey): AssetSort {
  return {
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  };
}

export function paginateAssets(
  assetList: readonly Asset[],
  requestedPage: number,
  pageSize = ASSET_PAGE_SIZE,
) {
  const pageCount = Math.max(1, Math.ceil(assetList.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const firstResult = assetList.length === 0 ? 0 : (page - 1) * pageSize + 1;

  return {
    items: assetList.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageCount,
    firstResult,
    lastResult: Math.min(page * pageSize, assetList.length),
  };
}

function escapeCsv(value: string | number) {
  const text = String(value);
  const formulaSafeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${formulaSafeText.replaceAll('"', '""')}"`;
}

export function serializeAssetsCsv(assetList: readonly Asset[]): string {
  const headers = [
    "Mã tài sản",
    "Tên",
    "Loại",
    "Điểm mô phỏng",
    "Nhóm phụ trách",
    "Tình trạng",
    "Sức khỏe",
    "Kiểm tra cuối",
  ];
  const rows = assetList.map((asset) => [
    asset.code,
    asset.name,
    asset.category,
    asset.site,
    asset.team,
    asset.status,
    `${asset.health}%`,
    asset.lastCheck,
  ]);

  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`;
}

export const demoAssets: readonly Asset[] = createDemoAssets();
export const demoAssetSummary = summarizeAssets(demoAssets);
