import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config.ts";

test("production security headers are complete and exclude unsafe eval", async () => {
  assert.equal(typeof nextConfig.headers, "function");
  const rules = await nextConfig.headers();
  const headers = Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]));

  assert.equal(rules[0].source, "/:path*");
  assert.match(headers["Content-Security-Policy"], /default-src 'self'/);
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.doesNotMatch(headers["Content-Security-Policy"], /unsafe-eval/);
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Cross-Origin-Opener-Policy"], "same-origin");
  assert.equal(headers["Cross-Origin-Resource-Policy"], "same-origin");
  assert.equal(headers["Origin-Agent-Cluster"], "?1");
  assert.equal(headers["X-DNS-Prefetch-Control"], "off");
  assert.equal(headers["X-Robots-Tag"], "noindex, nofollow, noarchive");
  assert.match(headers["Strict-Transport-Security"], /max-age=63072000/);
});
