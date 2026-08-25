import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  decodeWorkspaceStateKey,
  isJsonValue,
  WORKSPACE_STATE_KEYS,
} from "../lib/workspace-state.ts";

test("workspace state keys are explicit and JSON payloads are bounded", () => {
  assert.equal(WORKSPACE_STATE_KEYS.length, 14);
  assert.equal(decodeWorkspaceStateKey("orders"), "orders");
  assert.equal(decodeWorkspaceStateKey("unknown"), null);
  assert.equal(isJsonValue({ orders: [{ id: "DH-260823-2408", weight: 460 }] }), true);
  assert.equal(isJsonValue({ invalid: Number.NaN }), false);

  let tooDeep = {};
  for (let index = 0; index < 14; index += 1) tooDeep = { nested: tooDeep };
  assert.equal(isJsonValue(tooDeep), false);
});

test("workspace clients persist through the same-origin server API", async () => {
  const [route, hook, pool] = await Promise.all([
    readFile("app/api/v1/workspace-state/[key]/route.ts", "utf8"),
    readFile("app/_hooks/useWorkspaceState.ts", "utf8"),
    readFile("lib/server/db/workspace-pool.ts", "utf8"),
  ]);
  assert.match(route, /requireSameHost\(request\)/);
  assert.match(route, /ON CONFLICT \(state_key\) DO UPDATE/);
  assert.match(route, /platform\.workspace_state\.version \+ 1/);
  assert.match(hook, /writeQueues/);
  assert.match(hook, /useLocalStorageState/);
  assert.match(pool, /process\.env\.DATABASE_URL/);
  assert.doesNotMatch([route, hook, pool].join("\n"), /NEXT_PUBLIC_SUPABASE|service_role/i);
});
