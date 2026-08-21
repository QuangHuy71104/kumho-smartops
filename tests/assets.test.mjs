import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_FILTER,
  createDemoAssets,
  filterAndSortAssets,
  getNextSort,
  paginateAssets,
  serializeAssetsCsv,
  summarizeAssets,
} from "../app/tai-san/_lib/assets.ts";

const noFilters = {
  search: "",
  category: ALL_FILTER,
  site: ALL_FILTER,
  status: ALL_FILTER,
};

test("asset seed generation is deterministic and uses safe identifiers", () => {
  const assets = createDemoAssets(148);

  assert.equal(assets.length, 148);
  assert.equal(assets[0].code, "KS-DEMO-0001");
  assert.equal(assets.at(-1).code, "KS-DEMO-0148");
  assert.equal(new Set(assets.map((asset) => asset.code)).size, assets.length);
});

test("asset filtering, sorting and pagination compose predictably", () => {
  const assets = createDemoAssets(36);
  const filtered = filterAndSortAssets(
    assets,
    { ...noFilters, search: "hạ tầng", status: "Đang hoạt động" },
    { key: "health", direction: "desc" },
  );
  const window = paginateAssets(filtered, 999, 4);

  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((asset) => asset.team === "Nhóm Hạ tầng"));
  assert.ok(filtered.every((asset) => asset.status === "Đang hoạt động"));
  assert.deepEqual([...filtered].sort((left, right) => right.health - left.health), filtered);
  assert.equal(window.page, window.pageCount);
  assert.ok(window.items.length <= 4);
});

test("asset summary partitions operational states", () => {
  const assets = createDemoAssets(148);
  const summary = summarizeAssets(assets);

  assert.equal(summary.active + summary.attention + summary.maintenance + assets.filter((asset) => asset.status === "Dự phòng").length, assets.length);
  assert.ok(summary.verified > summary.active / 2);
});

test("sort direction toggles only for the active field", () => {
  assert.deepEqual(getNextSort({ key: "code", direction: "asc" }, "code"), { key: "code", direction: "desc" });
  assert.deepEqual(getNextSort({ key: "code", direction: "desc" }, "name"), { key: "name", direction: "asc" });
});

test("CSV export escapes quotes and neutralizes spreadsheet formulas", () => {
  const [asset] = createDemoAssets(1);
  const csv = serializeAssetsCsv([{ ...asset, name: '=HYPERLINK("unsafe")' }]);

  assert.match(csv, /^\uFEFF/);
  assert.match(csv, /"'=HYPERLINK\(""unsafe""\)"/);
  assert.equal(csv.split("\r\n").length, 2);
});
