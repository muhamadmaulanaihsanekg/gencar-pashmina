"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, MessageSquare } from "lucide-react";
import Swal from "sweetalert2";

export default function HomeNavbar({ session }: { query?: string; session?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaranModal, setShowSaranModal] = useState(false);
  const [saranForm, setSaranForm] = useState({
    untuk: "",
    saran: "",
    nama: "",
    isAnonim: false,
  });
  const [submittingSaran, setSubmittingSaran] = useState(false);

  const handleSaranSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saranForm.untuk.trim() || !saranForm.saran.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Mohon lengkapi tujuan dan isi saran/masukan Anda.",
        confirmButtonColor: "#3d5a45"
      });
      return;
    }

    setSubmittingSaran(true);
    try {
      const res = await fetch("/api/public/saran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saranForm),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Terkirim",
          text: "Terima kasih, saran Anda telah diterima panitia.",
          timer: 2000,
          showConfirmButton: false,
        });
        setSaranForm({ untuk: "", saran: "", nama: "", isAnonim: false });
        setShowSaranModal(false);
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal Mengirim",
          text: data.error || "Gagal mengirim saran. Silakan coba lagi.",
          confirmButtonColor: "#3d5a45"
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Koneksi Bermasalah",
        text: "Terjadi gangguan jaringan.",
        confirmButtonColor: "#3d5a45"
      });
    } finally {
      setSubmittingSaran(false);
    }
  };

  return (
    <nav className="pashmina-navbar">
      <div className="navbar-container">
        {/* Mobile menu trigger */}
        <button
          className="mobile-hamburger"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Navigasi Menu"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Desktop & mobile drawer links */}
        <div className={`nav-menu ${isOpen ? "is-open" : ""}`}>
          <Link href="/" className="nav-item nav-item-active" onClick={() => setIsOpen(false)}>
            Beranda
          </Link>
          <Link href="/mandiri/katalog" className="nav-item" onClick={() => setIsOpen(false)}>
            Katalog Ta&apos;aruf
          </Link>
          <Link href="/mandiri/daftar" className="nav-item" onClick={() => setIsOpen(false)}>
            Pendaftaran Peserta
          </Link>

          {session && ["generus", "usia_mandiri"].includes(session.role) && (
            <Link href="/scan" className="nav-item" onClick={() => setIsOpen(false)}>
              Absensi
            </Link>
          )}

          <button
            type="button"
            className="nav-item action-btn"
            onClick={() => {
              setShowSaranModal(true);
              setIsOpen(false);
            }}
          >
            <MessageSquare size={14} style={{ marginRight: 6 }} />
            <span>Saran &amp; Masukan</span>
          </button>

          <Link href="/mandiri/katalog/login" className="nav-item nav-login-mobile" onClick={() => setIsOpen(false)}>
            Masuk Katalog &rarr;
          </Link>
        </div>
      </div>

      {showSaranModal && (
        <div className="modal-backdrop" onClick={() => setShowSaranModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Kirim Masukan atau Saran</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowSaranModal(false)}
                aria-label="Tutup"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaranSubmit}>
              <div className="modal-content">
                <div className="field-group">
                  <label className="field-label">Ditujukan Kepada</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Misal: Tim Gambuh, Panitia Konsumsi, Dewan Penasehat"
                    value={saranForm.untuk}
                    onChange={(e) => setSaranForm({ ...saranForm, untuk: e.target.value })}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Isi Saran atau Masukan</label>
                  <textarea
                    className="field-textarea"
                    rows={4}
                    placeholder="Sampaikan masukan Anda secara santun dan jelas..."
                    value={saranForm.saran}
                    onChange={(e) => setSaranForm({ ...saranForm, saran: e.target.value })}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Nama Pengirim (Opsional)</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Nama Anda (kosongkan jika anonim)"
                    value={saranForm.nama}
                    disabled={saranForm.isAnonim}
                    onChange={(e) => setSaranForm({ ...saranForm, nama: e.target.value })}
                  />
                </div>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={saranForm.isAnonim}
                    onChange={(e) => {
                      setSaranForm({
                        ...saranForm,
                        isAnonim: e.target.checked,
                        nama: e.target.checked ? "" : saranForm.nama
                      });
                    }}
                  />
                  <span>Kirim secara rahasia (tanpa nama)</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowSaranModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={submittingSaran}
                >
                  {submittingSaran ? "Mengirim..." : "Kirim Masukan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
