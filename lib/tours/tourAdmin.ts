import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const ADMIN_KATALOG_STORAGE_KEY = "gencar_tour_admin_katalog_v1";

export function isAdminKatalogTourDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ADMIN_KATALOG_STORAGE_KEY) === "completed";
  } catch {
    return false;
  }
}

export function markAdminKatalogTourDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_KATALOG_STORAGE_KEY, "completed");
  } catch {}
}

export function resetAdminKatalogTour(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ADMIN_KATALOG_STORAGE_KEY);
  } catch {}
}

export function startAdminKatalogTour(options?: { force?: boolean }): void {
  if (typeof window === "undefined") return;
  if (!options?.force && isAdminKatalogTourDone()) {
    return;
  }

  setTimeout(() => {
    const steps: DriveStep[] = [
      {
        element: "#tour-kegiatan-select",
        popover: {
          title: "1. Pilih Kegiatan Aktif",
          description:
            "Pastikan dropdown kegiatan ini mengarah ke kegiatan yang sedang berlangsung (misal: Pashmina 8.0) agar data peserta dan antrean ta'aruf sesuai.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-toggle-public",
        popover: {
          title: "2. Buka Akses Katalog Publik",
          description:
            "Klik tombol Public View (ON) agar peserta mandiri dapat membuka katalog dari perangkat masing-masing melalui link atau scan QR.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-toggle-boxlove",
        popover: {
          title: "3. Sesi Pemilihan (Box of Love)",
          description:
            "Nyalakan Box Love (ON) saat sesi pemilihan dibuka agar peserta dapat mengirim Love Letter. Matikan (OFF) saat waktu pemilihan selesai.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-qr-access",
        popover: {
          title: "4. QR Akses Venue",
          description:
            "Tampilkan barcode/QR akses layar penuh untuk di-scan peserta di pintu masuk venue agar langsung diarahkan ke katalog mandiri.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tour-export-id",
        popover: {
          title: "5. Cetak ID Card Peserta",
          description:
            "Unduh atau cetak kartu ID Card resmi lengkap dengan foto formal dan kode barcode/QR unik per peserta.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tour-admin-search",
        popover: {
          title: "6. Pencarian & Filter Peserta",
          description:
            "Cari peserta berdasarkan nama, nomor urut, desa, atau saring berdasarkan gender (Ikhwan/Akhwat) dan kriteria pendidikan.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-participant-grid",
        popover: {
          title: "7. Verifikasi Data Peserta",
          description:
            "Periksa biodata, foto, nomor WhatsApp, dan kriteria pasangan peserta. Anda dapat mengklik baris untuk melihat detail lengkap.",
          side: "top",
          align: "center",
        },
      },
    ];

    const driverObj = driver({
      steps,
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
        markAdminKatalogTourDone();
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }, 350);
}
