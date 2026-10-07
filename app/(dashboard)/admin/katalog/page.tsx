"use client";




import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { GenerusItem } from "@/lib/types";
import {
  Sparkles, Search, User, MapPin, Phone, GraduationCap,
  Briefcase, Heart, Globe, Calendar, Lock, ClipboardList,
  Download, Eye, EyeOff, ChevronDown, ChevronUp, Settings2, Users, Share2, Music, Utensils, Printer, Home, Instagram, QrCode, FileSpreadsheet, FileText, X, ArrowUpDown, Copy, Fingerprint, PhoneCall, HelpCircle
} from "lucide-react";
import { startAdminKatalogTour, isAdminKatalogTourDone } from "@/lib/tours/tourAdmin";
import { getPusherClient } from "@/lib/pusher-client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { utils, writeFile } from "xlsx";

export default function AdminKatalogPage() {
  const [data, setData] = useState<GenerusItem[]>([]);
  const [myProfile, setMyProfile] = useState<GenerusItem | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [gender, setGender] = useState<string>("all");
  const [status, setStatus] = useState("all");
  const [pendidikan, setPendidikan] = useState("all");
  const [page, setPage] = useState(1);
  const [pendidikanList, setPendidikanList] = useState<string[]>([]);
  const [daerahList, setDaerahList] = useState<any[]>([]);
  const [selectedDaerah, setSelectedDaerah] = useState("all");
  const [desaList, setDesaList] = useState<any[]>([]);
  const [selectedDesa, setSelectedDesa] = useState("all");
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [selectedKelompok, setSelectedKelompok] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authorizedChecked, setAuthorizedChecked] = useState(false);
  const [latestActivity, setLatestActivity] = useState<any>(null);
  const [publicStatus, setPublicStatus] = useState<string>("closed");
  const [kegiatanList, setKegiatanList] = useState<{ id: string; judul: string; kota: string }[]>([]);
  const [selectedKegiatanId, setSelectedKegiatanId] = useState("");
  const [boxLoveStatus, setBoxLoveStatus] = useState<string>("closed");
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<GenerusItem | null>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleCardRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);
  const exportQRCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportParticipant, setExportParticipant] = useState<GenerusItem | null>(null);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [showAccessQR, setShowAccessQR] = useState(false);
  const accessQRCanvasRef = useRef<HTMLCanvasElement>(null);
  const [profileDetail, setProfileDetail] = useState<GenerusItem | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<GenerusItem | null>(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: String(limit),
        all: "true",
        mandiriOnly: "true",
        jenisKelamin: gender,
        status: status,
        pendidikan: pendidikan,
        mandiriDaerahId: selectedDaerah,
        mandiriDesaId: selectedDesa,
        mandiriKelompokId: selectedKelompok,
        sortBy: "nomorUrut",
        order: sortOrder,
        ...(selectedKegiatanId ? { kegiatanId: selectedKegiatanId } : {}),
      });
      const res = await fetch(`/api/generus?${params}`, { cache: "no-store" });
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, search, page, gender, status, pendidikan, selectedDaerah, selectedDesa, selectedKelompok, sortOrder, selectedKegiatanId]);

  useEffect(() => {
    async function init() {
      try {
        const profileRes = await fetch("/api/profile", { cache: "no-store" });
        if (!profileRes.ok) throw new Error("Gagal mengambil profil");
        const profileJson = await profileRes.json();
        setMyProfile(profileJson);
        setIsAuthorized(!!profileJson.isInPdkt || ["admin", "tim_pnkb", "admin_romantic_room", "kmm_daerah", "pengurus_daerah", "admin_pdkt", "tim_pnkb_gambuh"].includes(profileJson.role));

        // Fetch activity info + kegiatan list + active setting
        const [activityRes, kegiatanRes, settingsRes] = await Promise.all([
          fetch("/api/mandiri/kegiatan?limit=1", { cache: "no-store" }),
          fetch("/api/mandiri/kegiatan", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
        ]);
        if (activityRes.ok) {
          const activities = await activityRes.json();
          if (activities.length > 0) setLatestActivity(activities[0]);
        }
        if (kegiatanRes.ok) {
          const kList = await kegiatanRes.json();
          if (Array.isArray(kList)) {
            setKegiatanList(kList);
            const s = settingsRes.ok ? await settingsRes.json() : {};
            const activeId = s.mandiri_active_kegiatan_id || "";
            if (activeId) setSelectedKegiatanId(activeId);
            else if (kList.length > 0) setSelectedKegiatanId(kList[0].id);
          }
        }
        // Fetch public status
        const statusRes = await fetch("/api/mandiri/settings?key=mandiri_katalog_public_status", { cache: "no-store" });
        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          setPublicStatus(statusJson.value || "closed");
        }

        // Fetch Box Love status
        const boxLoveRes = await fetch("/api/mandiri/box-love?action=status", { cache: "no-store" });
        if (boxLoveRes.ok) {
          const boxLoveJson = await boxLoveRes.json();
          setBoxLoveStatus(boxLoveJson.value || "closed");
        }

        // Fetch site logo
        if (typeof window !== 'undefined') {
          const handleLogoUpdate = () => {
            setSiteLogo((window as any).__SITE_LOGO__ || null);
          };
          handleLogoUpdate();
          window.addEventListener('site-logo-updated', handleLogoUpdate);

          if (!(window as any).__SITE_LOGO__) {
            const settingsRes = await fetch("/api/settings");
            if (settingsRes.ok) {
              const settingsData = await settingsRes.json();
              if (settingsData.site_logo) {
                setSiteLogo(settingsData.site_logo);
                (window as any).__SITE_LOGO__ = settingsData.site_logo;
                window.dispatchEvent(new Event('site-logo-updated'));
              }
            }
          }
        }

        // Fetch dynamic filters
        const filterRes = await fetch("/api/generus/filters", { cache: "no-store" });
        if (filterRes.ok) {
          const filterJson = await filterRes.json();
          setPendidikanList(filterJson.pendidikan || []);
          setDaerahList(filterJson.daerahs || []);
          setDesaList(filterJson.desas || []);
          setKelompokList(filterJson.kelompoks || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAuthorizedChecked(true);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (authorizedChecked && isAuthorized && !loading) {
      if (!isAdminKatalogTourDone()) {
        const timer = setTimeout(() => {
          startAdminKatalogTour();
        }, 700);
        return () => clearTimeout(timer);
      }
    }
  }, [authorizedChecked, isAuthorized, loading]);

  useEffect(() => {
    let interval: any;
    const fetchRooms = async () => {
      try {
        const r = await fetch("/api/mandiri/pilih?all=true", { cache: "no-store" });
        if (r.ok) {
          const rJson = await r.json();
          const called = (Array.isArray(rJson) ? rJson : []).filter((p: any) => p.statusTunggu === "dipanggil");
          setActiveRooms(called);
        }
      } catch (e) {}
    };

    if (isAuthorized) {
      fetchRooms();
      interval = setInterval(fetchRooms, 10000);

      const pusher = getPusherClient();
      if (pusher) {
        const channel = pusher.subscribe("taaruf-channel");
        channel.bind("room-changed", () => {
          fetchRooms();
          fetchData();
        });
        channel.bind("taaruf-changed", () => {
          fetchRooms();
          fetchData();
        });
        return () => {
          clearInterval(interval);
          channel.unbind("room-changed");
          channel.unbind("taaruf-changed");
          pusher.unsubscribe("taaruf-channel");
        };
      }
    }
    return () => clearInterval(interval);
  }, [isAuthorized, fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setPage(1);
    }, 400); // Debounce to allow smooth typing
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 100);
    return () => clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    if (selectedParticipant && cardCanvasRef.current) {
      QRCode.toCanvas(cardCanvasRef.current, selectedParticipant.nomorUnik, {
        width: 120,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [selectedParticipant]);

  useEffect(() => {
    if (showAccessQR && accessQRCanvasRef.current) {
      const url = `${window.location.origin}/mandiri/katalog`;
      QRCode.toCanvas(accessQRCanvasRef.current, url, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [showAccessQR]);

  const handleTogglePublic = async () => {
    const newStatus = publicStatus === "open" ? "closed" : "open";
    const { isConfirmed } = await Swal.fire({
      title: "Ubah Status Katalog Publik?",
      text: `Katalog akan ${newStatus === "open" ? "dibuka" : "ditutup"} untuk umum.`,
      icon: "warning",
      showCancelButton: true
    });

    if (isConfirmed) {
      await fetch("/api/mandiri/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "mandiri_katalog_public_status", value: newStatus })
      });
      setPublicStatus(newStatus);
      Swal.fire("Berhasil", "Status diperbarui", "success");
    }
  };

  const handleToggleBoxLove = async () => {
    const newStatus = boxLoveStatus === "open" ? "closed" : "open";
    const { isConfirmed } = await Swal.fire({
      title: "Ubah Status Box Love?",
      text: `Box Love akan ${newStatus === "open" ? "dibuka" : "ditutup"} untuk peserta.`,
      icon: "warning",
      showCancelButton: true
    });

    if (isConfirmed) {
      const res = await fetch("/api/mandiri/box-love", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" })
      });
      if (res.ok) {
        const json = await res.json();
        setBoxLoveStatus(json.value || newStatus);
        Swal.fire("Berhasil", `Box Love ${json.value === "open" ? "dibuka" : "ditutup"}`, "success");
      }
    }
  };

  const handleExportIDCards = async () => {
    setIsExporting(true);
    Swal.fire({
      title: "Menyiapkan ID Card...",
      text: "Sedang mengambil data dan merender kartu. Harap tunggu sebentar.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const params = new URLSearchParams({
        search,
        all: "true",
        mandiriOnly: "true",
        jenisKelamin: gender,
        status: status,
        pendidikan: pendidikan,
        mandiriDaerahId: selectedDaerah,
        mandiriDesaId: selectedDesa,
        mandiriKelompokId: selectedKelompok,
        sortBy: "nomorUrut",
        order: sortOrder,
        ...(selectedKegiatanId ? { kegiatanId: selectedKegiatanId } : {}),
      });
      const res = await fetch(`/api/generus?${params}`, { cache: "no-store" });
      const json = await res.json();
      const allParticipants: GenerusItem[] = json.data || [];

      if (allParticipants.length === 0) {
        Swal.fire("Info", "Tidak ada data peserta untuk diekspor", "info");
        setIsExporting(false);
        return;
      }

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4"
      });

      const cardsPerPage = 1;

      for (let i = 0; i < allParticipants.length; i++) {
        const item = allParticipants[i];

        setExportParticipant(item);

        await new Promise(resolve => setTimeout(resolve, 300));

        const cardElement = exportCardRef.current;
        if (!cardElement) continue;

        const canvas = await html2canvas(cardElement, {
          useCORS: true,
          scale: 2,
          logging: false,
          backgroundColor: null,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) pdf.addPage();

        pdf.addImage(imgData, "JPEG", 52.5, 63.5, 105, 170);

        Swal.update({
          text: `Merender kartu: ${i + 1} dari ${allParticipants.length}`
        });
      }

      pdf.save(`ID_CARDS_${new Date().getTime()}.pdf`);
      Swal.fire("Berhasil", `${allParticipants.length} ID Card telah diekspor.`, "success");
    } catch (e: any) {
      console.error(e);
      Swal.fire("Gagal", "Terjadi kesalahan saat mengekspor PDF", "error");
    } finally {
      setIsExporting(false);
      setExportParticipant(null);
    }
  };

  useEffect(() => {
    if (exportParticipant && exportQRCanvasRef.current) {
      QRCode.toCanvas(exportQRCanvasRef.current, exportParticipant.nomorUnik, {
        width: 120,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [exportParticipant]);

  const handleExportSinglePDF = async (item: GenerusItem) => {
    Swal.fire({
      title: "Menyiapkan PDF...",
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      if (!singleCardRef.current) throw new Error("Card element not found");

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4"
      });

      const canvas = await html2canvas(singleCardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 52.5, 63.5, 105, 170);
      pdf.save(`ID_CARD_${item.nama.replace(/\s+/g, '_')}_${item.nomorUnik}.pdf`);
      Swal.close();
    } catch (e) {
      console.error(e);
      Swal.fire("Gagal", "Gagal mengekspor PDF", "error");
    }
  };

  const handleExportKatalogPDF = async () => {
    Swal.fire({
      title: "Menyiapkan PDF Katalog...",
      text: "Sedang mengambil data dan menyusun laporan. Harap tunggu sebentar.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const params = new URLSearchParams({
        search,
        all: "true",
        mandiriOnly: "true",
        jenisKelamin: gender,
        status: status,
        pendidikan: pendidikan,
        mandiriDaerahId: selectedDaerah,
        mandiriDesaId: selectedDesa,
        mandiriKelompokId: selectedKelompok,
        sortBy: "nomorUrut",
        order: sortOrder,
        ...(selectedKegiatanId ? { kegiatanId: selectedKegiatanId } : {}),
      });
      const res = await fetch(`/api/generus?${params}`, { cache: "no-store" });
      const json = await res.json();
      const allParticipants: GenerusItem[] = json.data || [];

      if (allParticipants.length === 0) {
        Swal.fire("Info", "Tidak ada data untuk diekspor", "info");
        return;
      }

      // Preload images
      const photoMap: Record<string, string> = {};
      const chunkSize = 10;
      for (let i = 0; i < allParticipants.length; i += chunkSize) {
        const chunk = allParticipants.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (item) => {
          if (item.foto) {
            try {
              const url = item.foto.startsWith('http') ? item.foto : `${window.location.origin}${item.foto.startsWith('/') ? '' : '/'}${item.foto}`;
              
              const base64 = await new Promise<string>((resolve) => {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  // crop to square for consistency
                  const size = Math.min(img.width, img.height);
                  canvas.width = size;
                  canvas.height = size;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, size, size);
                    const offsetX = (img.width - size) / 2;
                    const offsetY = (img.height - size) / 2;
                    ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                  } else {
                    resolve('');
                  }
                };
                img.onerror = () => resolve('');
                img.src = url;
              });
              if (base64) photoMap[item.id] = base64;
            } catch (e) {
              // ignore
            }
          }
        }));
        Swal.update({ text: `Mengambil data foto peserta... (${Math.min(i + chunkSize, allParticipants.length)}/${allParticipants.length})` });
      }

      Swal.update({ text: "Mengambil data Tim PNKB & Ibu Gambuh..." });
      let timGambuhList: any[] = [];
      try {
        const tgRes = await fetch(`/api/admin/tim-gambuh${selectedKegiatanId ? `?kegiatanId=${selectedKegiatanId}` : ""}`);
        if (tgRes.ok) {
          const data = await tgRes.json();
          if (Array.isArray(data)) timGambuhList = data;
        }
      } catch(e) {
        // ignore
      }

      const getTimGambuhInfo = (daerahNama: string | null | undefined, tipe: string) => {
        if (!daerahNama) return "..................";
        const found = timGambuhList.filter(t => String(t.daerahNama).toLowerCase() === String(daerahNama).toLowerCase() && String(t.tipe).toLowerCase() === String(tipe).toLowerCase());
        if (found.length === 0) return "..................";
        return found.map(t => `${t.nama}${t.noTelp ? ` (${t.noTelp})` : ""}`).join(", ");
      };

      Swal.update({ text: "Menyusun tabel PDF..." });

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      // Simple Branding / Header
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(30, 58, 138); // Primary blue
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("KATALOG LENGKAP PESERTA", 15, 20);

      const daerahPart = selectedDaerah !== "all" ? daerahList.find(d => String(d?.id) === selectedDaerah)?.nama : "SEMUA_DAERAH";
      const desaPart = selectedDesa !== "all" ? desaList.find(d => String(d?.id) === selectedDesa)?.nama : "";
      const kelompokPart = selectedKelompok !== "all" ? kelompokList.find(k => String(k?.id) === selectedKelompok)?.nama : "";

      let filterSuffix = String(daerahPart || "SEMUA_DAERAH");
      if (desaPart) filterSuffix += `_${desaPart}`;
      if (kelompokPart) filterSuffix += `_${kelompokPart}`;
      const cleanSuffix = filterSuffix.replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase();

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(latestActivity?.judul || "Daftar Peserta Aktif", 15, 28);
      
      let filterText = "Semua Daerah";
      if (selectedDaerah !== "all") {
        const dNama = daerahList.find(d => String(d.id) === selectedDaerah)?.nama || "";
        const dDesa = selectedDesa !== "all" ? desaList.find(d => String(d.id) === selectedDesa)?.nama || "" : "";
        const dKel = selectedKelompok !== "all" ? kelompokList.find(k => String(k.id) === selectedKelompok)?.nama || "" : "";
        filterText = dNama + (dDesa ? ` → ${dDesa}` : "") + (dKel ? ` → ${dKel}` : "");
      }
      doc.text(`Total: ${allParticipants.length} Orang  |  Filter: ${filterText}`, 15, 34);

      doc.setFontSize(9);
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth - 15, 34, { align: "right" });

      // Table Data
      const tableColumn = ["No", "Foto", "Nama Lengkap", "L/P", "Usia", "Status", "Daerah / Desa / Kelompok", "Kontak Tim PNKB / Ibu Gambuh", "Kontak & Media Sosial", "Pendidikan & Pekerjaan"];
      const tableRows = allParticipants.map((item, index) => {
        if (!item) return [];
        const pnkbInfo = getTimGambuhInfo(item.mandiriDesaKota, "PNKB");
        const gambuhInfo = getTimGambuhInfo(item.mandiriDesaKota, "Ibu Gambuh");

        return [
          index + 1,
          item.id || "", // placeholder for Foto
          (item.nama || "-").toUpperCase(),
          item.jenisKelamin || "-",
          calculateAge(item.tanggalLahir ?? undefined),
          (item.panitiaStatus || item.role === 'admin') ? "PANITIA" : "PESERTA",
          `${item.mandiriDesaKota || "-"}\n${item.mandiriDesaNama || "-"}\n${item.mandiriKelompokNama || "-"}`,
          `Tim PNKB: ${pnkbInfo}\nIbu Gambuh: ${gambuhInfo}`,
          [item.noTelp || "-", item.instagram ? `IG: @${item.instagram.replace('@', '')}` : ""].filter(Boolean).join("\n"),
          `${item.pendidikan || "-"}\n${item.pekerjaan || "-"}`
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 9,
          halign: 'center',
          valign: 'middle',
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
          valign: 'middle',
          minCellHeight: 22
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { halign: 'center', cellWidth: 16 },
          2: { fontStyle: 'bold', cellWidth: 35 },
          3: { halign: 'center', cellWidth: 8 },
          4: { halign: 'center', cellWidth: 10 },
          5: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
          6: { cellWidth: 35 },
          7: { cellWidth: 46 },
          8: { cellWidth: 35 },
          9: { cellWidth: 45 },
        },
        margin: { left: 15, right: 15, bottom: 20 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            // Hapus teks (ID) agar tidak tercetak, kita hanya butuh raw value-nya untuk gambar
            data.cell.text = [];
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const itemId = typeof data.cell.raw === 'string' ? data.cell.raw : '';
            if (!itemId) return;
            
            const base64Img = photoMap[itemId];
            if (base64Img) {
              try {
                const dim = 18; 
                const x = data.cell.x + (data.cell.width - dim) / 2;
                const y = data.cell.y + (data.cell.height - dim) / 2;
                doc.addImage(base64Img, "JPEG", x, y, dim, dim);
              } catch (e) {
                // Abaikan error jika gambar tidak valid
              }
            }
          }
        },
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`Halaman ${data.pageNumber} dari ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" });
          doc.text("Sistem Informasi Katalog Peserta - Pashmina", 15, doc.internal.pageSize.height - 10);
        }
      });

      doc.save(`KATALOG_${cleanSuffix}_${new Date().getTime()}.pdf`);
      Swal.fire("Berhasil", "Laporan PDF telah berhasil diunduh.", "success");
    } catch (e: any) {
      console.error(e);
      Swal.fire("Gagal", `Terjadi kesalahan saat membuat PDF: ${e.message || String(e)}`, "error");
    }
  };

  const handleExportExcel = async () => {
    Swal.fire({
      title: "Menyiapkan Excel...",
      text: "Sedang mengambil data. Harap tunggu sebentar.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const params = new URLSearchParams({
        search,
        all: "true",
        mandiriOnly: "true",
        jenisKelamin: gender,
        status: status,
        pendidikan: pendidikan,
        mandiriDaerahId: selectedDaerah,
        mandiriDesaId: selectedDesa,
        mandiriKelompokId: selectedKelompok,
        sortBy: "nomorUrut",
        order: sortOrder,
        ...(selectedKegiatanId ? { kegiatanId: selectedKegiatanId } : {}),
      });
      const res = await fetch(`/api/generus?${params}`, { cache: "no-store" });
      const json = await res.json();
      const allParticipants: GenerusItem[] = json.data || [];

      if (allParticipants.length === 0) {
        Swal.fire("Info", "Tidak ada data untuk diekspor", "info");
        return;
      }

      const excelData = allParticipants.map((item) => ({
        "Nama Lengkap": item.nama,
        "Nomor Peserta": item.nomorUrut || "-",
        "Status": (item.panitiaStatus || item.role === 'admin') ? "Panitia" : "Peserta",
        "Daerah": item.mandiriDesaKota || "-",
        "Desa": item.mandiriDesaNama || item.desaNama || "-",
        "Kelompok": item.mandiriKelompokNama || item.kelompokNama || "-"
      }));

      const wb = utils.book_new();
      const ws = utils.json_to_sheet(excelData);

      // Set column widths
      const wscols = [
        { wch: 30 }, // Nama Lengkap
        { wch: 15 }, // Nomor Peserta
        { wch: 15 }, // Status
        { wch: 20 }, // Daerah
        { wch: 20 }, // Desa
        { wch: 20 }, // Kelompok
      ];
      ws['!cols'] = wscols;

      utils.book_append_sheet(wb, ws, "Daftar Katalog");
      writeFile(wb, `KATALOG_PESERTA_${new Date().getTime()}.xlsx`);

      Swal.fire("Berhasil", "Data telah diekspor ke Excel", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Gagal", "Gagal mengekspor Excel", "error");
    }
  };


  const copyPublicLink = () => {
    const url = `${window.location.origin}/mandiri/katalog`;
    navigator.clipboard.writeText(url);
    Swal.fire({ icon: "success", title: "Link Tersalin", timer: 1000, showConfirmButton: false });
  };

  if (loading && !authorizedChecked) {
    return <div className="flex h-screen items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-t-blue-500 border-slate-200"></div></div>;
  }

  return (
    <>
      <Topbar title="Katalog Peserta" role={myProfile?.role || "admin"} />
      <div className="pdkt-admin-container">
        <header className="page-header">
          <div className="page-header-row">
            <div>
              <h1>Katalog Peserta</h1>
              <p className="subtitle">{kegiatanList.find(k => k.id === selectedKegiatanId)?.judul || latestActivity?.judul || "Daftar Peserta Aktif"}</p>
            </div>
            {kegiatanList.length > 1 && (
              <div id="tour-kegiatan-select" className="kegiatan-header-select">
                <label>Kegiatan:</label>
                <select
                  value={selectedKegiatanId}
                  onChange={(e) => { setSelectedKegiatanId(e.target.value); setPage(1); }}
                >
                  {kegiatanList.map(k => (
                    <option key={k.id} value={k.id}>{k.judul} ({k.kota})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        <div className="toolbar-section">
          <div className="toolbar-top-row">
            <div id="tour-admin-search" className="search-box">
              <Search size={18} className="icon-muted" />
              <input
                type="text"
                placeholder="Cari nama, nomor, desa, atau alamat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="clear-search-btn-admin"
                  onClick={() => setSearchTerm("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="main-actions">
              <button id="tour-toggle-public" className={`btn-toggle-public ${publicStatus === "open" ? "active" : ""}`} onClick={handleTogglePublic}>
                {publicStatus === "open" ? <Eye size={16} /> : <EyeOff size={16} />}
                <span>Public View {publicStatus === "open" ? "(ON)" : "(OFF)"}</span>
              </button>
              {publicStatus === "open" && (
                <button className="btn-icon-sq" onClick={copyPublicLink} title="Salin Link Publik">
                  <Share2 size={16} />
                </button>
              )}
              <button id="tour-toggle-boxlove" className={`btn-box-love ${boxLoveStatus === "open" ? "active" : ""}`} onClick={handleToggleBoxLove}>
                <Heart size={16} />
                <span>Box Love {boxLoveStatus === "open" ? "(ON)" : "(OFF)"}</span>
              </button>
            </div>
          </div>

          <div className="export-actions-bar">
            <div className="export-group">
              <button
                type="button"
                className="btn-export-id-cards"
                onClick={() => startAdminKatalogTour({ force: true })}
                style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fde68a", fontWeight: 600 }}
                title="Buka panduan cara pengisian & penggunaan admin katalog"
              >
                <HelpCircle size={16} />
                <span>Panduan</span>
              </button>
              <button id="tour-qr-access" className="btn-export-id-cards btn-qr-access" onClick={() => setShowAccessQR(true)}>
                <QrCode size={16} />
                <span>QR Akses</span>
              </button>
              <button className="btn-export-id-cards btn-export-excel" onClick={handleExportExcel}>
                <FileSpreadsheet size={16} />
                <span>Export Excel</span>
              </button>
              <button className="btn-export-id-cards btn-export-pdf" onClick={handleExportKatalogPDF}>
                <FileText size={16} />
                <span>Export PDF</span>
              </button>
              <button id="tour-export-id" className="btn-export-id-cards btn-print-id" onClick={handleExportIDCards} disabled={isExporting}>
                <Printer size={16} />
                <span>Cetak ID Card</span>
              </button>
            </div>
          </div>

        <div className="filters-container">
          <div className="filters-header">
            <Settings2 size={14} />
            <span>Filter Data</span>
          </div>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Gender</label>
              <div className="pill-group">
                <button className={gender === "all" ? "active" : ""} onClick={() => setGender("all")}>Semua</button>
                <button className={gender === "L" ? "active" : ""} onClick={() => setGender("L")}>L</button>
                <button className={gender === "P" ? "active" : ""} onClick={() => setGender("P")}>P</button>
              </div>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <div className="pill-group">
                <button className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}>Semua</button>
                <button className={status === "peserta" ? "active" : ""} onClick={() => setStatus("peserta")}>Peserta</button>
                <button className={status === "panitia" ? "active" : ""} onClick={() => setStatus("panitia")}>Panitia</button>
              </div>
            </div>

            <div className="filter-group">
              <label>Pendidikan</label>
              <div className="select-box-wrapper">
                <select
                  className="dropdown-box"
                  value={pendidikan}
                  onChange={(e) => { setPendidikan(e.target.value); setPage(1); }}
                >
                  <option value="all">Semua Pendidikan</option>
                  {pendidikanList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="dropdown-arrow" />
              </div>
            </div>

            <div className="filter-group">
              <label>Daerah</label>
              <div className="select-box-wrapper">
                <select
                  className="dropdown-box"
                  value={selectedDaerah}
                  onChange={(e) => { 
                    setSelectedDaerah(e.target.value); 
                    setSelectedDesa("all");
                    setSelectedKelompok("all");
                    setPage(1); 
                  }}
                >
                  <option value="all">Semua Daerah</option>
                  {daerahList.map(r => (
                    <option key={r.id} value={r.id}>{r.nama}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="dropdown-arrow" />
              </div>
            </div>

            <div className="filter-group">
              <label>Desa</label>
              <div className="select-box-wrapper">
                <select
                  className="dropdown-box"
                  value={selectedDesa}
                  onChange={(e) => { 
                    setSelectedDesa(e.target.value); 
                    setSelectedKelompok("all");
                    setPage(1); 
                  }}
                  disabled={selectedDaerah === "all"}
                >
                  <option value="all">Semua Desa</option>
                  {desaList
                    .filter(d => d.daerahId === Number(selectedDaerah))
                    .map(d => (
                    <option key={d.id} value={d.id}>{d.nama}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="dropdown-arrow" />
              </div>
            </div>

            <div className="filter-group">
              <label>Kelompok</label>
              <div className="select-box-wrapper">
                <select
                  className="dropdown-box"
                  value={selectedKelompok}
                  onChange={(e) => { setSelectedKelompok(e.target.value); setPage(1); }}
                  disabled={selectedDesa === "all"}
                >
                  <option value="all">Semua Kelompok</option>
                  {kelompokList
                    .filter(k => k.desaId === Number(selectedDesa))
                    .map(k => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="dropdown-arrow" />
              </div>
            </div>

            {kegiatanList.length > 1 && (
              <div className="filter-group">
                <label>Kegiatan</label>
                <div className="select-box-wrapper">
                  <select
                    className="dropdown-box"
                    value={selectedKegiatanId}
                    onChange={(e) => { setSelectedKegiatanId(e.target.value); setPage(1); }}
                  >
                    {kegiatanList.map(k => (
                      <option key={k.id} value={k.id}>{k.judul} ({k.kota})</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="dropdown-arrow" />
                </div>
              </div>
            )}

            <div className="filter-group">
              <label>Urutan No</label>
              <button 
                className={`pill-btn-sort ${sortOrder === 'asc' ? 'asc' : 'desc'}`}
                onClick={() => {
                  setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  setPage(1);
                }}
              >
                <ArrowUpDown size={14} />
                <span>{sortOrder === 'asc' ? 'Terkecil' : 'Terbesar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="tour-participant-grid" className="grid-section">
        {data.map((item) => {
          const isPulang = item.keterangan === "pulang";
          return (
          <div key={item.id} className={`participant-card gender-${item.jenisKelamin?.toLowerCase()} ${isPulang ? "disabled" : ""}`}>
            <div className="card-inner" style={{ filter: isPulang ? "blur(3px)" : "none", pointerEvents: isPulang ? "none" : "auto" }}>
              <div className="card-main">
                <div className="card-photo-col">
                  <div className="photo-wrapper photo-clickable" onClick={() => setZoomPhoto(item)} title="Lihat foto">
                    {item.foto ? <img src={item.foto} alt={item.nama} /> : <div className="photo-placeholder">{item.nama.charAt(0)}</div>}
                    <div className={`status-badge ${item.panitiaStatus || item.role === 'admin' ? 'panitia' : 'peserta'}`}>
                      {siteLogo && <img src={siteLogo} alt="" style={{ width: '10px', height: '10px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />}
                      <span>{item.panitiaStatus || item.role === 'admin' ? "Panitia" : "Peserta"}</span>
                    </div>
                    <div className="photo-zoom-hint">🔍</div>
                  </div>
                  <div className="no-urut-tag">#{item.nomorUrut || "000"}</div>
                </div>

                <div className="card-info-col">
                  <div className="info-header">
                    <h3 className="participant-name">{item.nama}</h3>
                    <div className="region-tag">
                      <MapPin size={11} />
                      <span>{item.mandiriDesaKota || "Tanpa Kota"} &bull; {item.mandiriDesaNama || item.desaNama || "Desa"}</span>
                    </div>
                    {item.nomorUnik && (
                      <div 
                        className="nomor-unik-badge" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(item.nomorUnik || '');
                          Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, icon: 'success', title: 'Nomor unik disalin' });
                        }}
                        title="Klik untuk menyalin"
                      >
                        <Fingerprint size={12} />
                        <span>{item.nomorUnik}</span>
                        <Copy size={11} />
                      </div>
                    )}
                  </div>

                  <div className="tags-row">
                    <div className="info-pill"><User size={11} /> <span>{calculateAge(item.tanggalLahir ?? undefined)} thn &bull; {item.jenisKelamin === 'L' ? 'Laki-laki' : item.jenisKelamin === 'P' ? 'Perempuan' : item.jenisKelamin || '-'}</span></div>
                    <div className="info-pill"><GraduationCap size={11} /> <span>{item.pendidikan || "-"}</span></div>
                  </div>

                  <div className="contact-info">
                    {item.noTelp && (
                      <div className="contact-item">
                        <Phone size={12} className="text-wa" />
                        <a
                          href={`https://wa.me/${item.noTelp.replace(/\D/g, '').replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wa-link-text"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.noTelp}
                        </a>
                      </div>
                    )}
                    <div className="contact-item">
                      <Briefcase size={12} className="text-job" />
                      <span>{item.pekerjaan || "Belum Bekerja"}</span>
                    </div>
                    {item.instagram && (
                      <div className="contact-item">
                        <Instagram size={12} className="text-ig" />
                        <a
                          href={`https://instagram.com/${item.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="instagram-link-contact"
                          onClick={(e) => e.stopPropagation()}
                        >
                          @{item.instagram.replace('@', '')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Call Badge */}
              {(() => {
                const call = activeRooms.find(r => r.pengirimNama === item.nama || r.penerimaNama === item.nama);
                if (call) {
                  const partner = item.nama === call.pengirimNama ? call.penerimaNama : call.pengirimNama;
                  return (
                    <div className="active-room-card">
                      <div className="active-room-title">
                        <PhoneCall size={15} /> Sedang Dipanggil Ta&apos;aruf
                      </div>
                      <div className="active-room-info">
                        <div><span>Bersama:</span> {partner}</div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="card-footer">
                <button 
                  className="footer-btn btn-view-profile" 
                  onClick={() => setProfileDetail(item)}
                >
                  <User size={14} />
                  <span>Lihat Profile</span>
                </button>
              </div>
            </div>

            {isPulang && (
              <div className="pulang-overlay">
                <div className="pulang-notice">
                  Mohon maaf, peserta {item.nama} pulang lebih awal.
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {total > limit && (
        <div className="pagination-bar">
          <div className="pagination-info">
            Menampilkan <strong>{(page - 1) * limit + 1}</strong> - <strong>{Math.min(page * limit, total)}</strong> dari <strong>{total}</strong> peserta
          </div>
          <div className="pagination-controls">
            <button
              className="page-btn page-nav"
              disabled={page <= 1}
              onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              &larr; Prev
            </button>
            {(() => {
              const totalPages = Math.ceil(total / limit);
              let start = Math.max(1, page - 2);
              let end = Math.min(totalPages, start + 4);
              if (end - start < 4) start = Math.max(1, end - 4);
              start = Math.max(1, start);
              const pages = [];
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map(p => (
                <button
                  key={p}
                  className={`page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  {p}
                </button>
              ));
            })()}
            <button
              className="page-btn page-nav"
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {zoomPhoto && (
        <div className="modal-overlay zoom-overlay" onClick={() => setZoomPhoto(null)}>
          <div className="zoom-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setZoomPhoto(null)}>&times;</button>
            {zoomPhoto.foto
              ? <img src={zoomPhoto.foto} alt={zoomPhoto.nama} className="zoom-img" />
              : <div className="zoom-placeholder">{zoomPhoto.nama.charAt(0)}</div>
            }
            <div className="zoom-name">{zoomPhoto.nama}</div>
            <button className="zoom-detail-btn" onClick={() => { setZoomPhoto(null); setProfileDetail(zoomPhoto); }}>
              <User size={14} /> Lihat Profil Lengkap
            </button>
          </div>
        </div>
      )}

      {profileDetail && (
        <div className="modal-overlay" onClick={() => setProfileDetail(null)}>
          <div className="modal-content profile-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setProfileDetail(null)}>&times;</button>
            <div className="pd-header" style={{ background: profileDetail.jenisKelamin === 'P' ? 'linear-gradient(135deg, #422830, #613946)' : 'linear-gradient(135deg, #17241b, #26392d)' }}>
              <div className="pd-photo">
                {profileDetail.foto
                  ? <img src={profileDetail.foto} alt={profileDetail.nama} />
                  : <div className="pd-initials">{profileDetail.nama.charAt(0)}</div>
                }
              </div>
              <div className="pd-header-info">
                <div className="pd-status-badge">{profileDetail.panitiaStatus || profileDetail.role === 'admin' ? "Panitia" : "Peserta"} #{profileDetail.nomorUrut || "-"}</div>
                <h2 className="pd-name">{profileDetail.nama}</h2>
                <div className="pd-region"><MapPin size={12} /> {profileDetail.mandiriDesaKota || "-"} &bull; {profileDetail.mandiriDesaNama || profileDetail.desaNama || "-"}</div>
              </div>
            </div>
            <div className="pd-body">
              <div className="pd-grid">
                <div className="pd-item">
                  <span className="pd-label">Jenis Kelamin</span>
                  <span className="pd-value">{profileDetail.jenisKelamin === 'L' ? 'Laki-laki' : profileDetail.jenisKelamin === 'P' ? 'Perempuan' : '-'}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Usia</span>
                  <span className="pd-value">{calculateAge(profileDetail.tanggalLahir ?? undefined)} tahun</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Tempat Lahir</span>
                  <span className="pd-value">{profileDetail.tempatLahir || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Tanggal Lahir</span>
                  <span className="pd-value">{profileDetail.tanggalLahir || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Status Nikah</span>
                  <span className="pd-value">{profileDetail.statusNikah || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Jumlah Anak</span>
                  <span className="pd-value">{profileDetail.jumlahAnak ?? "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Pendidikan</span>
                  <span className="pd-value">{profileDetail.pendidikan || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Pekerjaan</span>
                  <span className="pd-value">{profileDetail.pekerjaan || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Suku</span>
                  <span className="pd-value">{profileDetail.suku || "-"}</span>
                </div>
                {profileDetail.noTelp && (
                  <div className="pd-item">
                    <span className="pd-label">WhatsApp</span>
                    <a href={`https://wa.me/${profileDetail.noTelp.replace(/\D/g,'').replace(/^0/,'62')}`} target="_blank" rel="noopener noreferrer" className="pd-link pd-link-wa">{profileDetail.noTelp}</a>
                  </div>
                )}
                {profileDetail.instagram && (
                  <div className="pd-item">
                    <span className="pd-label">Instagram</span>
                    <a href={`https://instagram.com/${profileDetail.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="pd-link pd-link-ig">@{profileDetail.instagram.replace('@','')}</a>
                  </div>
                )}
                {profileDetail.hobi && (
                  <div className="pd-item pd-item-full">
                    <span className="pd-label">Hobi</span>
                    <span className="pd-value">{profileDetail.hobi}</span>
                  </div>
                )}
                {profileDetail.makananMinumanFavorit && (
                  <div className="pd-item pd-item-full">
                    <span className="pd-label">Makanan / Minuman Favorit</span>
                    <span className="pd-value">{profileDetail.makananMinumanFavorit}</span>
                  </div>
                )}
                {profileDetail.kriteriaPasangan && (
                  <div className="pd-item pd-item-full">
                    <span className="pd-label">Kriteria Pasangan</span>
                    <span className="pd-value">{profileDetail.kriteriaPasangan}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAccessQR && (
        <div className="modal-overlay" onClick={() => setShowAccessQR(false)}>
          <div className="modal-content" style={{ maxWidth: '500px', background: 'white', borderRadius: '20px', padding: '20px', border: '1px solid #e6dfd3' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowAccessQR(false)}>&times;</button>
            <div className="qr-access-container" style={{ textAlign: 'center', padding: '16px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#26392d', fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Barcode Akses Katalog</h2>
              <p style={{ color: '#5e6d62', marginBottom: '20px', fontSize: '14px' }}>Scan barcode ini untuk masuk ke halaman Katalog Peserta secara mandiri.</p>

              <div style={{ background: '#faf7f2', padding: '20px', borderRadius: '20px', display: 'inline-flex', boxShadow: '0 4px 12px rgba(23,36,27,0.06)', border: '1px solid #e6dfd3', marginBottom: '20px' }}>
                <canvas ref={accessQRCanvasRef} style={{ width: '280px', height: '280px' }} />
              </div>

              <div className="url-display" style={{ background: '#ffffff', padding: '10px 16px', borderRadius: '10px', border: '1px dashed #e6dfd3', marginBottom: '24px' }}>
                <span style={{ fontSize: '13px', color: '#5e6d62', fontWeight: '600' }}>{window.location.origin}/mandiri/katalog</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="btn-print-card"
                  style={{ background: '#26392d', color: '#ffffff', border: '1px solid #26392d' }}
                  onClick={() => {
                    const canvas = accessQRCanvasRef.current;
                    if (canvas) {
                      const link = document.createElement('a');
                      link.download = `QR_AKSES_KATALOG_${new Date().getTime()}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    }
                  }}
                >
                  <Download size={16} /> <span>Unduh Barcode</span>
                </button>
                <button className="btn-print-card" style={{ background: '#faf7f2', color: '#26392d', border: '1px solid #e6dfd3' }} onClick={() => window.print()}>
                  <Printer size={16} /> <span>Cetak</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedParticipant && (
        <div className="modal-overlay" onClick={() => setSelectedParticipant(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedParticipant(null)}>&times;</button>
            <div ref={singleCardRef} className={`id-card-comprehensive role-${["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "pengurus" :
              ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") || selectedParticipant.panitiaStatus ? "panitia" :
                "peserta"
              }`}>
              <div className="id-watermark-container">
                <div className="id-watermark wm-1">
                  {["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "PENGURUS" :
                    ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") ? "PANITIA" :
                      "PESERTA"}
                </div>
                <div className="id-watermark wm-2">
                  {["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "PENGURUS" :
                    ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") ? "PANITIA" :
                      "PESERTA"}
                </div>
                <div className="id-watermark wm-3">
                  {["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "PENGURUS" :
                    ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") || selectedParticipant.panitiaStatus ? "PANITIA" :
                      "PESERTA"}
                </div>
              </div>
              <div className="id-card-header">
                <div className="id-logo-box">
                  {siteLogo ? (
                    <img src={siteLogo} alt="Logo" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                  ) : (
                    <div style={{ width: "24px", height: "24px", background: "rgba(255,255,255,0.2)", borderRadius: "6px" }} />
                  )}
                  <span>{["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "PENGURUS" :
                    ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") || selectedParticipant.panitiaStatus ? "PANITIA" :
                      "PESERTA"}</span>
                </div>
                <div className="id-org-name" style={{ textTransform: "uppercase" }}>
                  {selectedParticipant.mandiriDesaKota || "Jakarta Barat 2"} &bull; {selectedParticipant.mandiriDesaNama || selectedParticipant.desaNama || "Semua"}
                </div>
              </div>

              <div className="id-card-main-content">
                <div className="id-photo-section">
                  <div className="id-photo-frame">
                    {selectedParticipant.foto ? <img src={selectedParticipant.foto} alt={selectedParticipant.nama} /> : <div className="id-initials-modal">{selectedParticipant.nama.charAt(0)}</div>}
                    <div className="id-kategori-sticker">
                      {["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "Pengurus" :
                        ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") || selectedParticipant.panitiaStatus ? "Panitia" :
                          "Peserta"}
                    </div>
                  </div>
                </div>

                <div className="id-info-section">
                  <h1 className="id-full-name">{selectedParticipant.nama}</h1>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "center", justifyContent: "center", marginTop: "10px" }}>
                    <div className="id-member-code" style={{ fontSize: "16px", fontWeight: "900" }}>ID: {selectedParticipant.nomorUnik}</div>
                    {selectedParticipant.nomorUrut && (
                      <div className="id-member-code" style={{ opacity: 1, color: "white", background: "rgba(255,255,255,0.15)", padding: "4px 15px", borderRadius: "8px", border: "1.5px solid rgba(255,255,255,0.2)", fontSize: "18px", fontWeight: "950" }}>
                        NO. URUT: {selectedParticipant.nomorUrut}
                      </div>
                    )}
                  </div>


                  <div className="id-qr-box" style={{ padding: "10px", borderRadius: "14px", marginTop: "15px", background: "white", width: "140px", margin: "15px auto" }}>
                    <canvas ref={cardCanvasRef} style={{ width: '120px', height: '120px' }} />
                    <div className="id-qr-label" style={{ fontSize: "9px", marginTop: "6px", fontWeight: "900", color: "#000000", textTransform: "uppercase" }}>Verified Digital ID</div>
                  </div>
                </div>

                <div className="id-footer-section">
                  <div className="id-footer-grid">
                    {selectedParticipant.noTelp && (
                      <div className="id-footer-item">
                        <label>Nomor WhatsApp</label>
                        <p>{selectedParticipant.noTelp}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="id-card-footer">
                <div className="id-loc-pill">
                  <MapPin size={14} />
                  <span>{selectedParticipant.mandiriDesaKota || "-"} &bull; {selectedParticipant.mandiriDesaNama || selectedParticipant.desaNama || "-"}</span>
                </div>
                <div className="id-footer-right">
                  Pashmina &copy; 2026
                </div>
              </div>
              <div className="id-card-seal" />
            </div>

            <div className="modal-actions-print" style={{ gap: '12px' }}>
              <button className="btn-print-card" onClick={() => window.print()} style={{ background: '#64748b' }}>
                <Printer size={16} /> <span>Print</span>
              </button>
              <button className="btn-print-card" onClick={() => handleExportSinglePDF(selectedParticipant)}>
                <Download size={16} /> <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Export Card Renderer */}
      <div style={{ position: "absolute", left: "-9999px", top: 0, zIndex: -100 }}>
        {exportParticipant && (
          <div ref={exportCardRef} className={`id-card-comprehensive role-${["pengurus_daerah", "desa", "kelompok"].includes(exportParticipant.role || "") ? "pengurus" :
            ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(exportParticipant.role || "") || exportParticipant.panitiaStatus ? "panitia" :
              "peserta"
            }`} style={{ boxShadow: 'none' }}>
            <div className="id-watermark-container">
              <div className="id-watermark wm-1">
                {["pengurus_daerah", "desa", "kelompok"].includes(exportParticipant.role || "") ? "PENGURUS" :
                  ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(exportParticipant.role || "") || exportParticipant.panitiaStatus ? "PANITIA" :
                    "PESERTA"}
              </div>
              <div className="id-watermark wm-2">
                {["pengurus_daerah", "desa", "kelompok"].includes(exportParticipant.role || "") ? "PENGURUS" :
                  ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(exportParticipant.role || "") || exportParticipant.panitiaStatus ? "PANITIA" :
                    "PESERTA"}
              </div>
            </div>
            <div className="id-card-header">
              <div className="id-logo-box">
                {siteLogo ? (
                  <img src={siteLogo} alt="Logo" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                ) : (
                  <div style={{ width: "24px", height: "24px", background: "rgba(255,255,255,0.2)", borderRadius: "6px" }} />
                )}
                <span>{["pengurus_daerah", "desa", "kelompok"].includes(exportParticipant.role || "") ? "PENGURUS" :
                  ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(exportParticipant.role || "") || exportParticipant.panitiaStatus ? "PANITIA" :
                    "PESERTA"}</span>
              </div>
              <div className="id-org-name">
                {exportParticipant.mandiriDesaKota || "Jakarta Barat 2"} &bull; {exportParticipant.mandiriDesaNama || exportParticipant.desaNama || "Semua"}
              </div>
            </div>

            <div className="id-card-main-content">
              <div className="id-photo-section">
                <div className="id-photo-frame">
                  {exportParticipant.foto ? <img src={exportParticipant.foto} alt={exportParticipant.nama} crossOrigin="anonymous" /> : <div className="id-initials-modal">{exportParticipant.nama.charAt(0)}</div>}
                  <div className="id-kategori-sticker">
                    {["pengurus_daerah", "desa", "kelompok"].includes(exportParticipant.role || "") ? "Pengurus" :
                      ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(exportParticipant.role || "") || exportParticipant.panitiaStatus ? "Panitia" :
                        "Peserta"}
                  </div>
                </div>
              </div>

              <div className="id-info-section">
                <h1 className="id-full-name">{exportParticipant.nama}</h1>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "center", justifyContent: "center", marginTop: "10px" }}>
                  <div className="id-member-code" style={{ fontSize: "16px", fontWeight: "900" }}>ID: {exportParticipant.nomorUnik}</div>
                  {exportParticipant.nomorUrut && (
                    <div className="id-member-code" style={{ opacity: 1, color: "white", background: "rgba(255,255,255,0.15)", padding: "4px 15px", borderRadius: "8px", border: "1.5px solid rgba(255,255,255,0.2)", fontSize: "18px", fontWeight: "950" }}>
                      NO. URUT: {exportParticipant.nomorUrut}
                    </div>
                  )}
                </div>


                <div className="id-qr-box" style={{ padding: "10px", borderRadius: "14px", marginTop: "15px", background: "white", width: "140px", margin: "15px auto" }}>
                  <canvas ref={exportQRCanvasRef} style={{ width: '120px', height: '120px' }} />
                  <div className="id-qr-label" style={{ fontSize: "9px", marginTop: "6px", fontWeight: "900", color: "#000000", textTransform: "uppercase" }}>Verified Digital ID</div>
                </div>
              </div>
              <div className="id-footer-section">
              </div>
            </div>

            <div className="id-card-footer">
              <div className="id-loc-pill">
                <MapPin size={14} />
                <span>{exportParticipant.mandiriDesaKota || "-"} &bull; {exportParticipant.mandiriDesaNama || exportParticipant.desaNama || "-"}</span>
              </div>
              <div className="id-footer-right">Pashmina &copy; 2026</div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .pdkt-admin-container { 
          padding: 24px 32px 60px; 
          background: var(--bg, #faf7f2); 
          min-height: calc(100vh - 64px); 
          font-family: var(--font-inter), system-ui, -apple-system, sans-serif; 
          color: var(--text, #1f2b23);
        }

        /* Header Styles */
        .page-header { 
          margin-bottom: 24px; 
        }
        .page-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .page-header h1 { 
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 32px; 
          font-weight: 700; 
          margin: 0; 
          color: #26392d;
          letter-spacing: -0.02em;
        }
        .subtitle { 
          color: #5e6d62; 
          font-size: 14px; 
          margin-top: 4px; 
          font-weight: 500; 
        }
        .kegiatan-header-select {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          padding: 6px 14px;
          border-radius: 10px;
          border: 1px solid #e6dfd3;
          box-shadow: 0 1px 3px rgba(23, 36, 27, 0.04);
        }
        .kegiatan-header-select label {
          font-size: 12px;
          font-weight: 700;
          color: #5e6d62;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .kegiatan-header-select select {
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: #26392d;
          outline: none;
          cursor: pointer;
        }

        /* Toolbar Styles */
        .toolbar-section { 
          background: #ffffff; 
          padding: 24px; 
          border-radius: 16px; 
          box-shadow: 0 4px 12px -2px rgba(23, 36, 27, 0.05); 
          border: 1px solid #e6dfd3; 
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .toolbar-top-row {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-box { 
          flex: 2; 
          min-width: 280px;
          display: flex; 
          align-items: center; 
          gap: 12px; 
          background: #faf7f2; 
          border: 1px solid #e6dfd3; 
          padding: 10px 16px; 
          border-radius: 10px; 
          transition: all 0.15s ease;
          position: relative;
        }
        .search-box:focus-within {
          background: #ffffff;
          border-color: #3d5a45;
          box-shadow: 0 0 0 3px rgba(61, 90, 69, 0.1);
        }
        .search-box input { 
          border: none; 
          background: transparent; 
          outline: none; 
          width: 100%; 
          color: #1f2b23; 
          font-size: 14px;
          font-weight: 500; 
        }
        .search-box input::placeholder {
          color: #8e9e92;
        }
        .clear-search-btn-admin {
          background: #f4efe6;
          border: none;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #5e6d62;
          transition: 0.15s;
        }
        .clear-search-btn-admin:hover {
          background: #e6dfd3;
          color: #1f2b23;
        }

        .main-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-toggle-public {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 16px;
          height: 40px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid #fecaca;
          background: #fff5f5;
          color: #dc2626;
        }
        .btn-toggle-public.active {
          background: #eef4f0;
          border-color: rgba(61, 90, 69, 0.35);
          color: #26392d;
        }
        .btn-toggle-public:hover {
          opacity: 0.9;
        }

        .btn-box-love {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 16px;
          height: 40px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid #e6dfd3;
          background: #faf7f2;
          color: #5e6d62;
        }
        .btn-box-love.active {
          background: #fbf7ee;
          border-color: #c5a059;
          color: #a37f37;
          box-shadow: 0 2px 6px rgba(197, 160, 89, 0.15);
        }

        .btn-icon-sq {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1px solid #e6dfd3;
          background: #ffffff;
          color: #5e6d62;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-icon-sq:hover {
          border-color: #c5a059;
          color: #26392d;
        }

        .export-actions-bar {
          background: #faf7f2;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #e6dfd3;
        }
        .export-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn-export-id-cards {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 16px;
          height: 38px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }
        .btn-export-id-cards:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .btn-export-id-cards:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-export-excel {
          background: #26392d;
          color: #ffffff;
          border-color: #26392d;
        }
        .btn-export-excel:hover:not(:disabled) {
          background: #3d5a45;
          border-color: #3d5a45;
        }
        .btn-export-pdf {
          background: #3d5a45;
          color: #ffffff;
          border-color: #3d5a45;
        }
        .btn-export-pdf:hover:not(:disabled) {
          background: #26392d;
          border-color: #26392d;
        }
        .btn-qr-access {
          background: #ffffff;
          color: #26392d;
          border-color: #e6dfd3;
        }
        .btn-qr-access:hover {
          background: #faf7f2;
          border-color: #c5a059;
        }
        .btn-print-id {
          background: #ffffff;
          color: #26392d;
          border-color: #e6dfd3;
        }
        .btn-print-id:hover:not(:disabled) {
          background: #faf7f2;
          border-color: #c5a059;
        }

        .filters-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .filters-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          color: #26392d;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 16px;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .filter-group label {
          font-size: 11px;
          font-weight: 700;
          color: #5e6d62;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-left: 2px;
        }
        .pill-group { 
          display: flex; 
          background: #f4efe6; 
          padding: 3px; 
          border-radius: 10px; 
          border: 1px solid #e6dfd3;
          gap: 3px; 
        }
        .pill-group button { 
          border: none; 
          background: transparent; 
          padding: 7px 10px; 
          border-radius: 7px; 
          font-size: 12px; 
          font-weight: 600; 
          color: #5e6d62; 
          cursor: pointer; 
          transition: all 0.15s ease; 
          flex: 1;
        }
        .pill-group button:hover {
          color: #26392d;
        }
        .pill-group button.active { 
          background: #26392d; 
          color: #ffffff; 
          box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
        }

        .select-box-wrapper { position: relative; display: flex; align-items: center; }
        .dropdown-box { 
          appearance: none;
          background: #ffffff; 
          border: 1px solid #e6dfd3; 
          padding: 9px 34px 9px 12px; 
          border-radius: 10px; 
          font-size: 12px; 
          font-weight: 600; 
          color: #1f2b23; 
          cursor: pointer;
          outline: none;
          width: 100%;
          transition: all 0.15s ease;
        }
        .dropdown-box:focus {
          border-color: #3d5a45;
          box-shadow: 0 0 0 3px rgba(61, 90, 69, 0.1);
        }
        .dropdown-box:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #faf7f2;
        }
        .dropdown-arrow {
          position: absolute;
          right: 12px;
          pointer-events: none;
          color: #8e9e92;
        }

        .pill-btn-sort {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          height: 38px;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid #e6dfd3;
          background: #ffffff;
          color: #26392d;
        }
        .pill-btn-sort:hover {
          border-color: #c5a059;
        }
        .pill-btn-sort.asc {
          background: #eef4f0;
          color: #26392d;
          border-color: rgba(61, 90, 69, 0.35);
        }
        .pill-btn-sort.desc {
          background: #fff5f5;
          color: #dc2626;
          border-color: #fecaca;
        }

        /* Grid & Card Styles */
        .grid-section { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); 
          gap: 20px; 
        }

        .participant-card { 
          background: #ffffff; 
          border-radius: 18px; 
          border: 1px solid #e6dfd3; 
          box-shadow: 0 4px 12px -2px rgba(23, 36, 27, 0.05); 
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
          overflow: hidden; 
          position: relative;
        }
        .participant-card:hover { 
          transform: translateY(-3px); 
          box-shadow: 0 12px 24px -4px rgba(23, 36, 27, 0.09); 
          border-color: #c5a059; 
        }
        .card-inner {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .card-main {
          padding: 20px;
          display: flex;
          gap: 18px;
          flex: 1;
        }
        .card-photo-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .photo-wrapper {
          width: 88px;
          height: 88px;
          border-radius: 16px;
          position: relative;
          background: #faf7f2;
          overflow: hidden;
          border: 2px solid #e6dfd3;
          box-shadow: 0 4px 12px rgba(23, 36, 27, 0.06);
        }
        .photo-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 36px;
          font-weight: 700;
          color: #26392d;
          background: #eef4f0;
        }
        .status-badge {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 3px 0;
          font-size: 9px;
          font-weight: 800;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #ffffff;
        }
        .status-badge.peserta { background: #26392d; }
        .status-badge.panitia { background: #c5a059; }

        .no-urut-tag {
          font-size: 12px;
          font-weight: 700;
          color: #26392d;
          font-family: 'JetBrains Mono', monospace;
          background: #f4efe6;
          border: 1px solid #e6dfd3;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .card-info-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }
        .info-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .participant-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 21px;
          font-weight: 700;
          margin: 0;
          color: #1f2b23;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.25;
        }
        .region-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #5e6d62;
          font-size: 12px;
          font-weight: 500;
        }
        .region-tag svg { color: #c5a059; }

        .nomor-unik-badge {
          margin-top: 2px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #26392d;
          background: #f4efe6;
          border: 1px solid #e6dfd3;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          transition: all 0.15s ease;
          width: fit-content;
        }
        .nomor-unik-badge:hover {
          background: #ece3d4;
          border-color: #c5a059;
        }

        .tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .info-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          background: #faf7f2;
          border: 1px solid #e6dfd3;
          font-size: 11px;
          font-weight: 600;
          color: #5e6d62;
        }
        .info-pill svg { color: #8e9e92; }

        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: auto;
        }
        .contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 500;
          color: #1f2b23;
        }
        .text-wa { color: #2e7d32; }
        .wa-link-text { 
          color: #2e7d32; 
          text-decoration: none; 
          font-weight: 600; 
        }
        .wa-link-text:hover { 
          text-decoration: underline; 
        }
        .text-job { color: #3d5a45; }
        .text-ig { color: #a37f37; }
        .instagram-link-contact {
          color: #a37f37;
          text-decoration: none;
          font-weight: 600;
        }
        .instagram-link-contact:hover {
          text-decoration: underline;
        }

        .active-room-card {
          margin: 0 20px 16px;
          padding: 14px 16px;
          background: #fbf7ee;
          border: 1px solid #c5a059;
          border-radius: 12px;
          color: #26392d;
        }
        .active-room-title {
          font-weight: 700;
          font-size: 15px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #a37f37;
        }
        .active-room-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 13px;
        }
        .active-room-info span { font-weight: 700; }

        .card-footer {
          display: flex;
          padding: 12px 20px;
          gap: 10px;
          background: #faf7f2;
          border-top: 1px solid #e6dfd3;
        }
        .footer-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 38px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
        }
        .btn-view-profile {
          background: #26392d;
          color: #ffffff;
          border: 1px solid #26392d;
        }
        .btn-view-profile:hover { 
          background: #3d5a45; 
          border-color: #3d5a45;
        }

        /* Pulang overlay */
        .pulang-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          padding: 24px;
        }
        .pulang-notice {
          background: rgba(255, 255, 255, 0.95);
          padding: 16px 20px;
          border-radius: 14px;
          text-align: center;
          color: #dc2626;
          font-weight: 600;
          font-size: 13px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border: 1px solid #fecaca;
          line-height: 1.5;
          backdrop-filter: blur(4px);
        }

        /* Pagination */
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 32px;
          padding: 16px 20px;
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e6dfd3;
        }
        .pagination-info {
          font-size: 13px;
          color: #5e6d62;
        }
        .pagination-info strong {
          color: #1f2b23;
        }
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .page-btn {
          min-width: 36px;
          height: 36px;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid #e6dfd3;
          background: #faf7f2;
          color: #1f2b23;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .page-btn:hover:not(:disabled) {
          border-color: #c5a059;
          color: #26392d;
        }
        .page-btn.active {
          background: #26392d;
          border-color: #26392d;
          color: #ffffff;
        }
        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .page-nav {
          padding: 0 14px;
        }

        /* Photo clickable */
        .photo-clickable { cursor: pointer; }
        .photo-zoom-hint {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(23, 36, 27, 0.35);
          font-size: 18px;
          opacity: 0;
          transition: opacity 0.2s;
          border-radius: 14px;
        }
        .photo-clickable:hover .photo-zoom-hint { opacity: 1; }

        /* Zoom Photo Modal */
        .zoom-overlay { background: rgba(23, 36, 27, 0.7); backdrop-filter: blur(8px); }
        .zoom-modal {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 20px;
        }
        .zoom-img {
          width: 320px;
          height: 320px;
          object-fit: cover;
          border-radius: 20px;
          border: 4px solid #ffffff;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .zoom-placeholder {
          width: 320px;
          height: 320px;
          border-radius: 20px;
          border: 4px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 100px;
          font-weight: 700;
          color: #26392d;
          background: #eef4f0;
        }
        .zoom-name {
          color: #ffffff;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          text-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        .zoom-detail-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #26392d;
          color: #ffffff;
          border: 1px solid rgba(255,255,255,0.2);
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.15s;
        }
        .zoom-detail-btn:hover { background: #3d5a45; }

        /* Profile Detail Modal */
        .profile-detail-modal {
          background: #ffffff;
          border-radius: 20px;
          width: 500px;
          max-width: 100%;
          overflow: hidden;
          padding: 0 !important;
          border: 1px solid #e6dfd3;
          box-shadow: 0 20px 50px rgba(23, 36, 27, 0.2);
        }
        .pd-header {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 24px;
          color: #ffffff;
        }
        .pd-photo {
          width: 76px;
          height: 76px;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.5);
          flex-shrink: 0;
          background: rgba(255,255,255,0.1);
        }
        .pd-photo img { width: 100%; height: 100%; object-fit: cover; }
        .pd-initials {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 32px;
          font-weight: 700;
          background: rgba(255,255,255,0.2);
        }
        .pd-header-info { flex: 1; min-width: 0; }
        .pd-status-badge {
          display: inline-block;
          background: rgba(197, 160, 89, 0.25);
          border: 1px solid rgba(197, 160, 89, 0.45);
          color: #fbf7ee;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .pd-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 4px;
          line-height: 1.2;
          color: #ffffff;
        }
        .pd-region {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 500;
          opacity: 0.9;
        }
        .pd-body { padding: 20px 24px; }
        .pd-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .pd-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pd-item-full { grid-column: 1 / -1; }
        .pd-label {
          font-size: 10px;
          font-weight: 700;
          color: #8e9e92;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pd-value {
          font-size: 13px;
          font-weight: 600;
          color: #1f2b23;
          line-height: 1.4;
        }
        .pd-link {
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }
        .pd-link-wa { color: #2e7d32; }
        .pd-link-wa:hover { text-decoration: underline; }
        .pd-link-ig { color: #a37f37; }
        .pd-link-ig:hover { text-decoration: underline; }
        .pd-footer {
          padding: 14px 24px;
          display: flex;
          justify-content: center;
          border-top: 1px solid #e6dfd3;
          background: #faf7f2;
        }

        /* Modal & Print Styles (Preserved/Enhanced) */
        .modal-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(23, 36, 27, 0.5); 
          backdrop-filter: blur(4px); 
          z-index: 1000; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          padding: 20px; 
        }
        .modal-content { 
          position: relative; 
          max-width: 100%; 
          max-height: 95vh; 
          overflow-y: auto; 
          padding: 10px; 
        }
        .close-modal { 
          position: absolute; 
          top: 0; 
          right: 0; 
          width: 40px; 
          height: 40px; 
          border-radius: 50%; 
          background: #ffffff; 
          border: 1px solid #e6dfd3; 
          font-size: 22px; 
          font-weight: 700; 
          cursor: pointer; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
          z-index: 10; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #5e6d62;
          transition: 0.15s;
        }
        .close-modal:hover {
          color: #1f2b23;
          border-color: #c5a059;
        }
        
        @media (max-width: 992px) {
          .toolbar-top-row { flex-direction: column; align-items: stretch; }
          .search-box { width: 100%; flex: none; }
          .main-actions { justify-content: space-between; }
        }

        @media (max-width: 768px) {
          .pdkt-admin-container { padding: 16px; }
          .toolbar-section { padding: 16px; }
          .export-group { justify-content: center; }
          .btn-export-id-cards { flex: 1; min-width: 140px; justify-content: center; }
          .filters-grid { grid-template-columns: 1fr; }
          .grid-section { grid-template-columns: 1fr; }
          .page-header-row { flex-direction: column; align-items: flex-start; }
          .kegiatan-header-select { width: 100%; justify-content: space-between; }
        }
        .modal-actions-print { margin-top: 20px; display: flex; justify-content: center; gap: 12px; }
        .btn-print-card { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          background: #26392d; 
          color: white; 
          border: 1px solid #26392d; 
          padding: 10px 20px; 
          border-radius: 10px; 
          font-size: 13px; 
          font-weight: 600; 
          cursor: pointer; 
          transition: 0.15s; 
        }
        .btn-print-card:hover { 
          background: #3d5a45; 
        }

        /* ID Card Styles */
        .id-card-comprehensive { width: 10.5cm; height: 17cm; border-radius: 12mm; position: relative; overflow: hidden; display: flex; flex-direction: column; color: white; background: white; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
        .role-peserta { background: linear-gradient(180deg, #be185d 0%, #9d174d 100%); border: 1px solid #be185d; color: white; }
        .role-pengurus { background: linear-gradient(180deg, #059669 0%, #064e3b 100%); border: 1px solid #059669; color: white; }
        .role-panitia { background: linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%); border: 1px solid #1d4ed8; color: white; }

        .id-watermark-container { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-around; align-items: center; pointer-events: none; z-index: 1; }
        .id-watermark { font-size: 80px; font-weight: 950; opacity: 0.08; transform: rotate(-30deg); white-space: nowrap; letter-spacing: 10px; text-transform: uppercase; }
        .wm-1 { margin-top: 100px; margin-left: -50px; }
        .wm-2 { margin-left: 50px; }
        .wm-3 { margin-bottom: 100px; margin-left: -50px; }

        .id-card-header { height: 2.5cm; padding: 0 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; position: relative; z-index: 5; background: rgba(0,0,0,0.1); }
        .role-peserta .id-card-header { background: linear-gradient(135deg, #be185d, #ec4899); color: white; }
        .role-pengurus .id-card-header { background: linear-gradient(135deg, #2e7d32, #4caf50); color: white; }
        .role-panitia .id-card-header { background: linear-gradient(135deg, #0d47a1, #2196f3); color: white; }

        .id-logo-box { display: flex; align-items: center; gap: 10px; }
        .id-logo-box span { font-weight: 950; font-size: 20px; letter-spacing: 2px; color: white !important; }
        .id-org-name { font-size: 11px; font-weight: 700; opacity: 0.9; text-transform: uppercase; color: white !important; }

        .id-card-main-content { flex: 1; display: flex; flex-direction: column; padding: 30px; align-items: center; gap: 20px; position: relative; z-index: 5; }
        .id-photo-frame { width: 4.5cm; height: 6cm; background: #f1f5f9; border-radius: 10mm; overflow: hidden; border: 4px solid white; box-shadow: 0 10px 20px rgba(0,0,0,0.1); position: relative; }
        .id-photo-frame img { width: 100%; height: 100%; object-fit: cover; }
        .id-initials-modal { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #64748b; font-size: 60px; font-weight: 950; }
        .id-kategori-sticker { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); padding: 10px 5px; text-align: center; font-size: 16px; font-weight: 950; text-transform: uppercase; letter-spacing: 1px; }
        .role-peserta .id-kategori-sticker { color: #be185d; }
        .role-pengurus .id-kategori-sticker { color: #2e7d32; }
        .role-panitia .id-kategori-sticker { color: #0d47a1; }

        .id-full-name { font-size: 24px; font-weight: 950; line-height: 1.1; margin-bottom: 5px; text-align: center; }
        .id-member-code { font-size: 14px; font-weight: 800; opacity: 0.7; font-family: monospace; }
        .id-qr-box { display: flex; flex-direction: column; align-items: center; gap: 8px; background: white; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .id-qr-label { font-size: 9px; font-weight: 800; color: #1e40af; text-transform: uppercase; }

        .id-footer-section { width: 100%; margin-top: auto; }
        .id-address-section { margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.3); padding-top: 12px; text-align: left; width: 100%; }
        .id-address-section label { font-size: 9px; text-transform: uppercase; font-weight: 800; opacity: 0.8; color: inherit; display: block; margin-bottom: 4px; letter-spacing: 0.5px; }
        .id-address-section p { font-size: 11px; margin: 0; line-height: 1.4; color: inherit; font-weight: 600; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
        
        .text-home { color: #8b5cf6; }
        .address-item { margin-top: 4px; border-top: 1px solid #f8fafc; padding-top: 4px; }
        .id-card-footer { height: 2.2cm; padding: 0 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; position: relative; z-index: 5; background: rgba(0,0,0,0.05); }
        .role-peserta .id-card-footer { background: #1e3a8a; color: white !important; }
        .role-pengurus .id-card-footer { background: #1b5e20; color: white !important; }
        .role-panitia .id-card-footer { background: #0d47a1; color: white !important; }
        .id-loc-pill { display: flex; align-items: center; gap: 8px; color: white; padding: 8px 18px; border-radius: 30px; font-size: 13px; font-weight: 800; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); }
        .id-footer-right { font-size: 11px; font-weight: 800; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; color: white !important; }
        .id-card-seal { position: absolute; bottom: -40px; right: -40px; width: 150px; height: 150px; background: #cbd5e1; opacity: 0.1; border-radius: 50%; }
        
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }

        @media print {
          .pdkt-admin-container > * { display: none !important; }
          .modal-overlay { position: static; background: none; padding: 0; display: block; }
          .modal-content { padding: 0; overflow: visible; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .close-modal, .modal-actions-print { display: none !important; }
          .id-card-comprehensive { box-shadow: none; margin: 0; border: none; break-inside: avoid; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .url-display {
          transition: all 0.3s ease;
        }
        .url-display:hover {
          background: #f4efe6 !important;
          border-color: #c5a059 !important;
        }
        .qr-access-container canvas {
          max-width: 100%;
          height: auto !important;
        }
      `}</style>
      </div>
    </>
  );
}

function calculateAge(birthdayStr?: string) {
  if (!birthdayStr) return "-";
  const birthDate = new Date(birthdayStr);
  if (isNaN(birthDate.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age--;
  return age;
}
