"use client";

import { useState } from "react";
import Link from "next/link";
import { User, ShieldCheck, Calendar, ArrowLeft, ArrowRight, Heart } from "lucide-react";
import Swal from "sweetalert2";

export default function KatalogLoginPage() {
  const [unik, setUnik] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "error" | "waiting">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const verify = async () => {
    if (!unik.trim()) return;
    setStatus("verifying");
    setErrorMsg("");

    let deviceId = localStorage.getItem("mandiri_device_id");
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("mandiri_device_id", deviceId);
    }

    try {
      const p = new URLSearchParams();
      p.set("nomorUnik", unik.trim());
      p.set("deviceId", deviceId);
      const qs = p.toString();

      const res = await fetch(`/api/public/mandiri/katalog/check-status?${qs}`);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Unexpected response: ${res.status}`);
      }

      const resData = await res.json();

      if (resData.status === "attended" || resData.status === "waiting") {
        localStorage.setItem("attended_nomor_unik", resData.nomorUnik || unik.trim());
        localStorage.setItem("attended_session_token", resData.sessionToken);
        localStorage.setItem("attended_nomor_urut_peserta", resData.nomorUrut);
        localStorage.setItem("attended_role", resData.role || "Peserta");

        Swal.fire({
          title: `Selamat Datang, ${resData.nama}!`,
          text: "Berhasil masuk ke Katalog Peserta.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: "top-end"
        });

        setTimeout(() => {
          window.location.href = "/mandiri/katalog";
        }, 1500);
      } else if (resData.status === "multi_login") {
        setErrorMsg("Nomor Unik ini sudah digunakan di perangkat lain (Single Session).");
        setStatus("error");
      } else if (resData.status === "not_found") {
        setErrorMsg("Nomor Unik tidak ditemukan. Pastikan Anda sudah terdaftar.");
        setStatus("error");
      } else {
        setErrorMsg(resData.error || "Terjadi kesalahan saat verifikasi.");
        setStatus("error");
      }
    } catch (e: any) {
      console.error("verify error:", e);
      if (e instanceof TypeError && e.message.includes("fetch")) {
        setErrorMsg("Gagal terhubung ke server. Periksa koneksi internet Anda.");
      } else {
        setErrorMsg("Terjadi kesalahan. Coba lagi dalam beberapa saat.");
      }
      setStatus("error");
    }
  };

  return (
    <div className="portal-root katalog-login-root">
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
                src="/img/pashmina-logo.png?v=8"
                alt="Logo Pashmina 8.0"
                className="kl-logo-img"
              />
            </div>
            <div className="kl-pretitle">Portal Ta&apos;aruf Mandiri</div>
            <h1 className="kl-title">Masuk Katalog Peserta</h1>
            <p className="kl-subtitle">
              Gunakan <strong>Nomor Unik / ID Login</strong> yang tercetak pada tiket barcode pendaftaran Anda.
            </p>
          </div>

          <div className="kl-body">
            <div className="kl-input-group">
              <label htmlFor="nomorUnikInput" className="kl-label">
                Nomor Peserta / ID Login
              </label>
              <div className="kl-field-wrap">
                <User size={18} className="kl-input-icon" />
                <input
                  id="nomorUnikInput"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Contoh: MND123456"
                  value={unik}
                  onChange={(e) => setUnik(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && verify()}
                  autoFocus
                  className="kl-input"
                />
              </div>
            </div>

            <button
              type="button"
              className={`kl-submit-btn ${status === "verifying" ? "loading" : ""}`}
              onClick={verify}
              disabled={status === "verifying" || !unik.trim()}
            >
              {status === "verifying" ? (
                <span className="kl-btn-content">
                  <span className="kl-spinner" /> Memverifikasi Data...
                </span>
              ) : (
                <span className="kl-btn-content">
                  <Heart size={16} fill="currentColor" />
                  <span>Buka Katalog Ta&apos;aruf</span>
                  <ArrowRight size={16} />
                </span>
              )}
            </button>

            {status === "error" && (
              <div className="kl-error-box">
                <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {status === "waiting" && (
              <div className="kl-warning-box">
                <Calendar size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="kl-footer-links">
              <div className="kl-register-prompt">
                <span>Belum terdaftar sebagai peserta?</span>
                <Link href="/mandiri/daftar" className="kl-register-link">
                  Daftar Peserta Baru &rarr;
                </Link>
              </div>

              <div className="kl-admin-link">
                <Link href="/login">Akses Panitia / Pengurus</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
