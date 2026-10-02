"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import DashboardFilter from "@/components/mandiri/DashboardFilter";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = searchParams ? searchParams.toString() : "";
    fetch("/api/dashboard" + (q ? "?" + q : ""))
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard fetch error:", err);
        setLoading(false);
      });
  }, [searchParams]);

  if (loading) {
    return (
      <div className="page-content" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        Memuat data dashboard...
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="page-content" style={{ padding: "40px", textAlign: "center", color: "#dc2626" }}>
        {data?.error || "Gagal memuat data dashboard. Silakan refresh atau login kembali."}
      </div>
    );
  }

  const { session, stats, cities = [], villages = [], groups = [] } = data;
  const userFoto = data.userFoto || "";

  const isUser = session?.role === "generus" || session?.role === "creator";

  const displayName =
    session?.role === "tim_pnkb_gambuh"
      ? "Tim PNKB & Ibu Gambuh"
      : session?.name || "??";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Selamat Pagi"
      : hour < 15
        ? "Selamat Siang"
        : hour < 18
          ? "Selamat Sore"
          : "Selamat Malam";

  return (
    <div>
      <Topbar
        title={isUser ? "Dashboard User" : "Dashboard Admin"}
        role={session?.role || "kelompok"}
        userName={session?.name}
      />

      <div className="page-content">
        {/* Hero Welcome Banner */}
        <div className="db-hero-banner">
          <div className="db-hero-content">
            <div className="db-hero-greeting">{greeting} 👋</div>
            <h1 className="db-hero-name">{displayName}</h1>
            <p className="db-hero-subtitle">
              {isUser
                ? "Berikut ringkasan profil dan aktivitas Anda hari ini"
                : "Selamat datang di Portal Pashmina 8.0. Berikut ringkasan data kegiatan Ta'aruf & Usia Mandiri."}
            </p>
            <div className="db-hero-pills">
              <span className="db-hero-pill">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="db-hero-pill db-hero-pill-role">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {session?.role?.replace(/_/g, " ") || "User"}
              </span>
            </div>
          </div>
          <div className="db-hero-visual">
            <div className="db-hero-circle db-hero-circle-1"></div>
            <div className="db-hero-circle db-hero-circle-2"></div>
            <div className="db-hero-circle db-hero-circle-3"></div>
            <div className="db-hero-avatar">
              {userFoto ? (
                <img
                  src={userFoto}
                  alt={displayName}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </div>
        </div>

        {isUser ? (
          <UserDashboard session={session} stats={stats} />
        ) : (
          <AdminDashboard
            role={session?.role || "kelompok"}
            stats={stats}
            cities={cities}
            villages={villages}
            groups={groups}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Attendance Chart ─────────────────── */
function AttendanceChart({
  label,
  present,
  absent,
  pulang = 0,
  hadirLaki = 0,
  hadirPerempuan = 0,
  terdaftarLaki = 0,
  terdaftarPerempuan = 0,
  color = "#10b981",
  large = false,
}: {
  label: string;
  present: number;
  absent: number;
  pulang?: number;
  hadirLaki?: number;
  hadirPerempuan?: number;
  terdaftarLaki?: number;
  terdaftarPerempuan?: number;
  color?: string;
  large?: boolean;
}) {
  const total = present + absent + pulang;
  const presentPercent = total > 0 ? (present / total) * 100 : 0;

  return (
    <div className="db-attendance-card">
      <div className="db-attendance-header" style={large ? { marginBottom: "24px" } : {}}>
        <div className="db-attendance-title" style={large ? { fontSize: "16px" } : {}}>
          <div
            className="db-attendance-dot"
            style={{ background: color, ...(large ? { width: "12px", height: "12px" } : {}) }}
          ></div>
          Kehadiran {label}
        </div>
        <div
          className="db-attendance-badge"
          style={{ color, background: `${color}18`, ...(large ? { fontSize: "13px", padding: "6px 16px" } : {}) }}
        >
          {Math.round(presentPercent)}% hadir
        </div>
      </div>
      <div className="db-attendance-body" style={large ? { gap: "32px", padding: "10px 0" } : {}}>
        <div className="db-attendance-chart" style={large ? { width: "130px", height: "130px" } : {}}>
          <svg
            viewBox="0 0 36 36"
            style={{
              width: "100%",
              height: "100%",
              transform: "rotate(-90deg)",
            }}
          >
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke="var(--border)"
              strokeWidth="3"
            ></circle>
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke={color}
              strokeWidth="3.5"
              strokeDasharray={`${presentPercent} ${100 - presentPercent}`}
              strokeDashoffset="0"
              style={{
                transition: "stroke-dasharray 0.8s ease",
                strokeLinecap: "round",
              }}
            ></circle>
          </svg>
          <div className="db-attendance-center">
            <div className="db-attendance-pct" style={{ color, ...(large ? { fontSize: "22px" } : {}) }}>
              {Math.round(presentPercent)}%
            </div>
          </div>
        </div>
        <div className="db-attendance-stats" style={large ? { gap: "16px" } : {}}>
          <div className="db-attendance-stat">
            <div
              className="db-attendance-stat-dot"
              style={{ background: color, ...(large ? { width: "10px", height: "10px" } : {}) }}
            ></div>
            <div className="db-attendance-stat-info">
              <span style={large ? { fontSize: "14px" } : {}}>Hadir</span>
              <strong style={{ color, ...(large ? { fontSize: "18px" } : {}) }}>{present}</strong>
            </div>
          </div>
          <div className="db-attendance-stat">
            <div
              className="db-attendance-stat-dot"
              style={{ background: "#ef4444", ...(large ? { width: "10px", height: "10px" } : {}) }}
            ></div>
            <div className="db-attendance-stat-info">
              <span style={large ? { fontSize: "14px" } : {}}>Tidak Hadir</span>
              <strong style={{ color: "#ef4444", ...(large ? { fontSize: "18px" } : {}) }}>{absent}</strong>
            </div>
          </div>
          <div className="db-attendance-stat">
            <div
              className="db-attendance-stat-dot"
              style={{ background: "#f59e0b", ...(large ? { width: "10px", height: "10px" } : {}) }}
            ></div>
            <div className="db-attendance-stat-info">
              <span style={large ? { fontSize: "14px" } : {}}>Total Pulang</span>
              <strong style={{ color: "#f59e0b", ...(large ? { fontSize: "18px" } : {}) }}>{pulang}</strong>
            </div>
          </div>
          <div className="db-attendance-stat">
            <div
              className="db-attendance-stat-dot"
              style={{ background: "#3b82f6", ...(large ? { width: "10px", height: "10px" } : {}) }}
            ></div>
            <div className="db-attendance-stat-info">
              <span style={large ? { fontSize: "14px" } : {}}>Hadir Laki-laki</span>
              <strong style={{ color: "#3b82f6", ...(large ? { fontSize: "18px" } : {}) }}>{hadirLaki}</strong>
            </div>
          </div>
          <div className="db-attendance-stat">
            <div
              className="db-attendance-stat-dot"
              style={{ background: "#ec4899", ...(large ? { width: "10px", height: "10px" } : {}) }}
            ></div>
            <div className="db-attendance-stat-info">
              <span style={large ? { fontSize: "14px" } : {}}>Hadir Perempuan</span>
              <strong style={{ color: "#ec4899", ...(large ? { fontSize: "18px" } : {}) }}>{hadirPerempuan}</strong>
            </div>
          </div>
          <div className="db-attendance-stat">
            <div
              className="db-attendance-stat-dot"
              style={{ background: "#3b82f6", opacity: 0.5, ...(large ? { width: "10px", height: "10px" } : {}) }}
            ></div>
            <div className="db-attendance-stat-info">
              <span style={large ? { fontSize: "14px" } : {}}>Terdaftar Laki-laki</span>
              <strong style={{ color: "#3b82f6", opacity: 0.7, ...(large ? { fontSize: "18px" } : {}) }}>{terdaftarLaki}</strong>
            </div>
          </div>
          <div className="db-attendance-stat">
            <div
              className="db-attendance-stat-dot"
              style={{ background: "#ec4899", opacity: 0.5, ...(large ? { width: "10px", height: "10px" } : {}) }}
            ></div>
            <div className="db-attendance-stat-info">
              <span style={large ? { fontSize: "14px" } : {}}>Terdaftar Perempuan</span>
              <strong style={{ color: "#ec4899", opacity: 0.7, ...(large ? { fontSize: "18px" } : {}) }}>{terdaftarPerempuan}</strong>
            </div>
          </div>
          <div className="db-attendance-total">
            <span>Total Terdaftar</span>
            <strong>{total}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Dashboard ─────────────────── */
function AdminDashboard({
  role,
  stats,
  cities,
  villages,
  groups,
}: {
  role: string;
  stats: any;
  cities?: any[];
  villages?: any[];
  groups?: any[];
}) {
  return (
    <div>
      <DashboardFilter
        cities={cities || []}
        villages={villages || []}
        groups={groups || []}
      />

      <div
        style={{
          marginBottom: "1.5rem",
          padding: "1.25rem 1.5rem",
          borderRadius: "1rem",
          background: "linear-gradient(135deg, #17241b 0%, #26392d 100%)",
          border: "1px solid rgba(197, 160, 89, 0.35)",
          boxShadow: "0 8px 24px -4px rgba(23, 36, 27, 0.2)",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          color: "#faf7f2",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "rgba(197, 160, 89, 0.2)",
            border: "1px solid rgba(197, 160, 89, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#dfc288",
            flexShrink: 0,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#dfc288",
            }}
          >
            Kegiatan Mandiri Aktif
          </div>
          <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            {stats?.activeKegiatanTitle || "Tidak Ada Kegiatan Aktif"}
          </div>
        </div>
      </div>

      {/* GRAFIK KEHADIRAN */}
      <div className="db-section-header">
        <div
          className="db-section-icon"
          style={{ background: "linear-gradient(135deg, #26392d, #3d5a45)", border: "1px solid rgba(197, 160, 89, 0.35)", color: "#dfc288" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="16 12 12 8 8 12" />
            <line x1="12" y1="16" x2="12" y2="8" />
          </svg>
        </div>
        <div>
          <h2 className="db-section-title">Grafik Kehadiran</h2>
          <p className="db-section-sub">
            Visualisasi kehadiran peserta dan panitia kegiatan Ta'aruf
          </p>
        </div>
      </div>
      <div className="db-charts-grid" style={{ marginBottom: "2rem" }}>
        <AttendanceChart
          label="Peserta"
          present={stats?.mandiriHadirPeserta ?? 0}
          absent={stats?.mandiriTidakHadirPeserta ?? 0}
          pulang={stats?.mandiriPulangPeserta ?? 0}
          hadirLaki={stats?.mandiriHadirLaki ?? 0}
          hadirPerempuan={stats?.mandiriHadirPerempuan ?? 0}
          terdaftarLaki={stats?.mandiriTerdaftarPesertaLaki ?? 0}
          terdaftarPerempuan={stats?.mandiriTerdaftarPesertaPerempuan ?? 0}
          color="#3b82f6"
          large={true}
        />
        <AttendanceChart
          label="Panitia"
          present={stats?.mandiriHadirPanitia ?? 0}
          absent={stats?.mandiriTidakHadirPanitia ?? 0}
          pulang={stats?.mandiriPulangPanitia ?? 0}
          hadirLaki={stats?.mandiriHadirPanitiaLaki ?? 0}
          hadirPerempuan={stats?.mandiriHadirPanitiaPerempuan ?? 0}
          terdaftarLaki={stats?.mandiriTerdaftarPanitiaLaki ?? 0}
          terdaftarPerempuan={stats?.mandiriTerdaftarPanitiaPerempuan ?? 0}
          color="#10b981"
          large={true}
        />
      </div>

      <div className="db-section-header">
        <div
          className="db-section-icon"
          style={{ background: "linear-gradient(135deg, #26392d, #3d5a45)", border: "1px solid rgba(197, 160, 89, 0.35)", color: "#dfc288" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div>
          <h2 className="db-section-title">Kehadiran Mandiri</h2>
          <p className="db-section-sub">
            Ringkasan kehadiran peserta & panitia
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: "2rem" }}>
        <StatCard
          icon="check-square"
          color="blue"
          label="Total Hadir Peserta"
          value={stats?.mandiriHadirPeserta ?? 0}
          href="/mandiri/absensi"
        />
        <StatCard
          icon="user-check"
          color="indigo"
          label="Peserta Ikhwan (L)"
          value={stats?.mandiriHadirLaki ?? 0}
          href="/mandiri/absensi"
        />
        <StatCard
          icon="user-check"
          color="pink"
          label="Peserta Akhwat (P)"
          value={stats?.mandiriHadirPerempuan ?? 0}
          href="/mandiri/absensi"
        />
        <StatCard
          icon="users"
          color="emerald"
          label="Total Hadir Panitia"
          value={stats?.mandiriHadirPanitia ?? 0}
          href="/mandiri/absensi"
        />
        <StatCard
          icon="user-check"
          color="indigo"
          label="Panitia Ikhwan (L)"
          value={stats?.mandiriHadirPanitiaLaki ?? 0}
          href="/mandiri/absensi"
        />
        <StatCard
          icon="user-check"
          color="pink"
          label="Panitia Akhwat (P)"
          value={stats?.mandiriHadirPanitiaPerempuan ?? 0}
          href="/mandiri/absensi"
        />
      </div>

      <div className="db-section-header">
        <div
          className="db-section-icon"
          style={{ background: "linear-gradient(135deg, #8c6d3b, #c5a059)", border: "1px solid rgba(197, 160, 89, 0.4)", color: "#ffffff" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <div>
          <h2 className="db-section-title">Hasil Pertemuan Romantic Room</h2>
          <p className="db-section-sub">
            Rekap keputusan pertemuan ta'aruf
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: "2rem" }}>
        <StatCard
          icon="check-square"
          color="pink"
          label="Total Pertemuan Selesai"
          value={stats?.sessionStats?.totalSelesai ?? 0}
          href="/mandiri/romantic-room"
        />
        <StatCard
          icon="heart"
          color="emerald"
          label="Lanjut — Lanjut"
          value={stats?.sessionStats?.lanjutLanjut ?? 0}
          href="/mandiri/romantic-room"
        />
        <StatCard
          icon="heart-off"
          color="red"
          label="Tidak — Tidak"
          value={stats?.sessionStats?.tidakTidak ?? 0}
          href="/mandiri/romantic-room"
        />
        <StatCard
          icon="help-circle"
          color="indigo"
          label="Ragu — Ragu"
          value={stats?.sessionStats?.raguRagu ?? 0}
          href="/mandiri/romantic-room"
        />
        <StatCard
          icon="shuffle"
          color="orange"
          label="Lanjut — Tidak"
          value={stats?.sessionStats?.lanjutTidak ?? 0}
          href="/mandiri/romantic-room"
        />
        <StatCard
          icon="shuffle"
          color="blue"
          label="Lanjut — Ragu"
          value={stats?.sessionStats?.lanjutRagu ?? 0}
          href="/mandiri/romantic-room"
        />
        <StatCard
          icon="shuffle"
          color="gray"
          label="Tidak — Ragu"
          value={stats?.sessionStats?.tidakRagu ?? 0}
          href="/mandiri/romantic-room"
        />
      </div>

      {/* Akses Cepat Menu Ta'aruf */}
      <div className="db-section-header">
        <div
          className="db-section-icon"
          style={{ background: "linear-gradient(135deg, #26392d, #3d5a45)", border: "1px solid rgba(197, 160, 89, 0.35)", color: "#dfc288" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div>
          <h2 className="db-section-title">Akses Cepat Modul Ta'aruf</h2>
          <p className="db-section-sub">
            Pintasan cepat ke layanan operasional
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: "2rem" }}>
        <StatCard
          icon="users"
          color="green"
          label="Registrasi Peserta"
          value="Kelola"
          href="/mandiri"
        />
        <StatCard
          icon="users"
          color="purple"
          label="Katalog Peserta"
          value="Lihat"
          href="/admin/katalog"
        />
        <StatCard
          icon="heart"
          color="pink"
          label="Romantic Room"
          value="Kelola"
          href="/mandiri/romantic-room"
        />
        <StatCard
          icon="check-square"
          color="blue"
          label="Absensi Mandiri"
          value="Kelola"
          href="/mandiri/absensi"
        />
      </div>
    </div>
  );
}

/* ─── User Dashboard ─────────────────── */
function UserDashboard({ session, stats }: { session: any; stats: any }) {
  const isCreatorOrGenerus =
    session?.role === "creator" || session?.role === "generus";
  return (
    <div className={isCreatorOrGenerus ? "responsive-grid-2" : ""}>
      {/* Member Card */}
      <div className="db-member-card">
        <div className="db-member-avatar">
          {(session?.name || "U").charAt(0).toUpperCase()}
        </div>
        <div className="db-member-info">
          <h3 className="db-member-name">{session?.name || "User"}</h3>
          <div className="db-member-email">{session?.email || "-"}</div>
          <span className="badge badge-blue db-member-role">
            {session?.role?.replace(/_/g, " ") || "-"}
          </span>
        </div>
        <a
          href="/profile"
          className="btn btn-primary btn-full"
          style={{ marginTop: "20px" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: 6 }}
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Buka Profil & Barcode QR
        </a>
      </div>

      {isCreatorOrGenerus && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Ringkasan Aktivitas</span>
          </div>
          <div className="card-body">
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {session?.role !== "creator" && (
                <div className="db-activity-row">
                  <div
                    className="db-activity-icon"
                    style={{ background: "#eff6ff", color: "#2563eb" }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <span className="db-activity-label">Total Kegiatan</span>
                  <span
                    className="badge badge-green"
                    style={{ fontWeight: 800 }}
                  >
                    {stats?.kegiatan ?? 0}
                  </span>
                </div>
              )}
              {session?.role === "creator" && (
                <>
                  <div style={{ marginTop: 8 }}>
                    <a
                      href="/mandiri/katalog"
                      className="btn btn-secondary btn-full"
                    >
                      Buka Katalog Mandiri
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ─────────────────── */
function StatCard({
  icon,
  color,
  label,
  href,
  value,
  gradient,
}: {
  icon: string;
  color: string;
  label: string;
  href: string;
  value: number | string;
  gradient?: string;
}) {
  const iconSvgs: Record<string, React.ReactNode> = {
    users: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    calendar: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    "file-text": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    heart: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    "heart-off": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M2 2l20 20M19.5 13.5L21 12l-1.06-1.06a5.5 5.5 0 0 0-7.78-7.78l-1.06 1.06M9 3.13a5.5 5.5 0 0 0-5.83 5.48c0 .32.03.63.08.93l1.06 1.06L12 21.23l2.5-2.5" />
      </svg>
    ),
    school: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    "book-open": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    "graduation-cap": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    briefcase: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    "check-square": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    "user-check": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <polyline points="17 11 19 13 23 9" />
      </svg>
    ),
    "help-circle": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    shuffle: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    ),
  };

  return (
    <a
      href={href}
      className="stat-card premium-stat-card"
      style={{
        textDecoration: "none",
        display: "flex",
        background: gradient ? gradient : "var(--bg-card)",
        color: gradient ? "white" : "inherit",
      }}
    >
      <div
        className={`stat-icon ${color}`}
        style={{
          background: gradient ? "rgba(255,255,255,0.2)" : undefined,
          color: gradient ? "white" : undefined,
          backdropFilter: gradient ? "blur(4px)" : undefined,
        }}
      >
        {iconSvgs[icon]}
      </div>
      <div>
        <div
          className="stat-value"
          style={{ color: gradient ? "white" : undefined }}
        >
          {value}
        </div>
        <div
          className="stat-label"
          style={{ color: gradient ? "rgba(255,255,255,0.85)" : undefined }}
        >
          {label}
        </div>
      </div>
    </a>
  );
}

/* ─── Quick Actions ─────────────────── */
function QuickActions({ role }: { role: string }) {
  const actions: {
    href: string;
    label: string;
    icon: React.ReactNode;
    variant: string;
    desc: string;
  }[] = [];

  if (role !== "creator" && role !== "generus") {
    actions.push({
      href: "/generus",
      label: "Kelola Generus",
      desc: "Tambah & edit data anggota",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      variant: "blue",
    });
    if (role !== "tim_pnkb") {
      actions.push({
        href: "/kegiatan",
        label: "Kelola Kegiatan",
        desc: "Atur jadwal & kegiatan",
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
        variant: "green",
      });
      actions.push({
        href: "/absensi",
        label: "Scan Absensi QR",
        desc: "Catat kehadiran via QR",
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="3" height="3" rx="0.5" />
            <rect x="18" y="18" width="3" height="3" rx="0.5" />
            <rect x="14" y="18" width="3" height="3" rx="0.5" />
          </svg>
        ),
        variant: "purple",
      });
    }
  }

  if (["creator", "generus"].includes(role)) {
    actions.push({
      href: "/profile",
      label: "Lihat Profil Saya",
      desc: "Edit profil & QR code",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      variant: "pink",
    });
  }

  const colorMap: Record<string, { bg: string; color: string }> = {
    blue: { bg: "#eff6ff", color: "#2563eb" },
    green: { bg: "#f0fdf4", color: "#16a34a" },
    purple: { bg: "#faf5ff", color: "#7c3aed" },
    orange: { bg: "#fff7ed", color: "#d97706" },
    pink: { bg: "#fdf2f8", color: "#db2777" },
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Aksi Cepat</span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            background: "var(--bg)",
            padding: "3px 10px",
            borderRadius: 20,
            fontWeight: 600,
          }}
        >
          {actions.length} aksi
        </span>
      </div>
      <div
        className="card-body"
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {actions.map((action) => {
          const c = colorMap[action.variant] || colorMap.blue;
          return (
            <a key={action.href} href={action.href} className="db-quick-action">
              <div
                className="db-quick-icon"
                style={{ background: c.bg, color: c.color }}
              >
                {action.icon}
              </div>
              <div className="db-quick-text">
                <div className="db-quick-label">{action.label}</div>
                <div className="db-quick-desc">{action.desc}</div>
              </div>
              <svg
                className="db-quick-arrow"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
          );
        })}
        {actions.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
              padding: "16px 0",
            }}
          >
            Tidak ada aksi tersedia
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Recent Info ─────────────────── */
function RecentInfo() {
  const infoItems = [
    {
      label: "Kategori Usia",
      value: "SMP, SMA, Kuliah, Bekerja",
      icon: "🎓",
      color: "#8b5cf6",
    },
    {
      label: "Fitur QR Code",
      value: "Setiap generus memiliki QR unik",
      icon: "📱",
      color: "#3b82f6",
    },
    {
      label: "Absensi",
      value: "Scan QR atau cari manual",
      icon: "✅",
      color: "#10b981",
    },
    {
      label: "Artikel",
      value: "Submit artikel, admin yang mempublish",
      icon: "📝",
      color: "#f59e0b",
    },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Informasi Sistem</span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            background: "var(--bg)",
            padding: "3px 10px",
            borderRadius: 20,
            fontWeight: 600,
          }}
        >
          v1.0
        </span>
      </div>
      <div className="card-body" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {infoItems.map((info, i) => (
            <div
              key={info.label}
              className="db-info-row"
              style={{
                borderBottom:
                  i < infoItems.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="db-info-icon">{info.icon}</div>
              <div>
                <div className="db-info-label">{info.label}</div>
                <div className="db-info-value">{info.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="page-content" style={{ padding: "40px", textAlign: "center" }}>Memuat...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
