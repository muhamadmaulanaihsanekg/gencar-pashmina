"use client";
import { useState, useEffect } from "react";

export default function GlobalLoading() {
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleLogoUpdate = () => {
        setSiteLogo((window as any).__SITE_LOGO__ || null);
      };
      handleLogoUpdate();
      window.addEventListener('site-logo-updated', handleLogoUpdate);
      return () => window.removeEventListener('site-logo-updated', handleLogoUpdate);
    }
  }, []);

  return (
    <div className="page-loader-overlay">
      <div className="loader-progress-bar" />
      <div
        className="loader-logo"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
        }}
      >
        <img
          src={siteLogo || "/img/pnkb.png"}
          alt="Logo PNKB"
          style={{ width: "64px", height: "64px", objectFit: "contain" }}
        />
        <span
          style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontSize: "24px",
            letterSpacing: "1px",
            fontWeight: 700,
            color: "var(--primary, #2d5a43)",
          }}
        >
          Pashmina 8.0
        </span>
      </div>
      <div className="loader-dots">
        <div className="loader-dot" />
        <div className="loader-dot" />
        <div className="loader-dot" />
      </div>
      <p
        style={{
          marginTop: 6,
          fontSize: 13,
          color: "var(--text-muted, #718096)",
          fontWeight: 500,
        }}
      >
        Portal Ta&apos;aruf &amp; Usia Mandiri
      </p>
    </div>
  );
}
