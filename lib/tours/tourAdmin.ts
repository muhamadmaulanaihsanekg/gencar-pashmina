import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

export type AdminPageKey =
  | "dashboard"
  | "mandiri"
  | "absensi"
  | "pulang"
  | "katalog"
  | "panggilan"
  | "desa"
  | "gambuh"
  | "users"
  | "logo"
  | "maintenance"
  | "saran"
  | "general";

export type TourStepDef = {
  element: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

const STORAGE_PREFIX = "gencar_tour_admin_page_v1_";
const SHELL_STORAGE_KEY = "gencar_tour_admin_shell_v1";

export function getPageKeyFromPath(pathname: string): AdminPageKey {
  const p = pathname.toLowerCase();
  if (p.includes("/admin/katalog")) return "katalog";
  if (p.includes("/mandiri/absensi") || p === "/absensi") return "absensi";
  if (p.includes("/mandiri/pulang")) return "pulang";
  if (p.includes("/mandiri/panggilan")) return "panggilan";
  if (p.includes("/mandiri/desa") || p.includes("/admin/desa")) return "desa";
  if (p.includes("/admin/tim-gambuh") || p.includes("/mandiri/tim-gambuh") || p.includes("/tim-gambuh")) return "gambuh";
  if (p.includes("/admin/users")) return "users";
  if (p.includes("/admin/logo")) return "logo";
  if (p.includes("/admin/maintenance")) return "maintenance";
  if (p.includes("/mandiri/saran") || p.includes("/admin/saran")) return "saran";
  if (p === "/mandiri" || p.startsWith("/mandiri/")) return "mandiri";
  if (p.includes("/dashboard") || p === "/") return "dashboard";
  return "general";
}

export function isShellTourDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(SHELL_STORAGE_KEY) === "completed";
  } catch {
    return false;
  }
}

export function markShellTourDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHELL_STORAGE_KEY, "completed");
  } catch {}
}

export function isAdminPageTourDone(pageKeyOrPath: string): boolean {
  if (typeof window === "undefined") return true;
  const key = pageKeyOrPath.startsWith("/") ? getPageKeyFromPath(pageKeyOrPath) : pageKeyOrPath;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${key}`) === "completed";
  } catch {
    return false;
  }
}

export function markAdminPageTourDone(pageKeyOrPath: string): void {
  if (typeof window === "undefined") return;
  const key = pageKeyOrPath.startsWith("/") ? getPageKeyFromPath(pageKeyOrPath) : pageKeyOrPath;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, "completed");
  } catch {}
}

export function resetAdminTours(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: AdminPageKey[] = [
      "dashboard",
      "mandiri",
      "absensi",
      "pulang",
      "katalog",
      "panggilan",
      "desa",
      "gambuh",
      "users",
      "logo",
      "maintenance",
      "saran",
      "general",
    ];
    keys.forEach((k) => localStorage.removeItem(`${STORAGE_PREFIX}${k}`));
    localStorage.removeItem(SHELL_STORAGE_KEY);
    localStorage.removeItem("gencar_tour_admin_katalog_v1");
  } catch {}
}

// Backwards compatibility alias
export function isAdminKatalogTourDone(): boolean {
  return isAdminPageTourDone("katalog");
}
export function startAdminKatalogTour(options?: { force?: boolean }): void {
  startAdminPageTour("katalog", options);
}

const DESKTOP_SHELL_STEPS: TourStepDef[] = [
  {
    element: "#tour-sidebar-brand",
    title: "Portal Pashmina 8.0",
    description:
      "Sistem Terpadu Manajemen Usia Mandiri, Ta'aruf, dan Kepanitiaan Daerah Cengkareng.",
    side: "bottom",
    align: "start",
  },
  {
    element: "#tour-sidebar-nav",
    title: "Menu Navigasi Modul",
    description:
      "Akses seluruh modul: Dashboard, Registrasi Peserta, Absensi, Katalog, Antrean Panggilan, dan Pengaturan Sistem.",
    side: "right",
    align: "start",
  },
  {
    element: "#tour-sidebar-user",
    title: "Profil & Hak Akses",
    description:
      "Menampilkan nama dan peran kepanitiaan Anda. Klik tombol Keluar di bawah jika telah selesai bertugas.",
    side: "top",
    align: "start",
  },
];

export const ADMIN_PAGE_STEPS: Record<AdminPageKey, TourStepDef[]> = {
  dashboard: [
    {
      element: ".db-hero-banner",
      title: "1. Selamat Datang di Dashboard",
      description:
        "Ringkasan sambutan harian, status hak akses panitia yang sedang login, dan tanggal pelaksanaan kegiatan.",
      side: "bottom",
      align: "center",
    },
    {
      element: ".db-filter-bar",
      title: "2. Filter Wilayah & Binaaan",
      description:
        "Saring data statistik dashboard berdasarkan kota/daerah, desa, atau kelompok tertentu.",
      side: "bottom",
      align: "start",
    },
    {
      element: ".db-section-header",
      title: "3. Status Kegiatan & Partisipasi",
      description:
        "Pantau agenda kegiatan mandiri yang sedang aktif dan persentase kehadiran peserta di lokasi acara.",
      side: "top",
      align: "center",
    },
    {
      element: ".db-attendance-card",
      title: "4. Grafik Kehadiran Peserta",
      description:
        "Visualisasi persentase kehadiran peserta secara realtime, lengkap dengan perbandingan Ikhwan dan Akhwat.",
      side: "top",
      align: "center",
    },
  ],

  mandiri: [
    {
      element: ".page-header",
      title: "1. Manajemen Usia Mandiri",
      description:
        "Kelola pendaftaran dan status seluruh peserta usia mandiri untuk kegiatan yang sedang aktif.",
      side: "bottom",
      align: "start",
    },
    {
      element: ".toolbar-container",
      title: "2. Aksi Cepat & Tambah Peserta",
      description:
        "Gunakan toolbar ini untuk menambahkan peserta baru secara manual, ekspor data, atau cetak laporan.",
      side: "bottom",
      align: "end",
    },
    {
      element: ".filter-pill-scroll",
      title: "3. Filter Status & Gender",
      description:
        "Saring daftar peserta berdasarkan Utusan Daerah, Person, Peserta Mandiri (L/P), atau Panitia.",
      side: "bottom",
      align: "start",
    },
    {
      element: ".mandiri-search-wrap",
      title: "4. Pencarian Cepat Peserta",
      description:
        "Cari peserta secara instan dengan mengetik nama lengkap atau nomor urut unik (#12).",
      side: "bottom",
      align: "start",
    },
    {
      element: ".table-wrapper",
      title: "5. Tabel & Verifikasi Peserta",
      description:
        "Verifikasi kelayakan peserta, izinkan pendaftaran, ubah biodata, atau cetak kartu ID Card resmi.",
      side: "top",
      align: "center",
    },
  ],

  absensi: [
    {
      element: ".card-body .form-group",
      title: "1. Pilih Kegiatan Aktif",
      description:
        "Pastikan memilih kegiatan yang sedang berlangsung untuk memulai sesi pencatatan presensi peserta.",
      side: "bottom",
      align: "start",
    },
    {
      element: ".scanner-controls-wrapper",
      title: "2. Scanner Barcode & QR Code",
      description:
        "Gunakan barcode scanner USB (Panda PRJ-666) atau kamera HP/laptop untuk memindai kartu peserta di meja registrasi.",
      side: "bottom",
      align: "center",
    },
    {
      element: ".search-bar",
      title: "3. Input Presensi Manual",
      description:
        "Jika kartu QR peserta tidak terbaca atau tertinggal, cari nama/nomor unik peserta di sini lalu klik tombol Catat.",
      side: "top",
      align: "start",
    },
    {
      element: ".absensi-list-header",
      title: "4. Rekapitulasi Kehadiran Live",
      description:
        "Pantau jumlah peserta yang telah masuk ke venue secara realtime dan ekspor rekap ke Excel kapan saja.",
      side: "bottom",
      align: "center",
    },
  ],

  pulang: [
    {
      element: ".card .responsive-grid-4",
      title: "1. Filter Data Kepulangan",
      description:
        "Saring peserta pulang berdasarkan nama kegiatan, kata kunci pencarian, kota/daerah, dan desa asal.",
      side: "bottom",
      align: "start",
    },
    {
      element: ".card-header .btn-primary",
      title: "2. Ekspor Rekap Pulang",
      description:
        "Unduh laporan seluruh peserta yang telah izin checkout/pulang dalam format spreadsheet Excel.",
      side: "bottom",
      align: "end",
    },
    {
      element: ".table-responsive",
      title: "3. Daftar & Alasan Kepulangan",
      description:
        "Pantau jam kepulangan, identitas peserta, serta alasan berpamitan/izin pulang lebih awal untuk pengawasan panitia.",
      side: "top",
      align: "center",
    },
  ],

  katalog: [
    {
      element: "#tour-kegiatan-select",
      title: "1. Pilih Kegiatan Aktif",
      description:
        "Pastikan dropdown kegiatan ini mengarah ke kegiatan yang sedang berlangsung (misal: Pashmina 8.0).",
      side: "bottom",
      align: "start",
    },
    {
      element: "#tour-toggle-public",
      title: "2. Buka Akses Katalog Publik",
      description:
        "Klik tombol Public View (ON) agar peserta mandiri dapat membuka katalog dari perangkat masing-masing.",
      side: "bottom",
      align: "center",
    },
    {
      element: "#tour-toggle-boxlove",
      title: "3. Sesi Pemilihan (Box of Love)",
      description:
        "Nyalakan Box Love (ON) saat sesi pemilihan dibuka agar peserta dapat mengirim Love Letter. Matikan (OFF) saat waktu selesai.",
      side: "bottom",
      align: "center",
    },
    {
      element: "#tour-qr-access",
      title: "4. QR Akses Venue",
      description:
        "Tampilkan barcode/QR akses layar penuh untuk di-scan peserta di pintu masuk venue agar langsung menuju katalog mandiri.",
      side: "top",
      align: "start",
    },
    {
      element: "#tour-export-id",
      title: "5. Cetak ID Card Peserta",
      description:
        "Unduh atau cetak kartu ID Card resmi lengkap dengan foto formal dan kode barcode/QR unik per peserta.",
      side: "top",
      align: "center",
    },
    {
      element: "#tour-admin-search",
      title: "6. Pencarian & Filter Peserta",
      description:
        "Cari peserta berdasarkan nama, nomor urut, desa, atau saring berdasarkan gender (Ikhwan/Akhwat) dan kriteria pendidikan.",
      side: "bottom",
      align: "start",
    },
    {
      element: "#tour-participant-grid",
      title: "7. Verifikasi Data Peserta",
      description:
        "Pantau kelengkapan profil, foto formal, status ta'aruf, serta status antrean panggilan tiap peserta.",
      side: "top",
      align: "center",
    },
  ],

  panggilan: [
    {
      element: ".kegiatan-select-wrapper",
      title: "1. Kegiatan Ta'aruf Aktif",
      description:
        "Memuat antrean panggilan bilik ta'aruf untuk kegiatan yang sedang berlangsung.",
      side: "bottom",
      align: "start",
    },
    {
      element: ".tabs-bar",
      title: "2. Antrean Bilik vs Riwayat Hasil",
      description:
        "Beralih antara tab Antrean Aktif (pasangan yang sedang dipanggil ke bilik) dan tab Riwayat & Hasil Ta'aruf.",
      side: "bottom",
      align: "start",
    },
    {
      element: ".history-actions",
      title: "3. Input Manual & Ekspor Hasil",
      description:
        "Gunakan tombol 'Isi Manual' untuk mencatat hasil pertemuan ta'aruf secara langsung atau ekspor ke Excel/PDF.",
      side: "bottom",
      align: "end",
    },
    {
      element: ".toolbar",
      title: "4. Filter Antrean & Bilik",
      description:
        "Cari pasangan ta'aruf berdasarkan nama atau nomor urut serta saring status panggilan di bilik.",
      side: "bottom",
      align: "start",
    },
    {
      element: ".queue-section",
      title: "5. Panggilan & Pencatatan Hasil",
      description:
        "Panggil pasangan Ikhwan & Akhwat ke bilik, lalu simpan hasil evaluasi pertemuan (Lanjut, Ragu-ragu, Tidak Lanjut).",
      side: "top",
      align: "center",
    },
  ],

  desa: [
    {
      element: ".desa-kegiatan-filter",
      title: "1. Filter Kegiatan & Link Pendaftaran",
      description:
        "Pilih kegiatan aktif untuk mengelola struktur wilayah dan menyalin tautan pendaftaran mandiri.",
      side: "bottom",
      align: "start",
    },
    {
      element: ".desa-card-left",
      title: "2. Tambah Daerah Rujukan",
      description:
        "Formulir cepat untuk mendaftarkan nama daerah rujukan baru ke dalam sistem.",
      side: "bottom",
      align: "start",
    },
    {
      element: ".desa-card-right",
      title: "3. Peta Hirarki Wilayah (Tree View)",
      description:
        "Kelola struktur organisasi Daerah → Desa → Kelompok secara visual. Tambah sub-unit atau kelola status keaktifan binaan.",
      side: "top",
      align: "center",
    },
  ],

  gambuh: [
    {
      element: ".page-header",
      title: "1. Tim PNKB & Ibu Gambuh",
      description:
        "Kelola tim panitia pendamping ta'aruf dan penanggung jawab bilik pertemuan.",
      side: "bottom",
      align: "start",
    },
    {
      element: ".card",
      title: "2. Manajemen Pendamping & Bilik",
      description:
        "Daftarkan personil tim gambuh dan atur penugasan bilik ta'aruf selama acara berlangsung.",
      side: "top",
      align: "center",
    },
  ],

  users: [
    {
      element: ".page-header-right",
      title: "1. Tambah Akun Panitia",
      description:
        "Daftarkan akun admin baru untuk panitia daerah, desa, bilik panggilan, atau keuangan dengan email dan password aman.",
      side: "bottom",
      align: "end",
    },
    {
      element: ".search-bar",
      title: "2. Cari & Filter Role",
      description:
        "Cari akun panitia berdasarkan nama/email dan saring berdasarkan tingkatan peran (role).",
      side: "bottom",
      align: "start",
    },
    {
      element: ".table-wrapper",
      title: "3. Hak Akses & Reset Password",
      description:
        "Ubah peran, wilayah penugasan desa/kelompok, reset kata sandi, atau nonaktifkan akun user.",
      side: "top",
      align: "center",
    },
  ],

  logo: [
    {
      element: ".card-body",
      title: "1. Kustomisasi Logo Event",
      description:
        "Unggah file logo resmi kegiatan (Pashmina 8.0) dalam format PNG/JPG transparan untuk branding sistem.",
      side: "bottom",
      align: "center",
    },
  ],

  maintenance: [
    {
      element: ".card-body",
      title: "1. Saklar Mode Perawatan (Maintenance)",
      description:
        "Aktifkan mode maintenance untuk membatasi akses peserta umum saat panitia sedang menyiapkan data kegiatan.",
      side: "bottom",
      align: "center",
    },
  ],

  saran: [
    {
      element: ".card",
      title: "1. Kotak Saran & Evaluasi Peserta",
      description:
        "Kumpulan masukan, aspirasi, dan kritik membangun dari peserta kegiatan untuk evaluasi kepanitiaan.",
      side: "bottom",
      align: "center",
    },
  ],

  general: [
    {
      element: "#tour-sidebar-brand",
      title: "Portal Pashmina 8.0",
      description:
        "Sistem Administrasi Usia Mandiri, Ta'aruf, dan Kepanitiaan Daerah Cengkareng.",
      side: "bottom",
      align: "start",
    },
    {
      element: "#tour-sidebar-nav",
      title: "Menu Navigasi Modul",
      description: "Pilih menu modul operasional yang ingin Anda kelola.",
      side: "right",
      align: "start",
    },
    {
      element: "#tour-topbar-guide",
      title: "Panduan Interaktif",
      description:
        "Klik tombol Panduan ini kapan saja untuk bantuan petunjuk langkah demi langkah pada halaman aktif.",
      side: "bottom",
      align: "end",
    },
  ],
};

export function startAdminPageTour(
  pageKeyOrPath: string,
  options?: { force?: boolean; includeShell?: boolean }
): void {
  if (typeof window === "undefined") return;

  const pageKey = pageKeyOrPath.startsWith("/")
    ? getPageKeyFromPath(pageKeyOrPath)
    : (pageKeyOrPath as AdminPageKey);

  if (!options?.force && isAdminPageTourDone(pageKey)) {
    return;
  }

  // Small delay to ensure DOM is ready
  setTimeout(() => {
    const rawPageSteps = ADMIN_PAGE_STEPS[pageKey] || ADMIN_PAGE_STEPS.general;

    const shouldIncludeShell =
      (!isShellTourDone() || Boolean(options?.includeShell)) &&
      typeof window !== "undefined" &&
      window.innerWidth > 768;

    const shellStepsToUse = shouldIncludeShell ? DESKTOP_SHELL_STEPS : [];
    const combinedDefs = [...shellStepsToUse, ...rawPageSteps];

    // Filter to elements that actually exist in the current DOM
    const availableSteps = combinedDefs.filter((def) => {
      try {
        return Boolean(document.querySelector(def.element));
      } catch {
        return false;
      }
    });

    if (availableSteps.length === 0) {
      return;
    }

    const driveSteps: DriveStep[] = availableSteps.map((def) => ({
      element: def.element,
      popover: {
        title: def.title,
        description: def.description,
        side: def.side ?? "bottom",
        align: def.align ?? "center",
      },
    }));

    const driverObj = driver({
      steps: driveSteps,
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.65,
      stagePadding: 6,
      stageRadius: 12,
      nextBtnText: "Lanjut →",
      prevBtnText: "← Kembali",
      doneBtnText: "Selesai",
      progressText: "{{current}} dari {{total}}",
      onDestroyStarted: () => {
        if (shouldIncludeShell) {
          markShellTourDone();
        }
        markAdminPageTourDone(pageKey);
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }, 400);
}
