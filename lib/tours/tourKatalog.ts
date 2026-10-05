import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const MANDIRI_KATALOG_STORAGE_KEY = "gencar_tour_mandiri_katalog_v1";

export function isMandiriKatalogTourDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(MANDIRI_KATALOG_STORAGE_KEY) === "completed";
  } catch {
    return false;
  }
}

export function markMandiriKatalogTourDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MANDIRI_KATALOG_STORAGE_KEY, "completed");
  } catch {}
}

export function resetMandiriKatalogTour(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(MANDIRI_KATALOG_STORAGE_KEY);
  } catch {}
}

export function startMandiriKatalogTour(options?: { force?: boolean }): void {
  if (typeof window === "undefined") return;
  if (!options?.force && isMandiriKatalogTourDone()) {
    return;
  }

  setTimeout(() => {
    const steps: DriveStep[] = [
      {
        element: "#tour-katalog-tabs",
        popover: {
          title: "1. Navigasi Menu Katalog",
          description:
            "Gunakan tab ini untuk berpindah antara Data Peserta, Love Letter (Pilihan Anda), Hasil Ta'aruf, Profil Anda, dan Scan Kehadiran.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-katalog-profile-tab",
        popover: {
          title: "2. Lengkapi Biodata & Foto",
          description:
            "Pastikan Anda telah mengisi foto formal terbaik, pekerjaan, hobi, nomor WhatsApp aktif, serta kriteria pasangan impian di tab Profil Saya.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-katalog-search",
        popover: {
          title: "3. Cari & Saring Kriteria",
          description:
            "Cari calon berdasarkan nomor urut (#12), nama, daerah asal, usia, atau latar belakang pendidikan yang Anda harapkan.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-katalog-cards",
        popover: {
          title: "4. Kartu Peserta & Love Letter",
          description:
            "Klik pada kartu untuk membaca biodata mendalam. Klik tombol 'Pilih' atau ikon bintang untuk memasukkan calon ke daftar Love Letter Anda.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tour-katalog-cart-tab",
        popover: {
          title: "5. Kirim Pilihan Saat Box of Love Buka",
          description:
            "Saat panitia mengumumkan bahwa sesi Box of Love telah dibuka, masuk ke tab Love Letter ini dan tekan 'Kirim Pilihan' agar diagendakan ke ruang pertemuan ta'aruf.",
          side: "bottom",
          align: "end",
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
        markMandiriKatalogTourDone();
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }, 350);
}
