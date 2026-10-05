"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Topbar from "@/components/Topbar";
import Swal from "sweetalert2";
import {
  PhoneCall,
  CheckCircle,
  XCircle,
  Search,
  Download,
  RefreshCw,
  Clock,
  User,
  Users,
  SlidersHorizontal,
  Plus,
  Send,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Trash2,
  HeartHandshake,
  Info,
  MapPin,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Edit3
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getPusherClient } from "@/lib/pusher-client";

interface QueuedPair {
  id: string;
  status: string;
  statusTunggu: string;
  createdAt: string;
  pengirimId?: string;
  pengirimNama: string;
  pengirimNo: string;
  pengirimNomorUrut?: number;
  pengirimStatus?: string;
  pengirimKota?: string;
  pengirimDesa?: string;
  pengirimWa?: string;
  penerimaId?: string;
  penerimaNama: string;
  penerimaNo: string;
  penerimaNomorUrut?: number;
  penerimaStatus?: string;
  penerimaKota?: string;
  penerimaDesa?: string;
  penerimaWa?: string;
  hasilPengirim?: string;
  hasilPenerima?: string;
}

interface VisitRecord {
  id: string;
  createdAt: string;
  pemilihId?: string;
  pemilihNomorUrut?: number;
  pemilihNo?: string;
  pemilihNama: string;
  pemilihStatus?: string;
  pemilihHasil?: string;
  pemilihKota?: string;
  pemilihDesa?: string;
  pemilihWa?: string;
  terpilihId?: string;
  terpilihNomorUrut?: number;
  terpilihNo?: string;
  terpilihNama: string;
  terpilihStatus?: string;
  terpilihHasil?: string;
  terpilihKota?: string;
  terpilihDesa?: string;
  terpilihWa?: string;
  pemilihanId?: string;
}

// Helper kesimpulan ta'aruf
const getConclusion = (h1?: string, h2?: string) => {
  if (h1 === "Lanjut" && h2 === "Lanjut") return { label: "Cocok (Lanjut)", type: "match" };
  if (h1 === "Tidak Lanjut" || h2 === "Tidak Lanjut") return { label: "Tidak Lanjut", type: "unmatch" };
  if (h1 === "Ragu-ragu" || h2 === "Ragu-ragu") return { label: "Ragu-ragu", type: "doubt" };
  return { label: "Menunggu", type: "pending" };
};

export default function PanggilanPage() {
  const [activeTab, setActiveTab] = useState<"antrean" | "riwayat">("antrean");
  const [loading, setLoading] = useState(true);
  const [kegiatanList, setKegiatanList] = useState<{ id: string; judul: string }[]>([]);
  const [selectedKegiatanId, setSelectedKegiatanId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [regTitle, setRegTitle] = useState("Pashmina 8.0");

  const [queue, setQueue] = useState<QueuedPair[]>([]);
  const [history, setHistory] = useState<VisitRecord[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDaerah, setSelectedDaerah] = useState("Semua");
  const [daerahList, setDaerahList] = useState<string[]>([]);
  const [statusTungguFilter, setStatusTungguFilter] = useState("Semua");
  const [resultFilter, setResultFilter] = useState("Semua");

  // Pagination Antrean
  const [queuePage, setQueuePage] = useState(1);
  const [queuePageSize, setQueuePageSize] = useState(12);

  // Pagination Riwayat
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(15);

  // Modal detail pasangan & input hasil
  const [selectedDetailPair, setSelectedDetailPair] = useState<QueuedPair | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [activeTargetPair, setActiveTargetPair] = useState<QueuedPair | null>(null);
  const [hasilPemilihInput, setHasilPemilihInput] = useState<"Lanjut" | "Ragu-ragu" | "Tidak Lanjut">("Lanjut");
  const [hasilTerpilihInput, setHasilTerpilihInput] = useState<"Lanjut" | "Ragu-ragu" | "Tidak Lanjut">("Lanjut");
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

  // Modal input manual hasil ta'aruf
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualPesertaList, setManualPesertaList] = useState<any[]>([]);
  const [loadingPeserta, setLoadingPeserta] = useState(false);
  const [manualPengirimId, setManualPengirimId] = useState("");
  const [manualPenerimaId, setManualPenerimaId] = useState("");
  const [manualHasilPengirim, setManualHasilPengirim] = useState<"Lanjut" | "Ragu-ragu" | "Tidak Lanjut">("Lanjut");
  const [manualHasilPenerima, setManualHasilPenerima] = useState<"Lanjut" | "Ragu-ragu" | "Tidak Lanjut">("Lanjut");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [searchPengirimText, setSearchPengirimText] = useState("");
  const [searchPenerimaText, setSearchPenerimaText] = useState("");

  // Fetch kegiatan list
  const fetchKegiatan = async () => {
    try {
      const res = await fetch("/api/mandiri/kegiatan");
      if (res.ok) {
        const data = await res.json();
        setKegiatanList(data);
        if (data.length > 0) {
          if (!selectedKegiatanId) setSelectedKegiatanId(data[0].id);
          if (data[0].judul) setRegTitle(data[0].judul);
        }
      }
    } catch (e) {
      console.error("Gagal load kegiatan:", e);
    }
  };

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    if (!selectedKegiatanId) return;
    try {
      const res = await fetch(`/api/mandiri/pilih?all=true&kegiatanId=${selectedKegiatanId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        // Hanya yang belum selesai atau sedang menunggu/dipanggil
        const activeQueue = (data || []).filter((q: QueuedPair) => q.status !== "Selesai");
        setQueue(activeQueue);
      }
    } catch (e) {
      console.error("Gagal load antrean:", e);
    }
  }, [selectedKegiatanId]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!selectedKegiatanId) return;
    try {
      const res = await fetch(`/api/mandiri/kunjungan?kegiatanId=${selectedKegiatanId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Gagal load riwayat:", e);
    }
  }, [selectedKegiatanId]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchQueue(), fetchHistory()]);
    setLoading(false);
  }, [fetchQueue, fetchHistory]);

  useEffect(() => {
    fetchKegiatan();
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d) {
          setUserRole(d.role || "");
          setUserName(d.name || d.nama || "");
        }
      })
      .catch(() => {});

    // Fetch daerah list
    fetch("/api/public/mandiri/daerah?scope=all")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const names = data.map((d: any) => d.nama).filter(Boolean);
          setDaerahList((prev) => Array.from(new Set([...prev, ...names])).sort());
        }
      })
      .catch(() => {});
  }, []);

  // Update daerahList from queue and history
  useEffect(() => {
    const list: string[] = [];
    queue.forEach((q) => {
      if (q.pengirimKota) list.push(q.pengirimKota);
      if (q.penerimaKota) list.push(q.penerimaKota);
    });
    history.forEach((h) => {
      if (h.pemilihKota) list.push(h.pemilihKota);
      if (h.terpilihKota) list.push(h.terpilihKota);
    });
    if (list.length > 0) {
      setDaerahList((prev) => Array.from(new Set([...prev, ...list])).sort());
    }
  }, [queue, history]);

  // Reset pagination on filter change
  useEffect(() => {
    setQueuePage(1);
  }, [searchQuery, selectedDaerah, statusTungguFilter, selectedKegiatanId]);

  useEffect(() => {
    setHistoryPage(1);
  }, [searchQuery, selectedDaerah, resultFilter, selectedKegiatanId]);

  useEffect(() => {
    if (selectedKegiatanId) {
      refreshAll();
    }
  }, [selectedKegiatanId, refreshAll]);

  // Pusher real-time updates
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe("taaruf-channel");

    channel.bind("taaruf-changed", () => {
      fetchQueue();
      fetchHistory();
    });

    return () => {
      channel.unbind("taaruf-changed");
      pusher.unsubscribe("taaruf-channel");
    };
  }, [fetchQueue, fetchHistory]);

  // Handle call WhatsApp
  const handlePanggil = async (item: QueuedPair) => {
    const isDipanggil = item.statusTunggu === "dipanggil";
    const actionLabel = isDipanggil ? "Panggil Ulang" : "Panggil Peserta";

    const confirm = await Swal.fire({
      title: `${actionLabel}?`,
      html: `
        <div style="font-size:13px; text-align:left; color:#26392d; line-height:1.6;">
          <p>Notifikasi WhatsApp akan dikirimkan ke kedua peserta:</p>
          <div style="background:#faf7f2; border:1px solid #e6dfd3; border-radius:8px; padding:10px; margin-top:8px;">
            <div><strong>1. ${item.pengirimNama}</strong> (#${item.pengirimNomorUrut || "-"})</div>
            <div style="margin-top:4px;"><strong>2. ${item.penerimaNama}</strong> (#${item.penerimaNomorUrut || "-"})</div>
          </div>
          <p style="margin-top:10px; font-size:12px; color:#64748b;">
            Peserta akan diinstruksikan untuk segera merapat ke Meja / Titik Tunggu Panitia.
          </p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: `Ya, ${actionLabel}`,
      cancelButtonText: "Batal",
      confirmButtonColor: "#26392d",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch("/api/mandiri/pilih", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pemilihanId: item.id,
          statusTunggu: "dipanggil",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memproses panggilan");

      Swal.fire({
        title: "Berhasil Dipanggil!",
        text: "Pesan WhatsApp panggilan telah dikirimkan ke kedua peserta.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
      fetchQueue();
    } catch (err: any) {
      Swal.fire("Gagal", err.message, "error");
    }
  };

  // Handle buka modal hasil
  const handleOpenResultModal = (item: QueuedPair) => {
    setActiveTargetPair(item);
    setHasilPemilihInput(
      item.hasilPengirim === "Tidak Lanjut"
        ? "Tidak Lanjut"
        : item.hasilPengirim === "Ragu-ragu"
        ? "Ragu-ragu"
        : "Lanjut"
    );
    setHasilTerpilihInput(
      item.hasilPenerima === "Tidak Lanjut"
        ? "Tidak Lanjut"
        : item.hasilPenerima === "Ragu-ragu"
        ? "Ragu-ragu"
        : "Lanjut"
    );
    setShowResultModal(true);
  };

  // Handle buka modal isi manual
  const handleOpenManualModal = async () => {
    setShowManualModal(true);
    setManualPengirimId("");
    setManualPenerimaId("");
    setManualHasilPengirim("Lanjut");
    setManualHasilPenerima("Lanjut");
    setSearchPengirimText("");
    setSearchPenerimaText("");

    if (manualPesertaList.length === 0) {
      setLoadingPeserta(true);
      try {
        const res = await fetch(`/api/mandiri?limit=1000&kegiatanId=${selectedKegiatanId}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          setManualPesertaList(json.data || []);
        }
      } catch (e) {
        console.error("Gagal load peserta:", e);
      } finally {
        setLoadingPeserta(false);
      }
    }
  };

  const filteredPengirimList = useMemo(() => {
    const q = searchPengirimText.toLowerCase().trim();
    return manualPesertaList.filter((p) => {
      const matchGender = !p.jenisKelamin || p.jenisKelamin === "L";
      if (!matchGender) return false;
      if (!q) return true;
      const nama = (p.nama || "").toLowerCase();
      const noUrut = String(p.nomorUrut || "");
      const desa = (p.desaNama || "").toLowerCase();
      const daerah = (p.desaKota || "").toLowerCase();
      return nama.includes(q) || noUrut.includes(q) || desa.includes(q) || daerah.includes(q);
    });
  }, [manualPesertaList, searchPengirimText]);

  const filteredPenerimaList = useMemo(() => {
    const q = searchPenerimaText.toLowerCase().trim();
    return manualPesertaList.filter((p) => {
      const matchGender = !p.jenisKelamin || p.jenisKelamin === "P";
      if (!matchGender) return false;
      if (!q) return true;
      const nama = (p.nama || "").toLowerCase();
      const noUrut = String(p.nomorUrut || "");
      const desa = (p.desaNama || "").toLowerCase();
      const daerah = (p.desaKota || "").toLowerCase();
      return nama.includes(q) || noUrut.includes(q) || desa.includes(q) || daerah.includes(q);
    });
  }, [manualPesertaList, searchPenerimaText]);

  const handleSubmitManual = async () => {
    if (!manualPengirimId || !manualPenerimaId) {
      Swal.fire("Perhatian", "Silakan pilih Peserta 1 (Ikhwan) dan Peserta 2 (Akhwat) terlebih dahulu.", "warning");
      return;
    }
    if (manualPengirimId === manualPenerimaId) {
      Swal.fire("Perhatian", "Peserta 1 dan Peserta 2 tidak boleh orang yang sama.", "warning");
      return;
    }

    setIsSubmittingManual(true);
    try {
      const res = await fetch("/api/mandiri/kunjungan/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pengirimId: manualPengirimId,
          penerimaId: manualPenerimaId,
          hasilPengirim: manualHasilPengirim,
          hasilPenerima: manualHasilPenerima,
          kegiatanId: selectedKegiatanId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan hasil");

      setShowManualModal(false);
      Swal.fire({
        title: "Berhasil Disimpan",
        text: "Hasil ta'aruf berhasil dicatat ke riwayat.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
      fetchHistory();
      fetchQueue();
    } catch (err: any) {
      Swal.fire("Gagal", err.message, "error");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Submit hasil
  const handleSubmitResult = async () => {
    if (!activeTargetPair) return;
    setIsSubmittingResult(true);

    try {
      const res = await fetch("/api/mandiri/kunjungan/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pengirimId: activeTargetPair.pengirimId,
          penerimaId: activeTargetPair.penerimaId,
          hasilPengirim: hasilPemilihInput,
          hasilPenerima: hasilTerpilihInput,
          kegiatanId: selectedKegiatanId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan hasil pertemuan");

      setShowResultModal(false);
      Swal.fire({
        title: "Hasil Disimpan",
        text: "Status pertemuan peserta telah diperbarui.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
      fetchQueue();
      fetchHistory();
    } catch (err: any) {
      Swal.fire("Gagal", err.message, "error");
    } finally {
      setIsSubmittingResult(false);
    }
  };

  // Handle batalkan pilihan
  const handleCancelSelection = async (item: QueuedPair) => {
    const confirm = await Swal.fire({
      title: "Hapus dari Antrean?",
      text: `Batalkan panggilan antara ${item.pengirimNama} dan ${item.penerimaNama}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Batalkan",
      cancelButtonText: "Kembali",
      confirmButtonColor: "#dc2626",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/mandiri/pilih?id=${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        Swal.fire({
          title: "Dibatalkan",
          text: "Pilihan telah dihapus dari antrean.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchQueue();
      } else {
        throw new Error("Gagal menghapus antrean");
      }
    } catch (e: any) {
      Swal.fire("Error", e.message, "error");
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const data = filteredHistory.map((item) => ({
      "Nomor Pemilih": item.pemilihNomorUrut || item.pemilihNo || "-",
      "Nama Pemilih": item.pemilihNama,
      "Kota Pemilih": item.pemilihKota || "-",
      "Desa Pemilih": item.pemilihDesa || "-",
      "Hasil Pemilih": item.pemilihHasil || "-",
      "Nomor Terpilih": item.terpilihNomorUrut || item.terpilihNo || "-",
      "Nama Terpilih": item.terpilihNama,
      "Kota Terpilih": item.terpilihKota || "-",
      "Desa Terpilih": item.terpilihDesa || "-",
      "Hasil Terpilih": item.terpilihHasil || "-",
      "Kesimpulan": getConclusion(item.pemilihHasil, item.terpilihHasil).label,
      "Waktu": item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID") : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Taaruf");
    XLSX.writeFile(wb, "Laporan_Hasil_Panggilan_Taaruf.xlsx");
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN HASIL PANGGILAN & PERTEMUAN TA'ARUF", 40, 40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Waktu Cetak: ${new Date().toLocaleString("id-ID")}`, 40, 58);

    const tableData = filteredHistory.map((item, idx) => [
      idx + 1,
      `#${item.pemilihNomorUrut || "-"} ${item.pemilihNama}\n(${item.pemilihDesa || "-"})`,
      item.pemilihHasil || "-",
      `#${item.terpilihNomorUrut || "-"} ${item.terpilihNama}\n(${item.terpilihDesa || "-"})`,
      item.terpilihHasil || "-",
      getConclusion(item.pemilihHasil, item.terpilihHasil).label.toUpperCase(),
      item.createdAt ? new Date(item.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
    ]);

    autoTable(doc, {
      startY: 75,
      head: [["No", "Pemilih", "Hasil 1", "Yang Dipilih", "Hasil 2", "Kesimpulan", "Jam"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [38, 57, 45], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 5 },
    });

    doc.save("Laporan_Hasil_Panggilan_Taaruf.pdf");
  };

  // Filter Antrean
  const filteredQueue = useMemo(() => {
    return queue.filter((q) => {
      const s = searchQuery.toLowerCase().trim();
      const matchSearch =
        !s ||
        q.pengirimNama.toLowerCase().includes(s) ||
        q.penerimaNama.toLowerCase().includes(s) ||
        String(q.pengirimNomorUrut || "").includes(s) ||
        String(q.penerimaNomorUrut || "").includes(s) ||
        (q.pengirimDesa || "").toLowerCase().includes(s) ||
        (q.penerimaDesa || "").toLowerCase().includes(s) ||
        (q.pengirimKota || "").toLowerCase().includes(s) ||
        (q.penerimaKota || "").toLowerCase().includes(s);

      if (!matchSearch) return false;

      // Filter Daerah
      if (selectedDaerah !== "Semua") {
        const matchDaerah =
          (q.pengirimKota || "").toLowerCase() === selectedDaerah.toLowerCase() ||
          (q.penerimaKota || "").toLowerCase() === selectedDaerah.toLowerCase();
        if (!matchDaerah) return false;
      }

      if (statusTungguFilter === "Menunggu") return q.statusTunggu !== "dipanggil";
      if (statusTungguFilter === "Dipanggil") return q.statusTunggu === "dipanggil";
      return true;
    });
  }, [queue, searchQuery, selectedDaerah, statusTungguFilter]);

  // Filter Riwayat
  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      const s = searchQuery.toLowerCase().trim();
      const matchSearch =
        !s ||
        h.pemilihNama.toLowerCase().includes(s) ||
        h.terpilihNama.toLowerCase().includes(s) ||
        String(h.pemilihNomorUrut || "").includes(s) ||
        String(h.terpilihNomorUrut || "").includes(s) ||
        (h.pemilihDesa || "").toLowerCase().includes(s) ||
        (h.terpilihDesa || "").toLowerCase().includes(s) ||
        (h.pemilihKota || "").toLowerCase().includes(s) ||
        (h.terpilihKota || "").toLowerCase().includes(s);

      if (!matchSearch) return false;

      // Filter Daerah
      if (selectedDaerah !== "Semua") {
        const matchDaerah =
          (h.pemilihKota || "").toLowerCase() === selectedDaerah.toLowerCase() ||
          (h.terpilihKota || "").toLowerCase() === selectedDaerah.toLowerCase();
        if (!matchDaerah) return false;
      }

      const conclusion = getConclusion(h.pemilihHasil, h.terpilihHasil);
      if (resultFilter === "Cocok") return conclusion.type === "match";
      if (resultFilter === "Ragu-ragu") return conclusion.type === "doubt";
      if (resultFilter === "Tidak Lanjut") return conclusion.type === "unmatch";
      return true;
    });
  }, [history, searchQuery, selectedDaerah, resultFilter]);

  const totalQueuePages = Math.ceil(filteredQueue.length / queuePageSize) || 1;
  const paginatedQueue = useMemo(() => {
    const start = (queuePage - 1) * queuePageSize;
    return filteredQueue.slice(start, start + queuePageSize);
  }, [filteredQueue, queuePage, queuePageSize]);

  const totalHistoryPages = Math.ceil(filteredHistory.length / historyPageSize) || 1;
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, historyPage, historyPageSize]);

  // Pagination renderer helper
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    pageSize: number,
    totalItems: number,
    onPageChange: (p: number) => void,
    onPageSizeChange: (s: number) => void,
    labelItem: string
  ) => {
    if (totalItems === 0) return null;
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    const handlePageChange = (p: number) => {
      onPageChange(p);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 120, behavior: "smooth" });
      }
    };

    return (
      <div className="pagination-bar">
        <div className="pagination-info">
          <span className="pagi-page-badge">
            Hal {currentPage} / {totalPages || 1}
          </span>
          <span className="pagi-count-text">
            Menampilkan <strong>{startItem}–{endItem}</strong> dari <strong>{totalItems}</strong> {labelItem}
          </span>
        </div>

        <div className="pagination-controls">
          <div className="page-size-selector">
            <span className="page-size-label">Tampilkan:</span>
            <select
              className="page-size-select"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                handlePageChange(1);
              }}
            >
              {[12, 24, 48].includes(pageSize) ? (
                <>
                  <option value={12}>12 / hal</option>
                  <option value={24}>24 / hal</option>
                  <option value={48}>48 / hal</option>
                </>
              ) : (
                <>
                  <option value={15}>15 / hal</option>
                  <option value={30}>30 / hal</option>
                  <option value={50}>50 / hal</option>
                </>
              )}
            </select>
          </div>

          <div className="pagi-divider-v" />

          <div className="pagination-buttons">
            <button
              type="button"
              className="page-btn page-nav"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              title="Halaman sebelumnya"
            >
              <ChevronLeft size={15} />
              <span>Prev</span>
            </button>

            {pages.map((p, idx) =>
              typeof p === "number" ? (
                <button
                  key={idx}
                  type="button"
                  className={`page-btn ${p === currentPage ? "active" : ""}`}
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </button>
              ) : (
                <span key={idx} className="page-ellipsis">
                  &hellip;
                </span>
              )
            )}

            <button
              type="button"
              className="page-btn page-nav"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              title="Halaman berikutnya"
            >
              <span>Next</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <Topbar title={regTitle || "Pashmina 8.0"} role={userRole} userName={userName} />
      <div className="panggilan-container">

      <div className="panggilan-header">
        <div className="header-left">
          <div className="header-badge">
            <PhoneCall size={14} /> PANGGILAN TA&apos;ARUF
          </div>
          <h1 className="header-title">Antrean &amp; Panggilan Ta&apos;aruf</h1>
          <p className="header-sub">
            Kelola pemanggilan peserta ke meja/titik temu ta&apos;aruf dan catat hasil pertemuan secara langsung.
          </p>
        </div>

        <div className="header-right">
          {kegiatanList.length > 1 && (
            <div className="kegiatan-select-wrapper">
              <Calendar size={15} color="#c5a059" />
              <select
                value={selectedKegiatanId}
                onChange={(e) => setSelectedKegiatanId(e.target.value)}
                className="kegiatan-select"
              >
                {kegiatanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.judul}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button className="btn-refresh" onClick={refreshAll} title="Segarkan Data">
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        <button
          className={`tab-btn ${activeTab === "antrean" ? "active" : ""}`}
          onClick={() => setActiveTab("antrean")}
        >
          <PhoneCall size={16} />
          Antrean Panggilan
          <span className="tab-count">
            {filteredQueue.length !== queue.length ? `${filteredQueue.length}/${queue.length}` : queue.length}
          </span>
        </button>
        <button
          className={`tab-btn ${activeTab === "riwayat" ? "active" : ""}`}
          onClick={() => setActiveTab("riwayat")}
        >
          <HeartHandshake size={16} />
          Riwayat &amp; Hasil Ta&apos;aruf
          <span className="tab-count">
            {filteredHistory.length !== history.length ? `${filteredHistory.length}/${history.length}` : history.length}
          </span>
        </button>
      </div>

      {/* Toolbar / Search / Actions */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Cari nama, nomor urut, desa, daerah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        {/* Filter Daerah */}
        <div className="filter-select-wrapper">
          <MapPin size={15} color="#c5a059" />
          <select
            value={selectedDaerah}
            onChange={(e) => setSelectedDaerah(e.target.value)}
            className="filter-select"
          >
            <option value="Semua">Semua Daerah {daerahList.length > 0 ? `(${daerahList.length})` : ""}</option>
            {daerahList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {activeTab === "antrean" ? (
          <div className="filter-group">
            <span className="filter-label">Status:</span>
            {["Semua", "Menunggu", "Dipanggil"].map((st) => (
              <button
                key={st}
                className={`filter-chip ${statusTungguFilter === st ? "active" : ""}`}
                onClick={() => setStatusTungguFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        ) : (
          <div className="history-actions">
            <div className="filter-group">
              <span className="filter-label">Hasil:</span>
              {["Semua", "Cocok", "Ragu-ragu", "Tidak Lanjut"].map((rf) => (
                <button
                  key={rf}
                  className={`filter-chip ${resultFilter === rf ? "active" : ""}`}
                  onClick={() => setResultFilter(rf)}
                >
                  {rf}
                </button>
              ))}
            </div>
            <div className="export-buttons">
              <button
                type="button"
                className="btn-export btn-manual"
                onClick={handleOpenManualModal}
              >
                <Plus size={15} /> Isi Manual
              </button>
              <button className="btn-export btn-excel" onClick={handleExportExcel}>
                <FileSpreadsheet size={15} /> Excel
              </button>
              <button className="btn-export btn-pdf" onClick={handleExportPDF}>
                <FileText size={15} /> PDF
              </button>
            </div>
          </div>
        )}

        {(searchQuery || selectedDaerah !== "Semua" || (activeTab === "antrean" ? statusTungguFilter !== "Semua" : resultFilter !== "Semua")) && (
          <button
            type="button"
            className="btn-reset-filter"
            onClick={() => {
              setSearchQuery("");
              setSelectedDaerah("Semua");
              setStatusTungguFilter("Semua");
              setResultFilter("Semua");
            }}
            title="Reset semua filter"
          >
            <FilterX size={14} /> Reset Filter
          </button>
        )}
      </div>

      {/* CONTENT: TAB ANTREAN */}
      {activeTab === "antrean" && (
        <div className="queue-section">
          {loading ? (
            <div className="empty-state">
              <RefreshCw size={28} className="spin" color="#26392d" />
              <p>Memuat antrean panggilan...</p>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="empty-state">
              <PhoneCall size={36} color="#94a3b8" />
              <h3>Tidak ada antrean panggilan</h3>
              <p>
                {searchQuery || selectedDaerah !== "Semua" || statusTungguFilter !== "Semua"
                  ? "Tidak ada peserta yang cocok dengan filter atau kata kunci pencarian."
                  : "Belum ada pasangan peserta yang masuk ke antrean panggilan."}
              </p>
            </div>
          ) : (
            <>
              <div className="queue-grid">
                {paginatedQueue.map((item) => {
                const isDipanggil = item.statusTunggu === "dipanggil";
                return (
                  <div
                    key={item.id}
                    className={`queue-card ${isDipanggil ? "is-called" : ""}`}
                    onClick={() => setSelectedDetailPair(item)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="card-top">
                      <span className={`status-badge ${isDipanggil ? "called" : "waiting"}`}>
                        {isDipanggil ? (
                          <>
                            <PhoneCall size={12} /> Sedang Dipanggil
                          </>
                        ) : (
                          <>
                            <Clock size={12} /> Dalam Antrean
                          </>
                        )}
                      </span>
                      <span className="time-badge">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </span>
                    </div>

                    <div className="pair-container">
                      {/* Pemilih */}
                      <div className="participant-side left">
                        <div className="p-num">#{item.pengirimNomorUrut || "-"}</div>
                        <div className="p-name" title={item.pengirimNama}>
                          {item.pengirimNama}
                        </div>
                        <div className="p-meta" title={[item.pengirimKota, item.pengirimDesa].filter(Boolean).join(" • ")}>
                          {[item.pengirimKota, item.pengirimDesa].filter(Boolean).join(" • ") || "Peserta"}
                        </div>
                      </div>

                      <div className="pair-divider">
                        <HeartHandshake size={20} color="#c5a059" />
                      </div>

                      {/* Terpilih */}
                      <div className="participant-side right">
                        <div className="p-num">#{item.penerimaNomorUrut || "-"}</div>
                        <div className="p-name" title={item.penerimaNama}>
                          {item.penerimaNama}
                        </div>
                        <div className="p-meta" title={[item.penerimaKota, item.penerimaDesa].filter(Boolean).join(" • ")}>
                          {[item.penerimaKota, item.penerimaDesa].filter(Boolean).join(" • ") || "Peserta"}
                        </div>
                      </div>
                    </div>

                    <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-action btn-detail-pair"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetailPair(item);
                        }}
                      >
                        <Info size={14} /> Detail
                      </button>

                      <button
                        type="button"
                        className="btn-action btn-result"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenResultModal(item);
                        }}
                      >
                        <CheckCircle size={15} /> Catat Hasil
                      </button>

                      <button
                        type="button"
                        className="btn-cancel"
                        title="Batalkan dari Antrean"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelSelection(item);
                        }}
                      >
                        <Trash2 size={16} strokeWidth={2.2} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {renderPagination(
              queuePage,
              totalQueuePages,
              queuePageSize,
              filteredQueue.length,
              setQueuePage,
              setQueuePageSize,
              "antrean"
            )}
          </>
          )}
        </div>
      )}

      {/* CONTENT: TAB RIWAYAT */}
      {activeTab === "riwayat" && (
        <div className="history-section">
          {loading ? (
            <div className="empty-state">
              <RefreshCw size={28} className="spin" color="#26392d" />
              <p>Memuat riwayat pertemuan...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="empty-state">
              <HeartHandshake size={36} color="#94a3b8" />
              <h3>Belum ada riwayat pertemuan</h3>
              <p>
                {searchQuery || selectedDaerah !== "Semua" || resultFilter !== "Semua"
                  ? "Tidak ada data riwayat yang cocok dengan filter atau kata kunci pencarian."
                  : "Data hasil ta'aruf yang telah selesai akan muncul di sini."}
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Pemilih</th>
                      <th>Hasil 1</th>
                      <th>Yang Dipilih</th>
                      <th>Hasil 2</th>
                      <th>Kesimpulan</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((row) => {
                    const conclusion = getConclusion(row.pemilihHasil, row.terpilihHasil);
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedDetailPair({
                          id: row.id,
                          status: "selesai",
                          statusTunggu: "selesai",
                          createdAt: row.createdAt,
                          pengirimId: row.pemilihId,
                          pengirimNama: row.pemilihNama,
                          pengirimNo: row.pemilihNo || "",
                          pengirimNomorUrut: row.pemilihNomorUrut,
                          pengirimStatus: row.pemilihStatus,
                          pengirimKota: row.pemilihKota,
                          pengirimDesa: row.pemilihDesa,
                          pengirimWa: row.pemilihWa,
                          hasilPengirim: row.pemilihHasil,
                          penerimaId: row.terpilihId,
                          penerimaNama: row.terpilihNama,
                          penerimaNo: row.terpilihNo || "",
                          penerimaNomorUrut: row.terpilihNomorUrut,
                          penerimaStatus: row.terpilihStatus,
                          penerimaKota: row.terpilihKota,
                          penerimaDesa: row.terpilihDesa,
                          penerimaWa: row.terpilihWa,
                          hasilPenerima: row.terpilihHasil,
                        })}
                        style={{ cursor: "pointer" }}
                        title="Klik untuk melihat detail pertemuan"
                      >
                        <td className="col-time">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </td>
                        <td>
                          <div className="cell-person">
                            <span className="person-num">#{row.pemilihNomorUrut || "-"}</span>
                            <span className="person-name">{row.pemilihNama}</span>
                            <span className="person-sub">
                              {[row.pemilihKota, row.pemilihDesa].filter(Boolean).join(" • ") || "-"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge-result ${
                              row.pemilihHasil === "Lanjut"
                                ? "lanjut"
                                : row.pemilihHasil === "Ragu-ragu"
                                ? "ragu"
                                : "tidak"
                            }`}
                          >
                            {row.pemilihHasil || "Menunggu"}
                          </span>
                        </td>
                        <td>
                          <div className="cell-person">
                            <span className="person-num">#{row.terpilihNomorUrut || "-"}</span>
                            <span className="person-name">{row.terpilihNama}</span>
                            <span className="person-sub">
                              {[row.terpilihKota, row.terpilihDesa].filter(Boolean).join(" • ") || "-"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge-result ${
                              row.terpilihHasil === "Lanjut"
                                ? "lanjut"
                                : row.terpilihHasil === "Ragu-ragu"
                                ? "ragu"
                                : "tidak"
                            }`}
                          >
                            {row.terpilihHasil || "Menunggu"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-conclusion ${conclusion.type}`}>
                            {conclusion.label}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenResultModal({
                              id: row.id,
                              status: "selesai",
                              statusTunggu: "selesai",
                              createdAt: row.createdAt,
                              pengirimId: row.pemilihId,
                              pengirimNama: row.pemilihNama,
                              pengirimNo: row.pemilihNo || "",
                              pengirimNomorUrut: row.pemilihNomorUrut,
                              pengirimStatus: row.pemilihStatus,
                              pengirimKota: row.pemilihKota,
                              pengirimDesa: row.pemilihDesa,
                              pengirimWa: row.pemilihWa,
                              hasilPengirim: row.pemilihHasil,
                              penerimaId: row.terpilihId,
                              penerimaNama: row.terpilihNama,
                              penerimaNo: row.terpilihNo || "",
                              penerimaNomorUrut: row.terpilihNomorUrut,
                              penerimaStatus: row.terpilihStatus,
                              penerimaKota: row.terpilihKota,
                              penerimaDesa: row.terpilihDesa,
                              penerimaWa: row.terpilihWa,
                              hasilPenerima: row.terpilihHasil,
                            })}
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              color: "#1e293b",
                              fontWeight: 500,
                            }}
                            title="Ubah Hasil Ta'aruf"
                          >
                            <Edit3 size={12} color="#2563eb" /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {renderPagination(
              historyPage,
              totalHistoryPages,
              historyPageSize,
              filteredHistory.length,
              setHistoryPage,
              setHistoryPageSize,
              "riwayat"
            )}
          </>
          )}
        </div>
      )}

      {/* MODAL DETAIL PASANGAN */}
      {selectedDetailPair && (
        <div className="modal-backdrop" onClick={() => setSelectedDetailPair(null)}>
          <div className="modal-content modal-detail-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Detail Pasangan Ta&apos;aruf</h3>
                <div className="modal-sub-title">Informasi antrean panggilan ta&apos;aruf</div>
              </div>
              <button className="modal-close" onClick={() => setSelectedDetailPair(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-status-banner">
                <span className={`status-badge ${selectedDetailPair.statusTunggu === "dipanggil" ? "called" : selectedDetailPair.statusTunggu === "selesai" ? "completed" : "waiting"}`}>
                  {selectedDetailPair.statusTunggu === "dipanggil" ? (
                    <>
                      <PhoneCall size={13} /> Sedang Dipanggil Ta&apos;aruf
                    </>
                  ) : selectedDetailPair.statusTunggu === "selesai" ? (
                    <>
                      <CheckCircle size={13} /> Pertemuan Selesai
                    </>
                  ) : (
                    <>
                      <Clock size={13} /> Dalam Antrean Panggilan
                    </>
                  )}
                </span>
                <span className="dsb-time">
                  {selectedDetailPair.statusTunggu === "selesai" ? "Waktu Selesai: " : "Masuk Antrean: "}
                  <strong>
                    {selectedDetailPair.createdAt
                      ? new Date(selectedDetailPair.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </strong>
                </span>
              </div>

              <div className="detail-pair-grid">
                {/* Pihak Pemilih */}
                <div className="detail-participant-card left">
                  <div className="dpc-top">
                    <span className="dpc-num">#{selectedDetailPair.pengirimNomorUrut || "-"}</span>
                    <span className="dpc-role pemilih">Pihak Pemilih</span>
                  </div>
                  <h4 className="dpc-name">{selectedDetailPair.pengirimNama}</h4>
                  <div className="dpc-info-list">
                    <div className="dpc-info-row">
                      <span className="dpc-lbl">Asal Daerah</span>
                      <span className="dpc-val">{selectedDetailPair.pengirimKota || "-"}</span>
                    </div>
                    <div className="dpc-info-row">
                      <span className="dpc-lbl">Desa / Kelurahan</span>
                      <span className="dpc-val">{selectedDetailPair.pengirimDesa || "-"}</span>
                    </div>
                    <div className="dpc-info-row">
                      <span className="dpc-lbl">Status</span>
                      <span className="dpc-val">{selectedDetailPair.pengirimStatus || "Peserta"}</span>
                    </div>
                    {selectedDetailPair.pengirimWa && (
                      <div className="dpc-info-row">
                        <span className="dpc-lbl">Kontak WA</span>
                        <a
                          href={`https://wa.me/${selectedDetailPair.pengirimWa.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="dpc-wa"
                        >
                          <PhoneCall size={12} /> {selectedDetailPair.pengirimWa}
                        </a>
                      </div>
                    )}
                    {selectedDetailPair.hasilPengirim && (
                      <div className="dpc-info-row">
                        <span className="dpc-lbl">Hasil</span>
                        <span className={`badge-result ${
                          selectedDetailPair.hasilPengirim === "Lanjut"
                            ? "lanjut"
                            : selectedDetailPair.hasilPengirim === "Ragu-ragu"
                            ? "ragu"
                            : "tidak"
                        }`}>
                          {selectedDetailPair.hasilPengirim}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-pair-divider">
                  <HeartHandshake size={24} color="#c5a059" />
                </div>

                {/* Pihak Dipilih */}
                <div className="detail-participant-card right">
                  <div className="dpc-top">
                    <span className="dpc-num">#{selectedDetailPair.penerimaNomorUrut || "-"}</span>
                    <span className="dpc-role terpilih">Pihak Dipilih</span>
                  </div>
                  <h4 className="dpc-name">{selectedDetailPair.penerimaNama}</h4>
                  <div className="dpc-info-list">
                    <div className="dpc-info-row">
                      <span className="dpc-lbl">Asal Daerah</span>
                      <span className="dpc-val">{selectedDetailPair.penerimaKota || "-"}</span>
                    </div>
                    <div className="dpc-info-row">
                      <span className="dpc-lbl">Desa / Kelurahan</span>
                      <span className="dpc-val">{selectedDetailPair.penerimaDesa || "-"}</span>
                    </div>
                    <div className="dpc-info-row">
                      <span className="dpc-lbl">Status</span>
                      <span className="dpc-val">{selectedDetailPair.penerimaStatus || "Peserta"}</span>
                    </div>
                    {selectedDetailPair.penerimaWa && (
                      <div className="dpc-info-row">
                        <span className="dpc-lbl">Kontak WA</span>
                        <a
                          href={`https://wa.me/${selectedDetailPair.penerimaWa.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="dpc-wa"
                        >
                          <PhoneCall size={12} /> {selectedDetailPair.penerimaWa}
                        </a>
                      </div>
                    )}
                    {selectedDetailPair.hasilPenerima && (
                      <div className="dpc-info-row">
                        <span className="dpc-lbl">Hasil</span>
                        <span className={`badge-result ${
                          selectedDetailPair.hasilPenerima === "Lanjut"
                            ? "lanjut"
                            : selectedDetailPair.hasilPenerima === "Ragu-ragu"
                            ? "ragu"
                            : "tidak"
                        }`}>
                          {selectedDetailPair.hasilPenerima}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer detail-footer">
              {selectedDetailPair.statusTunggu !== "selesai" && (
                <button
                  type="button"
                  className="btn-cancel-antrean"
                  onClick={() => {
                    const p = selectedDetailPair;
                    setSelectedDetailPair(null);
                    handleCancelSelection(p);
                  }}
                >
                  <Trash2 size={15} /> Hapus Antrean
                </button>
              )}

              <div style={{ display: "flex", gap: "8px", marginLeft: selectedDetailPair.statusTunggu === "selesai" ? "auto" : undefined }}>
                <button
                  type="button"
                  className="btn-cancel-modal"
                  onClick={() => setSelectedDetailPair(null)}
                >
                  Tutup
                </button>
                {selectedDetailPair.statusTunggu !== "selesai" ? (
                  <button
                    type="button"
                    className="btn-save-modal"
                    onClick={() => {
                      const p = selectedDetailPair;
                      setSelectedDetailPair(null);
                      handleOpenResultModal(p);
                    }}
                  >
                    <CheckCircle size={15} /> Catat Hasil
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-save-modal"
                    onClick={() => {
                      const p = selectedDetailPair;
                      setSelectedDetailPair(null);
                      handleOpenResultModal(p);
                    }}
                    style={{ background: "#2563eb" }}
                  >
                    <Edit3 size={15} /> Ubah Hasil
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT HASIL */}
      {showResultModal && activeTargetPair && (
        <div className="modal-backdrop" onClick={() => setShowResultModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Catat Hasil Pertemuan</h3>
              <button className="modal-close" onClick={() => setShowResultModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-sub">
                Masukkan hasil musyawarah / keputusan dari masing-masing peserta setelah bertemu:
              </p>

              <div className="form-result-row">
                <div className="participant-result-box">
                  <div className="pr-header">
                    <div className="pr-title-row">
                      <strong>{activeTargetPair.pengirimNama}</strong>
                      <span className="pr-tag">(Pemilih #{activeTargetPair.pengirimNomorUrut || "-"})</span>
                    </div>
                    {(activeTargetPair.pengirimDesa || activeTargetPair.pengirimKota || activeTargetPair.pengirimWa) && (
                      <div className="pr-meta">
                        {[
                          activeTargetPair.pengirimDesa || activeTargetPair.pengirimKota,
                          activeTargetPair.pengirimWa ? `WA: ${activeTargetPair.pengirimWa}` : ""
                        ].filter(Boolean).join(" • ")}
                      </div>
                    )}
                  </div>
                  <div className="pr-options">
                    <label
                      className={`radio-label ${
                        hasilPemilihInput === "Lanjut" ? "selected lanjut" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="hasilPengirim"
                        checked={hasilPemilihInput === "Lanjut"}
                        onChange={() => setHasilPemilihInput("Lanjut")}
                      />
                      Lanjut
                    </label>
                    <label
                      className={`radio-label ${
                        hasilPemilihInput === "Ragu-ragu" ? "selected ragu" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="hasilPengirim"
                        checked={hasilPemilihInput === "Ragu-ragu"}
                        onChange={() => setHasilPemilihInput("Ragu-ragu")}
                      />
                      Ragu-ragu
                    </label>
                    <label
                      className={`radio-label ${
                        hasilPemilihInput === "Tidak Lanjut" ? "selected tidak" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="hasilPengirim"
                        checked={hasilPemilihInput === "Tidak Lanjut"}
                        onChange={() => setHasilPemilihInput("Tidak Lanjut")}
                      />
                      Tidak Lanjut
                    </label>
                  </div>
                </div>

                <div className="participant-result-box">
                  <div className="pr-header">
                    <div className="pr-title-row">
                      <strong>{activeTargetPair.penerimaNama}</strong>
                      <span className="pr-tag">(Yang Dipilih #{activeTargetPair.penerimaNomorUrut || "-"})</span>
                    </div>
                    {(activeTargetPair.penerimaDesa || activeTargetPair.penerimaKota || activeTargetPair.penerimaWa) && (
                      <div className="pr-meta">
                        {[
                          activeTargetPair.penerimaDesa || activeTargetPair.penerimaKota,
                          activeTargetPair.penerimaWa ? `WA: ${activeTargetPair.penerimaWa}` : ""
                        ].filter(Boolean).join(" • ")}
                      </div>
                    )}
                  </div>
                  <div className="pr-options">
                    <label
                      className={`radio-label ${
                        hasilTerpilihInput === "Lanjut" ? "selected lanjut" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="hasilPenerima"
                        checked={hasilTerpilihInput === "Lanjut"}
                        onChange={() => setHasilTerpilihInput("Lanjut")}
                      />
                      Lanjut
                    </label>
                    <label
                      className={`radio-label ${
                        hasilTerpilihInput === "Ragu-ragu" ? "selected ragu" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="hasilPenerima"
                        checked={hasilTerpilihInput === "Ragu-ragu"}
                        onChange={() => setHasilTerpilihInput("Ragu-ragu")}
                      />
                      Ragu-ragu
                    </label>
                    <label
                      className={`radio-label ${
                        hasilTerpilihInput === "Tidak Lanjut" ? "selected tidak" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="hasilPenerima"
                        checked={hasilTerpilihInput === "Tidak Lanjut"}
                        onChange={() => setHasilTerpilihInput("Tidak Lanjut")}
                      />
                      Tidak Lanjut
                    </label>
                  </div>
                </div>
              </div>

              {hasilPemilihInput === "Lanjut" && hasilTerpilihInput === "Lanjut" && (
                <div className="match-notice">
                  <CheckCircle size={16} />
                  Kedua pihak memilih <strong>Lanjut</strong>. Pasangan akan tercatat sebagai
                  rekomendasi ta&apos;aruf cocok.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel-modal"
                onClick={() => setShowResultModal(false)}
                disabled={isSubmittingResult}
              >
                Batal
              </button>
              <button
                className="btn-save-modal"
                onClick={handleSubmitResult}
                disabled={isSubmittingResult}
              >
                {isSubmittingResult ? "Menyimpan..." : "Simpan Hasil Pertemuan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT MANUAL HASIL TA'ARUF */}
      {showManualModal && (
        <div className="modal-backdrop" onClick={() => setShowManualModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3>Input Manual Hasil Ta&apos;aruf</h3>
              <button className="modal-close" onClick={() => setShowManualModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-sub">
                Catat langsung hasil pertemuan ta&apos;aruf antara dua peserta tanpa melalui antrean:
              </p>

              {loadingPeserta ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <RefreshCw size={24} className="spin" color="#2d5a43" />
                  <p style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>Memuat daftar peserta...</p>
                </div>
              ) : (
                <>
                  {/* Peserta 1 (Ikhwan) */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                      Peserta 1 (Ikhwan / Laki-laki) <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Cari nama, nomor urut (#12), atau desa..."
                      value={searchPengirimText}
                      onChange={(e) => setSearchPengirimText(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 13,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        marginBottom: 6,
                        background: "#f8fafc",
                        outline: "none",
                      }}
                    />
                    <select
                      value={manualPengirimId}
                      onChange={(e) => setManualPengirimId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: 13,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        color: "#1e293b",
                        outline: "none",
                      }}
                    >
                      <option value="">-- Pilih Peserta 1 ({filteredPengirimList.length} peserta) --</option>
                      {filteredPengirimList.map((p) => {
                        const pId = p.generusId || p.id;
                        return (
                          <option key={pId} value={pId}>
                            #{p.nomorUrut || "-"} {p.nama} ({p.desaNama || p.desaKota || "-"})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Peserta 2 (Akhwat) */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                      Peserta 2 (Akhwat / Perempuan) <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Cari nama, nomor urut (#501), atau desa..."
                      value={searchPenerimaText}
                      onChange={(e) => setSearchPenerimaText(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 13,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        marginBottom: 6,
                        background: "#f8fafc",
                        outline: "none",
                      }}
                    />
                    <select
                      value={manualPenerimaId}
                      onChange={(e) => setManualPenerimaId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: 13,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        color: "#1e293b",
                        outline: "none",
                      }}
                    >
                      <option value="">-- Pilih Peserta 2 ({filteredPenerimaList.length} peserta) --</option>
                      {filteredPenerimaList.map((p) => {
                        const pId = p.generusId || p.id;
                        return (
                          <option key={pId} value={pId}>
                            #{p.nomorUrut || "-"} {p.nama} ({p.desaNama || p.desaKota || "-"})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Radio Hasil */}
                  <div className="form-result-row" style={{ marginTop: 16 }}>
                    <div className="participant-result-box">
                      <div className="pr-header">
                        <strong>Hasil Peserta 1</strong>
                      </div>
                      <div className="pr-options">
                        {(["Lanjut", "Ragu-ragu", "Tidak Lanjut"] as const).map((opt) => (
                          <label
                            key={opt}
                            className={`radio-label ${
                              manualHasilPengirim === opt
                                ? `selected ${opt === "Lanjut" ? "lanjut" : opt === "Ragu-ragu" ? "ragu" : "tidak"}`
                                : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name="manualHasilPengirim"
                              checked={manualHasilPengirim === opt}
                              onChange={() => setManualHasilPengirim(opt)}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="participant-result-box">
                      <div className="pr-header">
                        <strong>Hasil Peserta 2</strong>
                      </div>
                      <div className="pr-options">
                        {(["Lanjut", "Ragu-ragu", "Tidak Lanjut"] as const).map((opt) => (
                          <label
                            key={opt}
                            className={`radio-label ${
                              manualHasilPenerima === opt
                                ? `selected ${opt === "Lanjut" ? "lanjut" : opt === "Ragu-ragu" ? "ragu" : "tidak"}`
                                : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name="manualHasilPenerima"
                              checked={manualHasilPenerima === opt}
                              onChange={() => setManualHasilPenerima(opt)}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {manualHasilPengirim === "Lanjut" && manualHasilPenerima === "Lanjut" && (
                    <div className="match-notice" style={{ marginTop: 16 }}>
                      <CheckCircle size={16} />
                      Kedua pihak memilih <strong>Lanjut</strong>. Pasangan akan otomatis tercatat cocok!
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel-modal"
                onClick={() => setShowManualModal(false)}
                disabled={isSubmittingManual}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-save-modal"
                onClick={handleSubmitManual}
                disabled={isSubmittingManual || loadingPeserta}
              >
                {isSubmittingManual ? "Menyimpan..." : "Simpan Hasil Ta'aruf"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled JSX */}
      <style jsx>{`
        .panggilan-container {
          min-height: 100vh;
          background: #faf7f2;
          padding: 24px 32px 60px;
          color: #26392d;
          font-family: inherit;
        }

        .panggilan-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #c5a059;
          background: rgba(197, 160, 89, 0.12);
          border: 1px solid rgba(197, 160, 89, 0.3);
          padding: 4px 10px;
          border-radius: 999px;
          margin-bottom: 8px;
        }

        .header-title {
          font-family: var(--serif, "Cormorant Garamond", Georgia, serif);
          font-size: 32px;
          font-weight: 700;
          color: #26392d;
          margin: 0 0 4px;
          letter-spacing: -0.02em;
        }

        .header-sub {
          font-size: 13px;
          color: #64748b;
          margin: 0;
          max-width: 600px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .kegiatan-select-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e6dfd3;
          border-radius: 10px;
          padding: 6px 12px;
          box-shadow: 0 2px 6px rgba(38, 57, 45, 0.04);
        }

        .kegiatan-select {
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: #26392d;
          outline: none;
          cursor: pointer;
        }

        .btn-refresh {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1px solid #e6dfd3;
          background: #ffffff;
          color: #26392d;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-refresh:hover {
          background: #f1ede4;
        }

        .tabs-bar {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid #e6dfd3;
          margin-bottom: 20px;
        }

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: -1px;
        }

        .tab-btn.active {
          color: #26392d;
          border-bottom-color: #26392d;
        }

        .tab-count {
          background: #e6dfd3;
          color: #26392d;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
        }

        .tab-btn.active .tab-count {
          background: #26392d;
          color: #faf7f2;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 20px;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e6dfd3;
          border-radius: 10px;
          padding: 8px 14px;
          width: 340px;
          max-width: 100%;
        }

        .search-box input {
          border: none;
          outline: none;
          font-size: 13px;
          color: #26392d;
          width: 100%;
          background: transparent;
        }

        .clear-search {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
        }

        .filter-select-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e6dfd3;
          border-radius: 10px;
          padding: 0 12px;
          height: 38px;
        }

        .filter-select {
          border: none;
          background: transparent;
          font-size: 13px;
          color: #26392d;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          min-width: 140px;
        }

        .btn-reset-filter {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 1px dashed #cbd5e1;
          color: #64748b;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-reset-filter:hover {
          background: #fef2f2;
          border-color: #fca5a5;
          color: #dc2626;
        }

        /* Pagination Bar */
        :global(.pagination-bar) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 24px;
          padding: 14px 20px;
          background: #ffffff;
          border: 1px solid #e6dfd3;
          border-radius: 14px;
          box-shadow: 0 2px 8px rgba(38, 57, 45, 0.04);
        }

        :global(.pagination-info) {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        :global(.pagi-page-badge) {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          color: #c5a059;
          background: rgba(197, 160, 89, 0.12);
          border: 1px solid rgba(197, 160, 89, 0.3);
          padding: 3px 9px;
          border-radius: 999px;
          letter-spacing: 0.02em;
        }

        :global(.pagi-count-text) {
          font-size: 13px;
          color: #5e6d62;
        }

        :global(.pagi-count-text strong) {
          color: #1f2b23;
          font-weight: 700;
        }

        :global(.pagination-controls) {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        :global(.page-size-selector) {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        :global(.page-size-label) {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }

        :global(.page-size-select) {
          padding: 6px 12px;
          border: 1px solid #e6dfd3;
          border-radius: 8px;
          background: #faf7f2;
          font-size: 12px;
          color: #26392d;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          transition: all 0.15s ease;
        }

        :global(.page-size-select:hover),
        :global(.page-size-select:focus) {
          border-color: #c5a059;
          background: #ffffff;
        }

        :global(.pagi-divider-v) {
          width: 1px;
          height: 24px;
          background: #e6dfd3;
        }

        :global(.pagination-buttons) {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        :global(.page-btn) {
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
          gap: 6px;
          user-select: none;
        }

        :global(.page-btn:hover:not(:disabled)) {
          border-color: #c5a059;
          background: #f4efe6;
          color: #26392d;
        }

        :global(.page-btn.active) {
          background: #26392d;
          border-color: #26392d;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(38, 57, 45, 0.2);
        }

        :global(.page-btn:disabled) {
          opacity: 0.35;
          cursor: not-allowed;
          background: #faf7f2;
          border-color: #eee9df;
          color: #94a3b8;
        }

        :global(.page-nav) {
          padding: 0 12px;
          font-size: 12px;
          font-weight: 600;
        }

        :global(.page-ellipsis) {
          padding: 0 4px;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 700;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }

        .filter-chip {
          border: 1px solid #e6dfd3;
          background: #ffffff;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-chip.active {
          background: #26392d;
          color: #faf7f2;
          border-color: #26392d;
        }

        .history-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .export-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-export {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .btn-excel {
          background: #15803d;
          color: #ffffff;
        }
        .btn-excel:hover {
          background: #166534;
        }

        .btn-manual {
          background: #2d5a43;
          color: #ffffff;
        }
        .btn-manual:hover {
          background: #1f3d2e;
        }

        .btn-pdf {
          background: #991b1b;
          color: #ffffff;
        }
        .btn-pdf:hover {
          background: #7f1d1d;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          background: #ffffff;
          border: 1px solid #e6dfd3;
          border-radius: 16px;
          text-align: center;
        }

        .empty-state h3 {
          margin: 12px 0 6px;
          font-size: 16px;
          font-weight: 700;
          color: #26392d;
        }

        .empty-state p {
          margin: 0;
          font-size: 13px;
          color: #64748b;
        }

        /* Queue Card Grid */
        .queue-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 16px;
        }

        .queue-card {
          background: #ffffff;
          border: 1px solid #e6dfd3;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(38, 57, 45, 0.04);
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }

        .queue-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(38, 57, 45, 0.09);
          border-color: #c5a059;
        }

        .queue-card.is-called {
          border-color: #c5a059;
          background: #fffcf8;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 6px;
        }

        .status-badge.waiting {
          background: #f1f5f9;
          color: #475569;
        }

        .status-badge.called {
          background: rgba(197, 160, 89, 0.15);
          color: #854d0e;
          border: 1px solid rgba(197, 160, 89, 0.35);
        }

        .status-badge.completed {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .time-badge {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
        }

        .pair-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #faf7f2;
          border: 1px solid #eee8df;
          border-radius: 10px;
          padding: 12px;
          gap: 12px;
          min-width: 0;
          overflow: hidden;
          width: 100%;
          box-sizing: border-box;
        }

        .participant-side {
          flex: 1 1 0;
          min-width: 0;
          overflow: hidden;
        }

        .participant-side.left {
          text-align: left;
        }

        .participant-side.right {
          text-align: right;
        }

        .p-num {
          font-size: 11px;
          font-weight: 800;
          color: #c5a059;
          letter-spacing: 0.05em;
        }

        .p-name {
          font-size: 14px;
          font-weight: 700;
          color: #26392d;
          margin: 2px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .p-meta {
          font-size: 11px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .pair-divider {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 6px;
        }

        .btn-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          padding: 9px 16px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-detail-pair {
          background: #ffffff;
          color: #26392d;
          border: 1px solid #d4c8b8;
        }
        .btn-detail-pair:hover {
          background: #f7f3ec;
          border-color: #c5a059;
          color: #1c2b22;
        }

        .btn-result {
          flex: 1;
          background: #26392d;
          color: #faf7f2;
          border: 1px solid #26392d;
        }
        .btn-result:hover {
          background: #1c2b22;
        }

        .btn-cancel {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 14px;
          border-radius: 8px;
          border: 1px solid #fca5a5;
          background: #fef2f2;
          color: #dc2626;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel:hover {
          background: #fee2e2;
          border-color: #ef4444;
          color: #b91c1c;
        }

        /* History Table */
        .table-responsive {
          background: #ffffff;
          border: 1px solid #e6dfd3;
          border-radius: 14px;
          overflow-x: auto;
          box-shadow: 0 4px 12px rgba(38, 57, 45, 0.04);
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }

        .history-table th {
          background: #faf7f2;
          color: #64748b;
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 16px;
          border-bottom: 1px solid #e6dfd3;
        }

        .history-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1ede4;
          vertical-align: middle;
        }

        .history-table tr:last-child td {
          border-bottom: none;
        }

        .col-time {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
        }

        .cell-person {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .person-num {
          font-size: 11px;
          font-weight: 800;
          color: #c5a059;
        }

        .person-name {
          font-weight: 700;
          color: #26392d;
        }

        .person-sub {
          font-size: 11px;
          color: #64748b;
        }

        .badge-result {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .badge-result.lanjut {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-result.tidak {
          background: #fee2e2;
          color: #dc2626;
        }

        .badge-conclusion {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
        }

        .badge-conclusion.match {
          background: rgba(38, 57, 45, 0.12);
          color: #26392d;
          border: 1px solid rgba(38, 57, 45, 0.25);
        }

        .badge-conclusion.unmatch {
          background: #f1f5f9;
          color: #64748b;
        }

        /* Modal Result */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .modal-content {
          background: #ffffff;
          border-radius: 16px;
          width: 500px;
          max-width: 100%;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2);
          border: 1px solid #e6dfd3;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e6dfd3;
          background: #faf7f2;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #26392d;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 16px;
          color: #94a3b8;
          cursor: pointer;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-sub {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 16px;
        }

        .form-result-row {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .participant-result-box {
          border: 1px solid #e6dfd3;
          border-radius: 10px;
          padding: 12px;
          background: #faf7f2;
        }

        .pr-header {
          font-size: 13px;
          color: #26392d;
          margin-bottom: 8px;
        }

        .pr-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pr-tag {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .pr-meta {
          font-size: 11px;
          color: #64748b;
          margin-top: 3px;
          font-weight: 500;
        }

        .pr-options {
          display: flex;
          gap: 10px;
        }

        .radio-label {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          background: #ffffff;
          border: 1px solid #e6dfd3;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .radio-label.selected.lanjut {
          background: #dcfce7;
          border-color: #86efac;
          color: #15803d;
        }

        .radio-label.selected.ragu {
          background: #fef9c3;
          border-color: #fde047;
          color: #854d0e;
        }

        .badge-result.ragu {
          background: #fef9c3;
          color: #854d0e;
        }

        .badge-conclusion.doubt {
          background: #fef9c3;
          color: #854d0e;
          border: 1px solid #fde047;
        }

        .radio-label.selected.tidak {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #dc2626;
        }

        .match-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
          background: #dcfce7;
          border: 1px solid #86efac;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 12px;
          color: #15803d;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid #e6dfd3;
          background: #faf7f2;
        }

        .btn-cancel-modal {
          background: #ffffff;
          border: 1px solid #e6dfd3;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
        }

        .btn-save-modal {
          background: #26392d;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #faf7f2;
          cursor: pointer;
        }
        .btn-save-modal:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .spin {
          animation: spin 1s linear infinite;
        }

        .modal-detail-content {
          width: 620px;
        }

        .modal-sub-title {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .detail-status-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: #faf7f2;
          border: 1px solid #e6dfd3;
          border-radius: 10px;
          margin-bottom: 16px;
        }

        .dsb-time {
          font-size: 12px;
          color: #64748b;
        }

        .dsb-time strong {
          color: #26392d;
        }

        .detail-pair-grid {
          display: flex;
          align-items: stretch;
          gap: 12px;
        }

        .detail-participant-card {
          flex: 1;
          background: #faf7f2;
          border: 1px solid #e6dfd3;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dpc-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dpc-num {
          font-size: 16px;
          font-weight: 800;
          color: #c5a059;
        }

        .dpc-role {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
          text-transform: uppercase;
        }

        .dpc-role.pemilih {
          background: rgba(38, 57, 45, 0.1);
          color: #26392d;
        }

        .dpc-role.terpilih {
          background: #fdf2f8;
          color: #be185d;
        }

        .dpc-name {
          font-family: var(--serif, "Cormorant Garamond", serif);
          font-size: 17px;
          font-weight: 700;
          color: #26392d;
          margin: 0;
          line-height: 1.25;
        }

        .dpc-info-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }

        .dpc-info-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          border-bottom: 1px dashed #e6dfd3;
          padding-bottom: 4px;
        }

        .dpc-lbl {
          color: #64748b;
          font-weight: 500;
        }

        .dpc-val {
          color: #1e293b;
          font-weight: 600;
          text-align: right;
        }

        .dpc-wa {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #059669;
          font-weight: 600;
          text-decoration: none;
        }

        .dpc-wa:hover {
          text-decoration: underline;
        }

        .detail-pair-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }

        .detail-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .btn-cancel-antrean {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #dc2626;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-right: auto;
        }

        .btn-cancel-antrean:hover {
          background: #fee2e2;
        }

        @media (max-width: 768px) {
          .detail-pair-grid {
            flex-direction: column;
          }
          .detail-pair-divider {
            transform: rotate(90deg);
            padding: 4px 0;
          }
          .panggilan-container {
            padding: 16px 16px 40px;
          }
          .queue-grid {
            grid-template-columns: 1fr;
          }
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-select-wrapper {
            width: 100%;
          }
          .filter-select {
            width: 100%;
          }
          .search-box {
            width: 100%;
          }
          .history-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .export-buttons {
            width: 100%;
          }
          .btn-export {
            flex: 1;
            justify-content: center;
          }
          :global(.pagination-bar) {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 14px;
            padding: 14px;
          }
          :global(.pagination-info) {
            justify-content: center;
          }
          :global(.pagination-controls) {
            flex-direction: column;
            width: 100%;
            gap: 12px;
          }
          :global(.pagi-divider-v) {
            display: none;
          }
          :global(.page-size-selector) {
            justify-content: center;
            width: 100%;
          }
          :global(.pagination-buttons) {
            justify-content: center;
            width: 100%;
            flex-wrap: wrap;
          }
          :global(.page-nav span) {
            display: none;
          }
          :global(.page-nav) {
            padding: 0 8px;
            min-width: 36px;
          }
        }
      `}</style>
      </div>
    </div>
  );
}
