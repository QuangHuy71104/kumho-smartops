import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFile(join(root, path), "utf8");

test("all product routes and enterprise documents are present", async () => {
  const required = [
    "app/page.tsx",
    "app/tai-san/page.tsx",
    "app/su-co/page.tsx",
    "app/bao-tri/page.tsx",
    "app/giam-sat/page.tsx",
    "app/tri-thuc/page.tsx",
    "app/ke-hoach/page.tsx",
    "docs/DEVELOPMENT_PLAN.md",
    "docs/ARCHITECTURE.md",
    "docs/SECURITY.md",
    "docs/API_SPEC.md",
    "docs/TEST_PLAN.md",
  ];

  await Promise.all(required.map((path) => stat(join(root, path))));
});

test("public app copy clearly identifies synthetic demo data", async () => {
  const shell = await read("app/_components/PortalShell.tsx");
  const dashboard = await read("app/page.tsx");

  assert.match(shell, /Môi trường trình diễn độc lập/);
  assert.match(shell, /không phải hệ thống chính thức/i);
  assert.match(dashboard, /dữ liệu mô phỏng/i);
});

test("app and seed data contain no literal IPv4 or MAC addresses", async () => {
  const sources = await Promise.all([
    read("lib/demo-data.ts"),
    read("app/page.tsx"),
    read("app/tai-san/AssetInventory.tsx"),
    read("app/giam-sat/MonitoringDashboard.tsx"),
  ]);
  const combined = sources.join("\n");

  assert.doesNotMatch(combined, /\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  assert.doesNotMatch(combined, /\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/i);
});

test("social preview is a real PNG asset", async () => {
  const file = await readFile(join(root, "public/og.png"));
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  assert.ok(file.subarray(0, 8).equals(pngSignature));
  assert.ok(file.length > 100_000);
});

test("Vercel and security configuration target native Next.js", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const vercel = JSON.parse(await read("vercel.json"));
  const nextConfig = await read("next.config.ts");

  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(vercel.framework, "nextjs");
  assert.match(nextConfig, /Content-Security-Policy/);
  assert.match(nextConfig, /X-Content-Type-Options/);
  assert.match(nextConfig, /Permissions-Policy/);
});
