"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import LandingProfileWidget from "./LandingProfileWidget";

const DigitalClock = dynamic(() => import("@/components/DigitalClock"), { ssr: false });

export default function HomeHeader({ session }: { session: any }) {
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    const handleLogoUpdate = () => {
      setSiteLogo((window as any).__SITE_LOGO__ || null);
    };
    handleLogoUpdate();
    window.addEventListener("site-logo-updated", handleLogoUpdate);

    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s && s.site_logo) {
          setSiteLogo(s.site_logo);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener("site-logo-updated", handleLogoUpdate);
  }, []);

  return (
    <header className="site-header" suppressHydrationWarning>
      {/* ═══ TOP UTILITY BAR ═══ */}
      <div className="top-utility-bar">
        <div className="header-container">
          <div className="top-bar-content">
            <div className="top-bar-left">
              <span className="event-tag">Agenda Mandiri 2026</span>
              <span className="bar-separator">&middot;</span>
              <span className="clock-wrapper">
                <Suspense fallback={<span>--:--:--</span>}>
                  <DigitalClock />
                </Suspense>
              </span>
            </div>
            <div className="top-bar-right">
              <span>Sekretariat PPG Cengkareng</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MASTHEAD BRANDING ═══ */}
      <div className="masthead-bar">
        <div className="header-container">
          <div className="masthead-content">
            <Link href="/" className="brand-identity">
              <div className="logo-frame">
                {!logoFailed ? (
                  <img
                    src={siteLogo || "/img/pashmina-logo.png?v=8"}
                    alt="Logo Pashmina 8.0"
                    className="brand-logo-img"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <div className="logo-svg-fallback" title="Pashmina 8.0">
                    <svg viewBox="0 0 48 48" width="38" height="38" fill="none">
                      <rect width="48" height="48" rx="8" fill="#3d5a45" />
                      <path d="M24 10 L35 24 L24 38 L13 24 Z" fill="#ffffff" fillOpacity="0.9" />
                      <circle cx="24" cy="24" r="5" fill="#c5a059" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="brand-text-block">
                <div className="brand-title">PASHMINA 8.0</div>
                <div className="brand-subtitle">
                  Portal Ta&apos;aruf &amp; Usia Mandiri &middot; Generus Cengkareng
                </div>
              </div>
            </Link>

            <div className="masthead-actions">
              <LandingProfileWidget session={session} />
              {session ? (
                !["generus", "usia_mandiri"].includes(session.role) && (
                  <Link href="/dashboard" className="btn-portal-entry">
                    Dashboard &rarr;
                  </Link>
                )
              ) : (
                <Link href="/mandiri/katalog/login" className="btn-portal-entry">
                  Masuk Katalog
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
