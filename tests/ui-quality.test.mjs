import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

async function collectCssFiles(directory) {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const relativePath = join(directory, entry.name);
    if (entry.isDirectory()) return collectCssFiles(relativePath);
    return entry.name.endsWith(".css") ? [relativePath] : [];
  }));
  return nested.flat();
}

test("UI typography uses scalable units and keeps fixed text at 12px or larger", async () => {
  const files = await collectCssFiles("app");
  const sources = await Promise.all(files.map(async (file) => ({
    file,
    source: await readFile(join(root, file), "utf8"),
  })));

  for (const { file, source } of sources) {
    assert.doesNotMatch(source, /font-size\s*:[^;}{]*\d+(?:\.\d+)?px/i, `${file} contains a fixed px font-size`);
    assert.doesNotMatch(source, /font\s*:[^;}{]*\b(?:[0-9]|1[01])px\b/i, `${file} contains text below 12px`);

    for (const declaration of source.matchAll(/font-size\s*:\s*([^;}{]+)/gi)) {
      for (const size of declaration[1].matchAll(/(\d+(?:\.\d+)?)rem/gi)) {
        assert.ok(Number(size[1]) >= 0.75, `${file} contains text below 0.75rem: ${declaration[0]}`);
      }
    }

    for (const block of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/(?:button|input|select)/i.test(block[1])) continue;
      const minHeight = block[2].match(/min-height\s*:\s*(\d+)px/i);
      if (minHeight) {
        assert.ok(Number(minHeight[1]) >= 44, `${file} overrides an interactive control below 44px: ${block[1].trim()}`);
      }
    }
  }
});

test("key responsive interactions retain accessible sizing and native modal behavior", async () => {
  const [globals, navigation, pilotNavigation, workCenter] = await Promise.all([
    readFile(join(root, "app/globals.css"), "utf8"),
    readFile(join(root, "app/_components/access/DemoNavigation.tsx"), "utf8"),
    readFile(join(root, "app/_components/access/PilotNavigation.tsx"), "utf8"),
    readFile(join(root, "app/cong-viec/_components/WorkCenterClient.tsx"), "utf8"),
  ]);

  assert.match(globals, /--control-height:\s*2\.75rem/);
  assert.match(navigation, /scrollIntoView/);
  assert.match(pilotNavigation, /scrollIntoView/);
  assert.match(workCenter, /\.showModal\(\)/);
  assert.match(workCenter, /onCancel=/);
});
