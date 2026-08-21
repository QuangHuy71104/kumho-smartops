import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { PORTAL_ROUTES } from "../lib/access-control.ts";

const root = process.cwd();
const read = (path) => readFile(join(root, path), "utf8");
const execFileAsync = promisify(execFile);

const routes = [
  ["app/page.tsx", "/"],
  ["app/don-hang/page.tsx", "/don-hang"],
  ["app/dieu-phoi/page.tsx", "/dieu-phoi"],
  ["app/doi-xe/page.tsx", "/doi-xe"],
  ["app/tai-xe/page.tsx", "/tai-xe"],
  ["app/ve-xe/page.tsx", "/ve-xe"],
  ["app/hop-dong/page.tsx", "/hop-dong"],
  ["app/khach-hang/page.tsx", "/khach-hang"],
  ["app/bao-duong/page.tsx", "/bao-duong"],
  ["app/tai-chinh/page.tsx", "/tai-chinh"],
  ["app/bao-cao/page.tsx", "/bao-cao"],
];

async function collectSourceFiles(directory) {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const relativePath = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(relativePath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [relativePath] : [];
  }));
  return nested.flat();
}

test("all transport product routes and enterprise documents are present", async () => {
  const required = [
    ...routes.map(([path]) => path),
    "docs/DEVELOPMENT_PLAN.md",
    "docs/ENTERPRISE_BLUEPRINT.md",
    "docs/RBAC_MATRIX.md",
    "docs/ARCHITECTURE.md",
    "docs/SECURITY.md",
    "docs/API_SPEC.md",
    "docs/TEST_PLAN.md",
  ];
  await Promise.all(required.map((path) => stat(join(root, path))));
});

test("public copy identifies the transport scope and synthetic data", async () => {
  const shell = await read("app/_components/PortalShell.tsx");
  const dashboard = await read("app/_components/dashboard/DashboardOverview.tsx");
  const readme = await read("README.md");

  assert.match(shell, /Transport Control/);
  assert.match(shell, /MOCK DATA/);
  assert.match(shell, /không phải hệ thống chính thức/i);
  assert.match(dashboard, /Điều phối mọi chuyến đi/);
  assert.match(readme, /đội xe, tài xế, đơn vận chuyển hàng hóa/i);
});

test("app and synthetic fixtures contain no literal infrastructure or contact identifiers", async () => {
  const sourcePaths = [
    ...(await collectSourceFiles("app")),
    ...(await collectSourceFiles("lib")),
  ];
  const combined = (await Promise.all(sourcePaths.map(read))).join("\n");

  assert.doesNotMatch(combined, /\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  assert.doesNotMatch(combined, /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/i);
  assert.doesNotMatch(combined, /\b0\d{9,10}\b/);
  assert.doesNotMatch(combined, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
});

test("legacy IT product routes and terminology are removed", async () => {
  const legacyDirectories = ["tai-san", "su-co", "bao-tri", "giam-sat", "tri-thuc", "ke-hoach"];
  await Promise.all(legacyDirectories.map((name) => assert.rejects(stat(join(root, "app", name, "page.tsx")))));

  const paths = [
    ...(await collectSourceFiles("app")),
    ...(await collectSourceFiles("lib")),
    "README.md",
    "docs/ARCHITECTURE.md",
    "docs/DEVELOPMENT_PLAN.md",
  ];
  const combined = (await Promise.all(paths.map(read))).join("\n");
  assert.doesNotMatch(combined, /IT Service Hub|Trung tâm điều hành IT|CMDB\/tài sản CNTT/i);
  assert.doesNotMatch(combined, /\/tai-san|\/su-co|\/bao-tri|\/giam-sat|\/tri-thuc|\/ke-hoach/);
});

test("all product pages compose the shared shell with the expected active route", async () => {
  const pages = await Promise.all(routes.map(([path]) => read(path)));
  pages.forEach((source, index) => {
    const [path, activePath] = routes[index];
    assert.match(source, /PortalShell/, `${path} must compose PortalShell`);
    assert.match(source, new RegExp(`activePath=["']${activePath.replaceAll("/", "\\/")}["']`));
  });
});

test("portal navigation exposes every transport module exactly once", async () => {
  const navigation = await read("app/_components/access/DemoNavigation.tsx");
  assert.deepEqual(PORTAL_ROUTES.map((route) => route.path), routes.map(([, href]) => href));
  assert.equal(new Set(PORTAL_ROUTES.map((route) => route.path)).size, routes.length);
  assert.deepEqual(
    PORTAL_ROUTES.map((route) => route.label),
    ["Tổng quan", "Đơn hàng", "Điều phối", "Đội xe", "Tài xế", "Vé hành khách", "Hợp đồng xe", "Khách hàng", "Bảo dưỡng", "Tài chính", "Báo cáo"],
  );
  assert.match(navigation, /PORTAL_ROUTES\.filter/);
  assert.match(navigation, /section\.routes\.map/);
});

test("social preview is a real, transport-specific PNG", async () => {
  const file = await readFile(join(root, "public/og.png"));
  const layout = await read("app/layout.tsx");
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  assert.ok(file.subarray(0, 8).equals(pngSignature));
  assert.ok(file.length > 500_000);
  assert.match(layout, /KSOps — Transport Control/);
  assert.match(layout, /1659/);
  assert.match(layout, /948/);
});

test("Vercel and security configuration target native Next.js", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const vercel = JSON.parse(await read("vercel.json"));
  const nextConfig = await read("next.config.ts");
  const layout = await read("app/layout.tsx");

  assert.equal(packageJson.name, "ksops-transport-control-demo");
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.engines.node, "22.x");
  assert.equal(vercel.framework, "nextjs");
  assert.match(nextConfig, /Content-Security-Policy/);
  assert.match(nextConfig, /Permissions-Policy/);
  assert.match(layout, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.doesNotMatch(layout, /next\/headers/);
});

test("tracked source excludes documents, secrets, keys and database dumps", async () => {
  const { stdout } = await execFileAsync("git", ["ls-files"], { cwd: root });
  const tracked = stdout.split(/\r?\n/).filter(Boolean);
  const forbidden = tracked.filter((path) => /(^|\/)\.env($|\.)|\.(?:docx?|pdf|p12|pfx|key|crt|dump|sqlite3?|db)$/i.test(path));
  assert.deepEqual(forbidden, []);
});

test("unused Tailwind pipeline remains absent", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  assert.equal(dependencies.tailwindcss, undefined);
  assert.equal(dependencies["@tailwindcss/postcss"], undefined);
  await assert.rejects(stat(join(root, "postcss.config.mjs")));
});
