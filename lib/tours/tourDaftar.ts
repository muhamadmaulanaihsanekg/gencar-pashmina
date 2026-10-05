import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const DAFTAR_STORAGE_KEY = "gencar_tour_daftar_v1";

export function isDaftarTourDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(DAFTAR_STORAGE_KEY) === "completed";
  } catch {
    return false;
  }
}

export function markDaftarTourDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DAFTAR_STORAGE_KEY, "completed");
  } catch {}
}

export function startDaftarTour(options?: { force?: boolean }): void {
  if (typeof window === "undefined") return;
  if (!options?.force && isDaftarTourDone()) {
    return;
  }

  setTimeout(() => {
    const steps: DriveStep[] = [
      {
        element: "#tour-daftar-foto",
        popover: {
          title: "1. Unggah Foto Formal",
          description:
            "Unggah foto setengah badan formal/rapi berlatar polos. Foto ini akan menjadi identitas Anda pada kartu peserta dan buku katalog.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-daftar-identitas",
        popover: {
          title: "2. Data Pribadi & Kontak",
          description:
            "Isi nama lengkap, jenis kelamin, tanggal lahir, dan nomor WhatsApp aktif. Nomor WA digunakan untuk pemberitahuan panggilan ta'aruf.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tour-daftar-wilayah",
        popover: {
          title: "3. Asal Daerah & Desa",
          description:
            "Pilih daerah binaan (contoh: Cengkareng) serta desa dan kelompok pengajian asal Anda.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tour-daftar-kriteria",
        popover: {
          title: "4. Kriteria Pasangan & Visi Menikah",
          description:
            "Tuliskan kriteria calon pasangan yang Anda harapkan serta target tahun menikah secara jelas dan santun.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tour-daftar-submit",
        popover: {
          title: "5. Simpan & Unduh Bukti Daftar",
          description:
            "Setelah semua data terisi benar, klik Daftar Sekarang untuk mendapatkan ID Card Digital dan Nomor Urut Peserta.",
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
        markDaftarTourDone();
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }, 350);
}
