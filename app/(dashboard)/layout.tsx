"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AccessDenied from "@/components/AccessDenied";
import AutoLogout from "@/components/AutoLogout";

const VALID_DASHBOARD_ROLES = [
  "admin",
  "pengurus_daerah",
  "kmm_daerah",
  "desa",
  "kelompok",
  "generus",
  "peserta",
  "creator",
  "tim_pnkb",
  "admin_romantic_room",
  "admin_keuangan",
  "admin_kegiatan",
  "admin_pdkt",
  "usia_mandiri",
  "tim_pnkb_gambuh"
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role: string;
    foto?: string;
    generusId?: string | null;
    isInMandiri?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data || data.error) {
          router.push("/login");
          return;
        }
        const role = data.role;
        let isInMandiri = [
          "admin",
          "pengurus_daerah",
          "kmm_daerah",
          "tim_pnkb",
          "admin_romantic_room",
          "admin_keuangan",
          "admin_kegiatan",
          "tim_pnkb_gambuh"
        ].includes(role);

        if (data.isInMandiri !== undefined) {
          isInMandiri = Boolean(data.isInMandiri) || isInMandiri;
        }

        setUser({
          name: data.name || data.nama || "",
          email: data.email || "",
          role,
          foto: data.foto || "",
          generusId: data.generusId || null,
          isInMandiri,
        });
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user?.role || !VALID_DASHBOARD_ROLES.includes(user.role)) {
    return <AccessDenied />;
  }

  return (
    <div className="layout">
      <AutoLogout timeoutMinutes={30} />
      <Sidebar user={user} />
      <main className="main-content portal-root">{children}</main>
    </div>
  );
}
