import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

import { checkRateLimit, isTokenRevoked } from "@/lib/cache";

// ── Suspicious User-Agent Blocklist ──────────────────────────────────
const BLOCKED_UA_PATTERNS = /sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wfuzz|hydra|acunetix|nessus|openvas|nuclei/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Block malicious scanners/bots at the edge ──
  const userAgent = request.headers.get("user-agent") || "";
  if (BLOCKED_UA_PATTERNS.test(userAgent)) {
    return new NextResponse(null, { status: 403 });
  }

  // ── Reject oversized API payloads (>5MB) ──
  if (pathname.startsWith("/api/") && request.method === "POST") {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 1 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Payload terlalu besar (maks 1MB)" },
        { status: 413 }
      );
    }
  }

  // ── Allow static assets immediately ──
  if (
    pathname.startsWith("/img/") ||
    pathname.startsWith("/uploads/") ||
    /\.(png|jpe?g|svg|webp|gif|ico|woff2?|css|js|map)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const PUBLIC_PATHS = [
    "/login",
    "/register",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/desa",
    "/api/auth/kelompok",
    "/api/auth/reset-password",
    "/api/settings",
    "/api/health",
    "/api/public",
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
    "/api/download"
  ];

  // ── Rate limit sensitive auth endpoints ──
  if (pathname === "/api/auth/login" || pathname === "/api/auth/register") {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    if (!checkRateLimit(ip).success) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Silakan coba lagi setelah 1 menit." },
        { status: 429 }
      );
    }
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow public artikel, berita, and organisasi page
  if (pathname === "/" || pathname.startsWith("/artikel") || pathname.startsWith("/berita") || pathname.startsWith("/organisasi") || pathname.endsWith("/rate")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth-token")?.value;

  if (!token || isTokenRevoked(token)) {
    if (token) {
      // Clean up revoked token cookie
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("auth-token");
      return response;
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    return response;
  }

  // Broken Access Control check: Validate role existence and validity
  const VALID_ROLES = [
    "admin",
    "pengurus_daerah",
    "kmm_daerah",
    "desa",
    "kelompok",
    "generus",
    "peserta",
    "creator",
    "pending",
    "tim_pnkb",
    "admin_romantic_room",
    "admin_keuangan",
    "admin_kegiatan",
    "admin_pdkt",
    "usia_mandiri",
    "tim_pnkb_gambuh"
  ];

  if (!payload.role || !VALID_ROLES.includes(payload.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki peran yang valid" },
        { status: 403 }
      );
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    return response;
  }


  // Admin-only routes
  if (pathname.startsWith("/admin") && !["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "tim_pnkb", "admin_keuangan", "admin_kegiatan", "admin_pdkt", "tim_pnkb_gambuh"].includes(payload.role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Admin PDKT restriction - only /admin/katalog
  if (payload.role === "admin_pdkt" && !pathname.startsWith("/admin/katalog") && !pathname.startsWith("/api/auth/logout") && !pathname.startsWith("/api/profile") && !pathname.startsWith("/api/generus") && !pathname.startsWith("/api/mandiri/settings") && !pathname.startsWith("/api/mandiri/box-love") && !pathname.startsWith("/api/mandiri/kegiatan")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin/katalog", request.url));
  }

  // Usia Mandiri / Romantic Room strict restriction
  const isMandiriRoute = pathname.startsWith("/mandiri") || pathname.startsWith("/admin/katalog");
  const isMandiriApi = pathname.startsWith("/api/mandiri");

  if ((isMandiriRoute || isMandiriApi) && !(["admin", "admin_romantic_room", "admin_pdkt", "tim_pnkb_gambuh", "tim_pnkb"] as string[]).includes(payload.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Tim Gambuh strict restriction
  if (payload.role === "tim_pnkb_gambuh" &&
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
      !pathname.startsWith("/api/auth/logout")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/mandiri/tim-gambuh", request.url));
  }

  // Generus & Peserta restriction
  if ((payload.role === "generus" || payload.role === "peserta" || payload.role === "usia_mandiri") &&
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
      !PUBLIC_PATHS.some(p => pathname.startsWith(p)) &&
      pathname !== "/" && !pathname.startsWith("/artikel") && !pathname.startsWith("/berita") && !pathname.startsWith("/api/berita") && !pathname.startsWith("/api/artikel") && !pathname.startsWith("/api/upload")) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  // Pending-only restriction
  if (payload.role === "pending" &&
      !pathname.startsWith("/pending") &&
      !pathname.startsWith("/api/auth/logout") &&
      !PUBLIC_PATHS.some(p => pathname.startsWith(p)) &&
      pathname !== "/" && !pathname.startsWith("/artikel") && !pathname.startsWith("/berita")) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  // Admin Romantic Room / Tim PNKB / Admin Keuangan / Creator / Admin Kegiatan restriction
  if (["admin_romantic_room", "tim_pnkb", "admin_keuangan", "creator", "admin_kegiatan"].includes(payload.role) &&
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
      !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|img/|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
