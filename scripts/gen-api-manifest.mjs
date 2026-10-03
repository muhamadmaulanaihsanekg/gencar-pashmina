#!/usr/bin/env node
/**
 * Generate server/generated/api-manifest.ts dari struktur server/api/**\/route.ts.
 *
 * Worker tidak punya import.meta.glob, jadi daftar route harus statis agar esbuild
 * bisa menelusuri seluruh import. Jalankan ulang setiap kali route ditambah/hapus:
 *   node scripts/gen-api-manifest.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "server", "api");
const OUT = path.join(ROOT, "server", "generated", "api-manifest.ts");

/** Ubah path file jadi URL pattern Hono: [id] -> :id, (group) dibuang. */
function toUrlPath(rel) {
  // rel contoh: "mandiri/kunjungan/[pemilihanId]/route.ts"
  const parts = rel.split(path.sep).filter((p) => p !== "route.ts");
  const mapped = parts.map((p) => {
    if (/^\(.*\)$/.test(p)) return null; // route group Next -> tidak masuk URL
    // Catch-all Next [...key] -> Hono regex param yang menangkap sisa path (termasuk '/')
    const catchAll = p.match(/^\[\.\.\.(.+)\]$/);
    if (catchAll) return ":" + catchAll[1] + "{.+}";
    const dyn = p.match(/^\[(?:\.\.\.)?(.+)\]$/);
    if (dyn) return ":" + dyn[1];
    return p;
  }).filter(Boolean);
  return "/api" + (mapped.length ? "/" + mapped.join("/") : "");
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name === "route.ts") acc.push(p);
  }
  return acc;
}

const files = walk(API_DIR).sort();
const entries = [];
const seen = new Map();

for (const f of files) {
  const rel = path.relative(API_DIR, f);
  const urlPath = toUrlPath(rel);
  const importPath = "../api/" + rel.split(path.sep).join("/").replace(/\.ts$/, "");
  const varName = "m" + entries.length;

  if (seen.has(urlPath)) {
    console.error(`[gen-api-manifest] DUPLIKAT path: ${urlPath}\n  ${seen.get(urlPath)}\n  ${f}`);
    process.exitCode = 1;
  }
  seen.set(urlPath, f);
  entries.push({ urlPath, importPath, varName });
}

const lines = [];
lines.push("// AUTO-GENERATED oleh scripts/gen-api-manifest.mjs — jangan edit manual.");
lines.push("// Jalankan: node scripts/gen-api-manifest.mjs");
lines.push("");
for (const e of entries) {
  lines.push(`import * as ${e.varName} from "${e.importPath}";`);
}
lines.push("");
lines.push("export type ApiRouteModule = Record<string, unknown>;");
lines.push("");
lines.push("export const apiRoutes: { path: string; mod: ApiRouteModule }[] = [");
for (const e of entries) {
  lines.push(`  { path: ${JSON.stringify(e.urlPath)}, mod: ${e.varName} as unknown as ApiRouteModule },`);
}
lines.push("];");
lines.push("");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join("\n"));
console.log(`[gen-api-manifest] ${entries.length} route -> ${path.relative(ROOT, OUT)}`);
