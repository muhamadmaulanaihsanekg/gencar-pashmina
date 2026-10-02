"use client";

import Link from "next/link";
import { useState } from "react";

export default function HomeNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="wrap">
        <div className="navbar-inner">
          <button 
            className="landing-hamburger" 
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Menu"
          >
            {isOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>

          <div className={`nav-links ${isOpen ? "active" : ""}`}>
            <Link href="/" className="nav-link nav-link-active" onClick={() => setIsOpen(false)}>Beranda</Link>
            <Link href="/mandiri/katalog" className="nav-link" onClick={() => setIsOpen(false)}>Katalog Ta'aruf</Link>
            <Link href="/mandiri/daftar" className="nav-link" onClick={() => setIsOpen(false)}>Daftar Peserta</Link>
            <Link href="/mandiri/katalog/login" className="nav-link" onClick={() => setIsOpen(false)}>Masuk Katalog</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
