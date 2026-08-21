import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIncidentRecord,
  decodeStoredIncidents,
  filterIncidentRecords,
  mergeIncidentRecords,
  shouldOpenIncidentForm,
  summarizeIncidentRecords,
  upsertIncidentRecord,
  urlWithoutIncidentFormTrigger,
} from "../app/su-co/_lib/incidents.ts";

const draft = {
  title: "  Kiểm tra yêu cầu demo  ",
  category: "Ứng dụng",
  priority: "Cao",
  site: "  Điểm mô phỏng A  ",
};

test("incident builder normalizes required text and assigns SLA by priority", () => {
  const incident = buildIncidentRecord(draft, 1_725_000_001_234);

  assert.equal(incident.id, "INC-D1234");
  assert.equal(incident.title, "Kiểm tra yêu cầu demo");
  assert.equal(incident.site, "Điểm mô phỏng A");
  assert.equal(incident.sla, "Còn 1 giờ");
  assert.equal(incident.status, "Mới");
});

test("stored incident decoder rejects malformed runtime data", () => {
  const valid = buildIncidentRecord(draft, 1_725_000_001_234);

  assert.deepEqual(decodeStoredIncidents([valid]), [valid]);
  assert.equal(decodeStoredIncidents([{ ...valid, priority: "Không hợp lệ" }]), null);
  assert.equal(decodeStoredIncidents({ incident: valid }), null);
});

test("incident merge and upsert keep one authoritative record per ID", () => {
  const baseline = mergeIncidentRecords([]);
  const changed = { ...baseline[0], status: "Đã giải quyết" };
  const merged = mergeIncidentRecords([changed]);
  const updated = upsertIncidentRecord([changed], { ...changed, status: "Đang xử lý" });

  assert.equal(merged.filter((item) => item.id === changed.id).length, 1);
  assert.equal(merged.find((item) => item.id === changed.id)?.status, "Đã giải quyết");
  assert.equal(updated.length, 1);
  assert.equal(updated[0].status, "Đang xử lý");
});

test("incident filters and summary combine independently", () => {
  const records = mergeIncidentRecords([]);
  const filtered = filterIncidentRecords(records, "hạ tầng", "Cao", "Tất cả");
  const summary = summarizeIncidentRecords(records);

  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((item) => item.priority === "Cao"));
  assert.equal(summary.open + summary.resolved, records.length);
  assert.ok(summary.urgent > 0);
});

test("incident modal URL helpers preserve unrelated navigation state", () => {
  assert.equal(shouldOpenIncidentForm("?new=1", ""), true);
  assert.equal(shouldOpenIncidentForm("", "#tao-su-co"), true);
  assert.equal(shouldOpenIncidentForm("?new=0", "#khac"), false);
  assert.equal(
    urlWithoutIncidentFormTrigger({
      pathname: "/su-co",
      search: "?team=ha-tang&new=1",
      hash: "#tao-su-co",
    }),
    "/su-co?team=ha-tang",
  );
});
