"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import GlobalLoading from "@/components/GlobalLoading";
import { 
  LayoutDashboard, 
  Sparkles, 
  Calendar, 
  QrCode, 
  BookUser, 
  ListOrdered, 
  Heart, 
  Map, 
  CircleDollarSign, 
  Users, 
  CheckSquare, 
  ClipboardCheck,
  ListTodo, 
  BookOpen, 
  Newspaper, 
  Settings2, 
  UserCog, 
  User, 
  LogOut,
  Palette,
  FileEdit,
  ClipboardList,
  CreditCard,
  MessageSquare,
  Camera,
  BarChart3
} from "lucide-react";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
    foto?: string;
    generusId?: string | null;
    isInMandiri?: boolean;
  };
}

const navItems = [
  {
    section: "Menu Utama",
    items: [
      { href: "/dashboard", label: "Dashboard Ta'aruf", icon: "grid" },
    ],
  },
  {
    section: "Usia Mandiri & Ta'aruf",
    items: [
      { href: "/mandiri", label: "Registrasi Peserta", icon: "sparkles" },
      { href: "/mandiri/absensi", label: "Absensi Mandiri", icon: "absensi" },
      { href: "/mandiri/pulang", label: "Daftar Pulang", icon: "logout" },
      { href: "/admin/katalog", label: "Katalog Peserta", icon: "katalog" },
      { href: "/mandiri/romantic-room", label: "Romantic Room", icon: "romantic" },
      { href: "/mandiri/desa", label: "Kelola Daerah / Desa", icon: "desa" },
      { href: "/admin/tim-gambuh", label: "Tim PNKB & Ibu Gambuh", icon: "users" },
      { href: "/mandiri/saran", label: "Saran & Masukan", icon: "message-square" },
    ],
  },
  {
    section: "Pengaturan & Sistem",
    roles: ["admin", "pengurus_daerah"],
    items: [
      { href: "/admin/users", label: "Kelola User / Panitia", icon: "users-cog", roles: ["admin", "pengurus_daerah"] },
      { href: "/admin/logo", label: "Logo & Tema", icon: "logo", roles: ["admin"] },
      { href: "/admin/maintenance", label: "Mode Maintenance", icon: "settings", roles: ["admin"] },
    ],
  },
  {
    section: "Menu Pribadi",
    items: [
      { href: "/profile", label: "Profil Saya (QR)", icon: "user" },
    ],
  },
];

const userNavs: Record<string, any[]> = {
  generus: [
    {
      section: "Menu Pribadi",
      items: [
        { href: "/profile", label: "Profil Saya (QR)", icon: "user" },
      ],
    },
  ],
  peserta: [
    {
      section: "Menu Pribadi",
      items: [
        { href: "/profile", label: "Profil Saya (QR)", icon: "user" },
      ],
    },
  ],
  creator: [
    {
      section: "Menu Utama",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "grid" },
      ],
    },
    {
      section: "Menu Pribadi",
      items: [
        { href: "/profile", label: "Profil Saya (QR)", icon: "user" },
      ],
    },
  ],
  tim_pnkb: [
    {
      section: "Usia Mandiri/Nikah",
      items: [
        { href: "/mandiri", label: "Registrasi Peserta", icon: "sparkles" },
      ],
    },
    {
      section: "Menu Utama",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "grid" },
      ],
    },
  ],
  admin_romantic_room: [
    {
      section: "Menu Utama",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "grid" },
      ],
    },
    {
      section: "Usia Mandiri/Nikah",
      items: [
        { href: "/mandiri", label: "Registrasi Peserta", icon: "sparkles" },
        { href: "/mandiri/absensi", label: "Absensi", icon: "absensi" },
        { href: "/mandiri/pulang", label: "Daftar Pulang", icon: "logout" },
        { href: "/admin/katalog", label: "Katalog Peserta", icon: "katalog" },
        { href: "/mandiri/romantic-room", label: "Romantic Room", icon: "romantic" },
        { href: "/mandiri/saran", label: "Saran / Masukkan", icon: "message-square" },
        { href: "/mandiri/desa", label: "Kelola Daerah / Desa", icon: "desa" },
        { href: "/admin/tim-gambuh", label: "Tim PNKB & Ibu Gambuh", icon: "users" },
      ],
    },
    {
      section: "Menu Pribadi",
      items: [
        { href: "/profile", label: "Profil Saya (QR)", icon: "user" },
      ],
    },
  ],
  admin_pdkt: [
    {
      section: "Katalog",
      items: [
        { href: "/admin/katalog", label: "Katalog Peserta", icon: "katalog" },
      ],
    },
  ],
  admin_keuangan: [
    {
      section: "Menu Utama",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "grid" },
      ],
    },
    {
      section: "Data & Konten",
      items: [
        { href: "/kegiatan", label: "Kegiatan", icon: "calendar" },
        { href: "/generus", label: "Data Generus", icon: "users" },
      ],
    },
    {
      section: "Menu Pribadi",
      items: [
        { href: "/profile", label: "Profil Saya (QR)", icon: "user" },
      ],
    },
  ],
  tim_pnkb_gambuh: [
    {
      section: "Usia Mandiri/Nikah",
      items: [
        { href: "/mandiri", label: "Registrasi Peserta", icon: "sparkles" },
      ],
    },
    {
      section: "Menu Utama",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "grid" },
        { href: "/mandiri/tim-gambuh", label: "Panel Tim PNKB & Ibu Gambuh", icon: "romantic" },
        { href: "/tim-gambuh/katalog", label: "Katalog Peserta", icon: "katalog" },
      ],
    },
  ],
};

const icons: Record<string, React.ReactNode> = {
  grid: <LayoutDashboard size={18} />,
  "bar-chart": <BarChart3 size={18} />,
  users: <Users size={18} />,
  calendar: <Calendar size={18} />,
  "check-square": <ClipboardCheck size={18} />,
  absensi: <QrCode size={18} />,
  katalog: <BookUser size={18} />,
  antrean: <ListOrdered size={18} />,
  romantic: <Heart size={18} />,
  desa: <Map size={18} />,
  money: <CircleDollarSign size={18} />,
  list: <ClipboardList size={18} />,
  "file-text": <Newspaper size={18} />,
  news: <Newspaper size={18} />,
  artikel: <BookOpen size={18} />,
  "user-cog": <UserCog size={18} />,
  "users-cog": <UserCog size={18} />,
  map: <Map size={18} />,
  settings: <Settings2 size={18} />,
  logo: <Palette size={18} />,
  logout: <LogOut size={18} />,
  "message-square": <MessageSquare size={18} />,
  user: <User size={18} />,
  "book-open": <BookOpen size={18} />,
  sparkles: <Sparkles size={18} />,
  "dollar-sign": <CircleDollarSign size={18} />,
  camera: <Camera size={18} />,
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  useEffect(() => {
    const handleLogoUpdate = () => {
      setSiteLogo((window as any).__SITE_LOGO__ || null);
    };
    handleLogoUpdate();
    window.addEventListener('site-logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('site-logo-updated', handleLogoUpdate);
  }, []);

  if (!mounted) return <aside className="sidebar loading"></aside>;

  const handleLogout = async () => {
    let logoutName = user.name;
    if (user.role === "tim_pnkb") {
      logoutName = "Tim PNKB";
    } else if (user.role === "tim_pnkb_gambuh") {
      logoutName = "Tim PNKB & Ibu Gambuh";
    }

    const result = await Swal.fire({
      title: 'Konfirmasi Keluar',
      text: `Apakah Anda yakin ingin keluar dari ${logoutName} ?`,
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

  const displayName = user?.role === "tim_pnkb_gambuh" ? "Tim PNKB & Ibu Gambuh" : (user?.name || "??");
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isLinkActive = (href: string, currentPath: string) => {
    if (href === "/" || href === "/dashboard" || href === "/mandiri") {
      return currentPath === href;
    }
    return currentPath.startsWith(href);
  };

  return (
    <>
      {loggingOut && <GlobalLoading />}
      <button
        className={`mobile-menu-btn ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        )}
      </button>

      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <img
            src="/img/pashmina-logo.png"
            alt="Logo PNKB"
            className="sidebar-logo-img"
          />
          <div className="sidebar-logo-text">
            <h1 className="sidebar-brand">Pashmina 8.0</h1>
            <p className="sidebar-tagline">Portal Ta'aruf & Usia Mandiri</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {(userNavs[user.role] || navItems).map((section) => {
            if (section.roles && !section.roles.includes(user.role)) return null;
            if (section.role && section.role !== user.role) return null;

            // Filter items based on access
            const visibleItems = section.items.filter((item: any) => {
              const isPanitia = ["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "tim_pnkb_gambuh"].includes(user.role);

              // Hide Mandiri items if not in Mandiri and not a committee member
              const isMandiriItem = item.href.startsWith("/mandiri") ||
                item.label.includes("Mandiri") ||
                item.label === "Antrean" ||
                item.label === "Romantic Room" ||
                item.label === "Saran / Masukkan" ||
                item.href === "/katalog";

              if (isMandiriItem && !user.isInMandiri && !isPanitia) return false;

              if (item.roles && !item.roles.includes(user.role)) return false;
              return true;
            });

            // If no items are visible, don't show the section at all
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.section} className="sidebar-section">
                <div className="sidebar-section-label">{section.section}</div>
                {visibleItems.map((item: any) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isLinkActive(item.href, pathname) ? "active" : ""}`}
                  >
                    {icons[item.icon]}
                    <span className="sidebar-link-text">{item.label}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user.foto ? (
                <img src={user.foto} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-role">
                {user.role === "admin" ? "Administrator" :
                  user.role === "pengurus_daerah" ? "Pengurus Daerah" :
                    user.role === "kmm_daerah" ? "KMM Daerah" :
                      user.role === "desa" ? "Pengurus Desa" :
                        user.role === "kelompok" ? "Pengurus Kelompok" :
                          user.role === "tim_pnkb" ? "Tim PNKB" :
                            user.role === "admin_romantic_room" ? "Admin Romantic Room" :
                              user.role === "admin_keuangan" ? "Admin Keuangan" :
                                user.role === "admin_kegiatan" ? "Admin Kegiatan" :
                                  user.role === "tim_pnkb_gambuh" ? "Tim PNKB & Ibu Gambuh" :
                                    user.role}
              </div>
            </div>
          </div>
          <button
            className="sidebar-link"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer" }}
          >
            {icons.logout}
            <span className="sidebar-link-text">{loggingOut ? "Keluar..." : "Keluar"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
