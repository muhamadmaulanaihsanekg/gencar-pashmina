/**
 * Guard request — port dari middleware.ts Next.js.
 *
 * Static export tidak menjalankan middleware Next, jadi logika ini (blokir
 * scanner, rate-limit login, dan RBAC halaman/API) harus hidup di Worker.
 * Dipasang sebelum handler apa pun, termasuk sebelum aset statis dilayani.
 */
import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { verifyToken, type JWTPayload } from "./auth";
import { checkRateLimit, isTokenRevoked } from "../../lib/cache";

type GuardEnv = { Bindings: { JWT_SECRET: string }; Variables: { user?: JWTPayload } };

const BLOCKED_UA_PATTERNS = /sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wfuzz|hydra|acunetix|nessus|openvas|nuclei/i;

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/desa",
  "/api/auth/kelompok",
  "/api/auth/reset-password",
  "/api/settings",
  "/api/public",
  "/api/health",
  "/api/sholat",
  "/mandiri/katalog",
  "/mandiri/daftar",
  "/mandiri/romantic-room-tv",
  "/mandiri/daftar-tim-gambuh",
  "/mandiri/daftar-tim-penunggu",
  "/mandiri/daftar-wilayah",
  "/api/mandiri/pilih",
  "/api/mandiri/komentar",
  "/api/mandiri/box-love",
  "/api/mandiri/rooms",
  "/api/mandiri/hasil-rr",
  "/api/webhook/fonnte",
  "/api/upload",
  "/api/download",
];

const VALID_ROLES = [
  "admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "generus",
  "peserta", "creator", "pending", "tim_pnkb", "admin_romantic_room",
  "admin_keuangan", "admin_kegiatan", "admin_pdkt", "usia_mandiri", "tim_pnkb_gambuh",
];

const isPublic = (pathname: string) => PUBLIC_PATHS.some((p) => pathname.startsWith(p));

const isAsset = (pathname: string) =>
  pathname.startsWith("/img/") ||
  pathname.startsWith("/uploads/") ||
  pathname.startsWith("/_next/") ||
  /\.(png|jpe?g|svg|webp|gif|ico|woff2?|css|js|map|txt|json)$/i.test(pathname);

/** Redirect halaman ke /login (API tetap 401 JSON). */
function deny(c: Context<GuardEnv>, pathname: string, redirectTo: string, message = "Unauthorized") {
  if (pathname.startsWith("/api/")) {
    return c.json({ error: message }, 401);
  }
  return c.redirect(redirectTo.endsWith("/") ? redirectTo : redirectTo + "/", 302);
}

export async function requestGuard(c: Context<GuardEnv>, next: Next) {
  const pathname = new URL(c.req.url).pathname;

  const ua = c.req.header("user-agent") || "";
  if (BLOCKED_UA_PATTERNS.test(ua)) return c.body(null, 403);

  // Payload besar (>1MB) ditolak lebih awal untuk POST API.
  if (pathname.startsWith("/api/") && c.req.method === "POST") {
    const len = Number(c.req.header("content-length") || 0);
    if (len > 1024 * 1024) return c.json({ error: "Payload terlalu besar (maks 1MB)" }, 413);
  }

  if (isAsset(pathname)) return next();

  if (pathname === "/api/auth/login" || pathname === "/api/auth/register") {
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    if (!checkRateLimit(ip).success) {
      return c.json({ error: "Terlalu banyak percobaan. Silakan coba lagi setelah 1 menit." }, 429);
    }
  }

  if (isPublic(pathname)) return next();

  if (
    pathname === "/" ||
    pathname.startsWith("/artikel") ||
    pathname.startsWith("/berita") ||
    pathname.startsWith("/organisasi") ||
    pathname.endsWith("/rate")
  ) {
    return next();
  }

  const token = getCookie(c, "auth-token") || getCookie(c, "session");
  const isApi = pathname.startsWith("/api/");
  if (!token || isTokenRevoked(token)) {
    if (isApi) return c.json({ error: "Unauthorized" }, 401);
    setCookie(c, "auth-token", "", { path: "/", maxAge: 0 });
    return c.redirect("/login/", 302);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    if (isApi) return c.json({ error: "Unauthorized" }, 401);
    setCookie(c, "auth-token", "", { path: "/", maxAge: 0 });
    return c.redirect("/login/", 302);
  }

  c.set("user", payload as JWTPayload);
  const role = payload.role;

  if (!role || !VALID_ROLES.includes(role)) {
    return deny(c, pathname, "/login", "Forbidden: Akun Anda tidak memiliki peran yang valid");
  }

  if (
    pathname.startsWith("/admin") &&
    !["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "tim_pnkb", "admin_keuangan", "admin_kegiatan", "admin_pdkt", "tim_pnkb_gambuh"].includes(role)
  ) {
    return deny(c, pathname, "/dashboard");
  }

  if (
    role === "admin_pdkt" &&
    !pathname.startsWith("/admin/katalog") &&
    !pathname.startsWith("/api/auth/logout") &&
    !pathname.startsWith("/api/profile") &&
    !pathname.startsWith("/api/generus") &&
    !pathname.startsWith("/api/mandiri/settings") &&
    !pathname.startsWith("/api/mandiri/box-love") &&
    !pathname.startsWith("/api/mandiri/kegiatan")
  ) {
    return deny(c, pathname, "/admin/katalog", "Forbidden");
  }

  const isMandiriRoute = pathname.startsWith("/mandiri") || pathname.startsWith("/admin/katalog");
  const isMandiriApi = pathname.startsWith("/api/mandiri");
  if (
    (isMandiriRoute || isMandiriApi) &&
    !["admin", "admin_romantic_room", "admin_pdkt", "tim_pnkb_gambuh", "tim_pnkb"].includes(role)
  ) {
    return deny(c, pathname, "/dashboard", "Forbidden");
  }

  if (
    role === "tim_pnkb_gambuh" &&
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/mandiri") &&
    !pathname.startsWith("/admin/katalog") &&
    !pathname.startsWith("/tim-gambuh/katalog") &&
    !pathname.startsWith("/api/public/mandiri") &&
    !pathname.startsWith("/api/mandiri") &&
    !pathname.startsWith("/api/profile") &&
    !pathname.startsWith("/profile") &&
    !pathname.startsWith("/api/admin/tim-gambuh") &&
    !pathname.startsWith("/api/admin/tim-penunggu") &&
    !pathname.startsWith("/api/mandiri/settings") &&
    !pathname.startsWith("/api/generus/filters") &&
    !pathname.startsWith("/api/generus") &&
    !pathname.startsWith("/api/auth/logout")
  ) {
    return deny(c, pathname, "/mandiri/tim-gambuh", "Forbidden");
  }

  if (
    ["generus", "peserta", "usia_mandiri"].includes(role) &&
    !pathname.startsWith("/profile") &&
    !pathname.startsWith("/katalog") &&
    !pathname.startsWith("/mandiri") &&
    !pathname.startsWith("/api/profile") &&
    !pathname.startsWith("/api/mandiri") &&
    !pathname.startsWith("/api/auth/logout") &&
    !pathname.startsWith("/api/generus") &&
    !pathname.startsWith("/rab") &&
    !pathname.startsWith("/api/rab") &&
    !pathname.startsWith("/rundown") &&
    !pathname.startsWith("/api/rundown") &&
    !pathname.startsWith("/scan") &&
    !pathname.startsWith("/hadir") &&
    !isPublic(pathname) &&
    pathname !== "/" &&
    !pathname.startsWith("/artikel") &&
    !pathname.startsWith("/berita") &&
    !pathname.startsWith("/api/berita") &&
    !pathname.startsWith("/api/artikel") &&
    !pathname.startsWith("/api/upload")
  ) {
    return deny(c, pathname, "/profile");
  }

  if (
    role === "pending" &&
    !pathname.startsWith("/pending") &&
    !pathname.startsWith("/api/auth/logout") &&
    !isPublic(pathname) &&
    pathname !== "/" &&
    !pathname.startsWith("/artikel") &&
    !pathname.startsWith("/berita")
  ) {
    return deny(c, pathname, "/pending");
  }

  if (
    ["admin_romantic_room", "tim_pnkb", "admin_keuangan", "creator", "admin_kegiatan"].includes(role) &&
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/mandiri") &&
    !pathname.startsWith("/katalog") &&
    !pathname.startsWith("/admin/katalog") &&
    !pathname.startsWith("/admin/anggaran") &&
    !pathname.startsWith("/admin/tim-gambuh") &&
    !pathname.startsWith("/admin/tim-penunggu") &&
    !pathname.startsWith("/api/admin/tim-gambuh") &&
    !pathname.startsWith("/api/admin/tim-penunggu") &&
    !pathname.startsWith("/api/mandiri") &&
    !pathname.startsWith("/api/generus") &&
    !pathname.startsWith("/api/profile") &&
    !pathname.startsWith("/profile") &&
    !pathname.startsWith("/generus") &&
    !pathname.startsWith("/kegiatan") &&
    !pathname.startsWith("/rab") &&
    !pathname.startsWith("/api/rab") &&
    !pathname.startsWith("/rundown") &&
    !pathname.startsWith("/api/rundown") &&
    !pathname.startsWith("/api/kegiatan") &&
    !pathname.startsWith("/api/berita") &&
    !pathname.startsWith("/api/artikel") &&
    !pathname.startsWith("/api/scanner") &&
    !pathname.startsWith("/api/upload") &&
    !pathname.startsWith("/api/auth/logout") &&
    !isPublic(pathname)
  ) {
    return deny(c, pathname, "/dashboard");
  }

  return next();
}
