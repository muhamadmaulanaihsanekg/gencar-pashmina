"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import GlobalLoading from "@/app/loading";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleLogoUpdate = () => {
        setSiteLogo((window as any).__SITE_LOGO__ || null);
      };
      handleLogoUpdate();
      window.addEventListener("site-logo-updated", handleLogoUpdate);

      fetch("/api/settings")
        .then((r) => r.json())
        .then((s) => {
          if (s?.site_logo) setSiteLogo(s.site_logo);
        })
        .catch(console.error);

      return () => window.removeEventListener("site-logo-updated", handleLogoUpdate);
    }
  }, []);

  useEffect(() => {
    const s = searchParams.get("success");
    if (s === "registered") {
      setSuccess("Registrasi berhasil! Silakan masuk dengan akun baru Anda.");
    } else if (s === "reset") {
      setSuccess("Password berhasil diubah! Silakan masuk dengan password baru Anda.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Email atau password salah");
        Swal.fire({
          icon: "error",
          title: "Login Gagal",
          text: data.error || "Email atau password salah",
          confirmButtonColor: "#3d5a45",
        });
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Selamat Datang!",
        text: "Anda berhasil masuk ke sistem.",
        timer: 1500,
        showConfirmButton: false,
      });

      if (data.user.role === "pending") {
        window.location.href = "/pending";
      } else if (["generus", "usia_mandiri"].includes(data.user.role)) {
        window.location.href = "/";
      } else if (data.user.role === "tim_pnkb_gambuh") {
        window.location.href = "/mandiri/tim-gambuh";
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-root katalog-login-root">
      {loading && <GlobalLoading />}
      <div className="kl-arabesque-layer" aria-hidden="true" />
      <div className="kl-ambient-glow" aria-hidden="true" />

      <div className="kl-container">
        {/* Top return navigation */}
        <div className="kl-top-nav">
          <Link href="/" className="kl-back-btn">
            <ArrowLeft size={15} />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        <div className="kl-card">
          <div className="kl-header">
            <div className="kl-logo-badge">
              <img
                src={siteLogo || "/img/pashmina-logo.png?v=8"}
                alt="Logo Pashmina 8.0"
                className="kl-logo-img"
              />
            </div>
            <div className="kl-pretitle">Portal Panitia &amp; Pengurus</div>
            <h1 className="kl-title">Masuk Akun Panitia</h1>
            <p className="kl-subtitle">
              Gunakan email dan password terdaftar untuk mengelola kegiatan <strong>Pashmina 8.0</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="kl-body">
            <div className="kl-input-group">
              <label htmlFor="email" className="kl-label">
                Email Terdaftar
              </label>
              <div className="kl-field-wrap">
                <Mail size={18} className="kl-input-icon" />
                <input
                  id="email"
                  type="email"
                  className="kl-input"
                  placeholder="panitia@pashmina.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="kl-input-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                <label htmlFor="password" className="kl-label" style={{ margin: 0 }}>
                  Password
                </label>
                <Link
                  href="/login/forgot-password"
                  style={{ fontSize: "12px", color: "var(--accent-gold, #c5a059)", fontWeight: 600, textDecoration: "none" }}
                >
                  Lupa Password?
                </Link>
              </div>
              <div className="kl-field-wrap">
                <Lock size={18} className="kl-input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="kl-input"
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#8c9b90",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: "4px"
                  }}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="kl-error-box">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="kl-warning-box" style={{ background: "#f0fdf4", borderColor: "#86efac", color: "#166534" }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0, color: "#16a34a" }} />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              className={`kl-submit-btn ${loading ? "loading" : ""}`}
              disabled={loading || !email.trim() || !password.trim()}
            >
              {loading ? (
                <span className="kl-btn-content">
                  <span className="kl-spinner" /> Memproses Masuk...
                </span>
              ) : (
                <span className="kl-btn-content">
                  <ShieldCheck size={16} />
                  <span>Masuk Dashboard Panitia</span>
                  <ArrowRight size={16} />
                </span>
              )}
            </button>

            <div className="kl-footer-links">
              <div className="kl-register-prompt">
                <span>Masuk sebagai peserta ta&apos;aruf?</span>
                <Link href="/mandiri/katalog/login" className="kl-register-link">
                  Login Peserta Mandiri &rarr;
                </Link>
              </div>

              <div className="kl-admin-link">
                <Link href="/">Kembali ke Beranda Utama</Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="portal-root katalog-login-root"><div className="kl-spinner" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
