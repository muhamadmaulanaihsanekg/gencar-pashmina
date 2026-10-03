"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import GlobalLoading from "@/components/GlobalLoading";

interface TopbarProps {
  title: string;
  role?: string;
  className?: string;
  children?: React.ReactNode;
  userName?: string;
}

export default function Topbar({ title, role, className = "", children, userName }: TopbarProps) {
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Initial logo fetch if already in window
    if (typeof window !== 'undefined') {
      const handleLogoUpdate = () => {
        setSiteLogo((window as any).__SITE_LOGO__ || null);
      };
      handleLogoUpdate();
      window.addEventListener('site-logo-updated', handleLogoUpdate);
      return () => window.removeEventListener('site-logo-updated', handleLogoUpdate);
    }
  }, []);

  const handleLogout = async () => {
    let logoutName = userName;
    if (role === "tim_pnkb") {
      logoutName = "Tim PNKB";
    } else if (role === "tim_pnkb_gambuh") {
      logoutName = "Tim PNKB & Ibu Gambuh";
    }

    const text = logoutName 
      ? `Apakah Anda yakin ingin keluar dari ${logoutName} ?`
      : 'Apakah Anda yakin ingin keluar ?';

    const result = await Swal.fire({
      title: 'Konfirmasi Keluar',
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Keluar!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    }
  };

  const roleLabel: Record<string, string> = {
    admin: "Administrator",
    pengurus_daerah: "Pengurus Daerah",
    kmm_daerah: "KMM Daerah",
    desa: "Pengurus Desa",
    kelompok: "Pengurus Kelompok",
    generus: "Generus",
    creator: "Creator/Penulis",
    pending: "Pending",
    tim_pnkb: "Tim PNKB",
    admin_romantic_room: "Admin Panggilan",
    admin_keuangan: "Admin Keuangan",
    admin_kegiatan: "Admin Kegiatan",
    tim_pnkb_gambuh: "Tim PNKB & Ibu Gambuh",
  };

  const roleColor: Record<string, string> = {
    admin: "badge-red",
    pengurus_daerah: "badge-red", 
    kmm_daerah: "badge-red",
    desa: "badge-blue",
    kelompok: "badge-green",
    generus: "badge-purple",
    creator: "badge-orange",
    pending: "badge-gray",
    tim_pnkb: "badge-blue",
    admin_romantic_room: "badge-purple",
    admin_keuangan: "badge-blue",
    admin_kegiatan: "badge-orange",
    tim_pnkb_gambuh: "badge-purple",
  };

  return (
    <>
      {loggingOut && <GlobalLoading />}
      <div className={`topbar ${className}`}>
        <div className="topbar-brand">
          <img 
            src="/img/pashmina-logo.png" 
            alt="Logo PNKB" 
            className="topbar-brand-logo" 
          />
          <span className="topbar-title">{title}</span>
        </div>
        
        <div className="topbar-right">
          {children && (
            <div className="topbar-actions" style={{ display: "flex", gap: "12px" }}>
              {children}
            </div>
          )}
          {role && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {roleLabel[role] && (
                <div className={`badge ${roleColor[role] || "badge-blue"}`}>
                  {roleLabel[role]}
                </div>
              )}
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  handleLogout();
                }} 
                className="topbar-logout-btn" 
                title="Keluar Akun"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="topbar-logout-text">Keluar Akun</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
