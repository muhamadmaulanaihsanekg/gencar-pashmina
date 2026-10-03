#!/usr/bin/env node
/**
 * Self-check untuk logika non-trivial di pipeline Cloudflare:
 *   - scripts/gen-api-manifest.mjs (mapping file -> URL)
 *   - worker/middleware/request-guard.ts (RBAC halaman/API)
 *
 * Jalankan: node scripts/check-cf-deploy.mjs
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT = process.cwd();
let failures = 0;

function test(name, fn) {
  try {
    fn();
    console.log("  ok  " + name);
  } catch (e) {
    failures++;
    console.error("  FAIL " + name + "\n       " + e.message);
  }
}

// ── 1. Manifest: semua route server/api terdaftar, static sebelum dynamic ──
console.log("gen-api-manifest");
const manifestPath = path.join(ROOT, "server", "generated", "api-manifest.ts");
test("manifest sudah digenerate", () => {
  assert.ok(fs.existsSync(manifestPath), "jalankan: node scripts/gen-api-manifest.mjs");
});
const manifest = fs.readFileSync(manifestPath, "utf8");
const paths = [...manifest.matchAll(/path: "([^"]+)"/g)].map((m) => m[1]);
test("manifest berisi route", () => assert.ok(paths.length > 50, "hanya " + paths.length));
test("tidak ada path duplikat", () => {
  assert.equal(new Set(paths).size, paths.length);
});
test("path dinamis memakai :param (bukan [param])", () => {
  const bad = paths.filter((p) => p.includes("[") || p.includes("]"));
  assert.deepEqual(bad, []);
});
test("route kritis terdaftar", () => {
  for (const p of ["/api/auth/login", "/api/mandiri/pilih", "/api/mandiri/hasil-rr", "/api/public/mandiri/katalog"]) {
    assert.ok(paths.includes(p), "hilang: " + p);
  }
});
test("dynamic tidak menutupi static sejenis", () => {
  // /api/mandiri/kunjungan/manual harus ada, dan /api/mandiri/kunjungan/:pemilihanId juga
  assert.ok(paths.includes("/api/mandiri/kunjungan/manual"));
  assert.ok(paths.includes("/api/mandiri/kunjungan/:pemilihanId"));
});
test("setiap file route.ts terwakili di manifest", () => {
  const walk = (d, acc = []) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, acc);
      else if (e.name === "route.ts") acc.push(p);
    }
    return acc;
  };
  const files = walk(path.join(ROOT, "server", "api"));
  assert.equal(files.length, paths.length, `file=${files.length} manifest=${paths.length}`);
});

// ── 2. Guard: helper RBAC yang dipakai request-guard harus ada & konsisten ──
console.log("request-guard");
const guard = fs.readFileSync(path.join(ROOT, "worker", "middleware", "request-guard.ts"), "utf8");
test("API ditolak dengan JSON 401, bukan redirect", () => {
  assert.ok(/isApi/.test(guard) && /c\.json\(\{ error: "Unauthorized" \}, 401\)/.test(guard));
});
test("halaman dialihkan ke /login/ (trailingSlash)", () => {
  assert.ok(/c\.redirect\("\/login\/", 302\)/.test(guard));
});
test("login & register di-rate-limit", () => {
  assert.ok(/checkRateLimit/.test(guard) && /\/api\/auth\/login/.test(guard));
});
test("scanner diblokir", () => assert.ok(/BLOCKED_UA_PATTERNS/.test(guard)));
test("guard dijalankan sebelum aset", () => {
  const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
  assert.ok(/run_worker_first\s*=\s*true/.test(toml), "run_worker_first harus true");
});
test("alias shim terdaftar", () => {
  const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
  for (const m of ['"next/server"', '"next/headers"', '"next/cache"']) {
    assert.ok(toml.includes(m), "alias hilang: " + m);
  }
});

console.log("");
if (failures) {
  console.error(`${failures} check gagal`);
  process.exit(1);
}
console.log("semua check lolos");
