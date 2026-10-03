"use client";



import Topbar from "@/components/Topbar";
import { Trash2, QrCode, Download, Clock, MapPin } from "lucide-react";
import * as XLSX from 'xlsx';

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { getPusherClient } from "@/lib/pusher-client";

interface KegiatanItem {
  id: string;
  judul: string;
  tanggal: string;
}

interface AbsensiItem {
  id: string;
  generusId: string;
  generusNama: string | null;
  generusNomorUnik: string | null;
  desaNama: string | null;
  desaKota: string | null;
  nomorPeserta: any;
  timestamp: string | null;
  keterangan: string | null;
  dapukan: string;
}

interface GenerusResult {
  id: string;
  nomorUnik: string;
  nama: string;
  desaNama: string | null;
  desaKota: string | null;
  nomorPeserta: any;
}

function AbsensiContent() {
  const searchParams = useSearchParams();
  const [kegiatan, setKegiatan] = useState<KegiatanItem[]>([]);
  const [selectedKegiatan, setSelectedKegiatan] = useState<string>(searchParams.get("kegiatanId") || "");
  const [absensiList, setAbsensiList] = useState<AbsensiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerType, setScannerType] = useState<"camera" | "physical">("camera");
  const [scanMode, setScanMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GenerusResult[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [physicalInput, setPhysicalInput] = useState("");
  const [userRole, setUserRole] = useState("");
  const [lastScanned, setLastScanned] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [filterKota, setFilterKota] = useState("");
  const [filterDesa, setFilterDesa] = useState("");
  const [absensiMode, setAbsensiMode] = useState<"scan_panitia" | "qr_self">("scan_panitia");

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void } | null>(null);
  const scanLockRef = useRef(false); // prevents concurrent scan callbacks
  const physicalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [kegRes, profRes, activeRes] = await Promise.all([
          fetch("/api/mandiri/kegiatan"),
          fetch("/api/profile"),
          fetch("/api/mandiri/settings?key=mandiri_active_kegiatan_id")
        ]);

        if (kegRes.ok) {
          const d = await kegRes.json();
          setKegiatan(Array.isArray(d) ? d : []);
        }

        if (activeRes.ok) {
          const active = await activeRes.json();
          if (active.value && !searchParams.get("kegiatanId")) {
            setSelectedKegiatan(active.value);
          }
        }

        if (profRes.ok) {
          const d = await profRes.json();
          setUserRole(d.role || "");
        }
      } catch (err) {
        console.error("Init fetch error:", err);
      }
    };
    init();
  }, []);

  const fetchAbsensi = useCallback(async () => {
    if (!selectedKegiatan) { setAbsensiList([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/mandiri/absensi?kegiatanId=${selectedKegiatan}`);
      if (!res.ok) throw new Error("Gagal mengambil data absensi");
      const data = await res.json();
      setAbsensiList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch absensi error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedKegiatan]);

  useEffect(() => { fetchAbsensi(); }, [fetchAbsensi]);

  // Realtime updates using Pusher
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe("taaruf-channel");

    const handleUpdate = (data: { kegiatanId: string }) => {
      if (data && data.kegiatanId === selectedKegiatan) {
        fetchAbsensi();
      } else if (!data) {
        fetchAbsensi();
      }
    };

    channel.bind("absensi-updated", handleUpdate);
    return () => {
      channel.unbind("absensi-updated", handleUpdate);
      pusher.unsubscribe("taaruf-channel");
    };
  }, [selectedKegiatan, fetchAbsensi]);




  // Beep Sounds
  const playBeep = (type: "success" | "error") => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === "success") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else {
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  };

  // Handle focus for physical scanner
  useEffect(() => {
    if (scannerType === "physical" && scanMode) {
      const focusInterval = setInterval(() => {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
            physicalInputRef.current?.focus();
        }
      }, 500);
      return () => clearInterval(focusInterval);
    }
  }, [scannerType, scanMode]);

  const handleSearch = async (q: string, showAll: boolean = false) => {
    setSearchQuery(q);
    if (!q && !showAll) { setSearchResults([]); return; }
    try {
      const res = await fetch(`/api/mandiri/absensi/search?q=${encodeURIComponent(q)}&kegiatanId=${selectedKegiatan}${showAll ? '&showAll=true' : ''}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    }
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch(searchQuery, true);
    }
  };

  const recordAbsensi = async (generusId: string) => {
    if (!selectedKegiatan) {
      setMessage({ type: "error", text: "Pilih kegiatan terlebih dahulu" });
      return;
    }
    try {
      const res = await fetch("/api/mandiri/absensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kegiatanId: selectedKegiatan, generusId, keterangan: "hadir" }),
      });
      const data = await res.json().catch(() => ({ error: "Format data tidak valid" }));

      if (!res.ok && res.status !== 409) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: data.error || "Gagal mencatat absensi", toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
        setMessage({ type: "error", text: data.error || "Gagal mencatat absensi" });
      } else if (res.status === 409) {
        Swal.fire({ icon: 'info', title: 'Sudah Ada', text: 'Peserta sudah tercatat hadir!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        setMessage({ type: "error", text: "Peserta sudah tercatat hadir!" });
      } else {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Absensi berhasil dicatat!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        setMessage({ type: "success", text: "Absensi berhasil dicatat!" });
        setSearchQuery("");
        setSearchResults([]);
        fetchAbsensi();
      }
    } catch (err) {
      console.error("Record absensi error:", err);
      Swal.fire({ icon: 'error', title: 'Error', text: "Terjadi kesalahan jaringan" });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const deleteAbsensi = async (id: string, name: string) => {
    const confirm = await Swal.fire({
      title: "Hapus Absensi?",
      text: `Hapus catatan kehadiran untuk ${name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/mandiri/absensi?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        Swal.fire({ icon: "success", title: "Terhapus", text: "Data absensi berhasil dihapus", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
        fetchAbsensi();
      } else {
        throw new Error("Gagal menghapus");
      }
    } catch (e) {
      Swal.fire({ icon: "error", title: "Error", text: "Terjadi kesalahan sistem" });
    }
  };

  const deleteAllAbsensi = async () => {
    if (!selectedKegiatan) {
      Swal.fire({ icon: "warning", title: "Pilih Kegiatan", text: "Silakan pilih kegiatan terlebih dahulu" });
      return;
    }
    
    if (absensiList.length === 0) {
      Swal.fire({ icon: "warning", title: "Data Kosong", text: "Tidak ada data absensi untuk dihapus" });
      return;
    }

    const confirm = await Swal.fire({
      title: "Hapus Semua Data Absensi?",
      text: "PERINGATAN: Semua data kehadiran untuk kegiatan ini akan dihapus secara permanen. Anda tidak dapat mengembalikan tindakan ini!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus Semua",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/mandiri/absensi?kegiatanId=${selectedKegiatan}&action=deleteAll`, { method: "DELETE" });
      if (res.ok) {
        Swal.fire({ icon: "success", title: "Terhapus", text: "Semua data absensi berhasil dihapus", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
        fetchAbsensi();
      } else {
        throw new Error("Gagal menghapus semua data");
      }
    } catch (e) {
      Swal.fire({ icon: "error", title: "Error", text: "Terjadi kesalahan sistem saat menghapus data" });
    }
  };

  const startQRScan = async (forcedId?: string) => {
    if (!selectedKegiatan) {
      setMessage({ type: "error", text: "Pilih kegiatan terlebih dahulu" });
      return;
    }
    setScanMode(true);
    scanLockRef.current = false;

    if (scannerType === "camera") {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        // Fetch cameras if not loaded
        let devices = cameras;
        if (devices.length === 0) {
           try {
             const fetchedDevices = await Html5Qrcode.getCameras();
             devices = fetchedDevices.map(d => ({ id: d.id, label: d.label }));
             setCameras(devices);
           } catch (err) {
             console.warn("Failed to get cameras:", err);
           }
        }

        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        const config = { fps: 15, qrbox: { width: 250, height: 250 } };
        const idToUse = forcedId || cameraId;

        await scanner.start(
          idToUse ? idToUse : { facingMode: "environment" },
          config,
          async (decodedText: string) => {
            if (scanLockRef.current) return;
            scanLockRef.current = true;
            await handleScanResult(decodedText);
            setTimeout(() => {
              scanLockRef.current = false;
              setScanFeedback(null);
            }, 2500);
          },
          () => {}
        );
      } catch (e) {
        console.error("QR scanner error:", e);
        setMessage({ type: "error", text: "Gagal membuka kamera. Pastikan izin kamera diberikan." });
        setScanMode(false);
      }
    }
  };

  const switchCamera = async (newId: string) => {
    setCameraId(newId);
    if (scanMode && scannerType === "camera") {
      if (scannerRef.current) {
        try { await (scannerRef.current as any).stop(); } catch {}
        scannerRef.current = null;
      }
      // Brief delay to allow hardware release
      setTimeout(() => {
        startQRScan(newId);
      }, 300);
    }
  };

  // New Robust Scanner Logic
  const scanBufferRef = useRef("");
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScanResult = async (code: string) => {
    if (!code || isProcessing) return;

    setIsProcessing(true);
    setPhysicalInput("");
    setLastScanned(null); // Clear previous result to show animation
    setScanFeedback({ type: "success", text: "Mencari data..." });

    try {
      const scanRes = await fetch(`/api/scanner?code=${encodeURIComponent(code)}`);
      const scanData = await scanRes.json().catch(() => ({ error: "Format data tidak valid" }));

      if (!scanRes.ok) {
        throw new Error(scanData.error || `Server Error ${scanRes.status}`);
      }

      if (scanData.type !== "unknown") {
        // Person to check-in can be participant or staff
        const person = scanData.person;
        const gId = scanData.type === "peserta" ? person.id : person.generusId;

        if (gId) {
          const res = await fetch("/api/mandiri/absensi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kegiatanId: selectedKegiatan, generusId: gId, keterangan: "hadir" }),
          });

          const data = await res.json();
          if (res.status === 409) {
            setScanFeedback({ type: "error", text: `⚠️ ${person.nama} sudah hadir` });
            playBeep("error");
            setLastScanned({ ...person, nomorPeserta: person.nomorPeserta || 'STAFF' });
          } else if (!res.ok) {
            setScanFeedback({ type: "error", text: `✗ Gagal: ${data.error}` });
            playBeep("error");
          } else {
            const roleLabel = scanData.type === "peserta" ? person.role : person.role.toUpperCase();
            setScanFeedback({ type: "success", text: `✓ ${person.nama} (${roleLabel} - HADIR)` });
            setLastScanned({ ...person, nomorPeserta: person.nomorPeserta || 'STAFF' });
            playBeep("success");
            fetchAbsensi();
          }
        } else {
          // If staff has no generusId, we can't record in mandiri_absensi yet
          setScanFeedback({ type: "error", text: `👤 ${person.nama}: Panitia/Pengurus belum terhubung ke Data Generus` });
          playBeep("error");
          setLastScanned({ ...person, nomorPeserta: 'ADMIN' });
        }
      } else {
        setScanFeedback({ type: "error", text: `✗ Tidak Dikenal: ${code}` });
        playBeep("error");
      }
    } catch (err: any) {
      setScanFeedback({ type: "error", text: `✗ Error: ${err.message || 'Gangguan Server'}` });
      playBeep("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const processScanCode = async (code: string) => {
    await handleScanResult(code);
    setTimeout(() => setScanFeedback(null), 3500);
  };

  const handlePhysicalInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhysicalInput(val);

    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

    // Increased debounce for better handling of different scanner speeds
    // Trigger on any length > 0 to support short sequence numbers
    scanTimeoutRef.current = setTimeout(() => {
        if (val.trim().length > 0) {
            processScanCode(val.trim().replace(/[^\w\s-]/g, ''));
        }
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      const code = physicalInput.trim().replace(/[^\w\s-]/g, '');
      if (code) processScanCode(code);
    }
  };

  const handleExport = () => {
    if (absensiList.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Data Kosong', text: 'Tidak ada data untuk diexport' });
      return;
    }

    const exportData = filteredAbsensi.map((item, index) => ({
      "No": index + 1,
      "Nama Lengkap": item.generusNama,
      "Nomor Peserta": (item.nomorPeserta && isNaN(Number(item.nomorPeserta))) ? item.nomorPeserta : (item.nomorPeserta ? `#${item.nomorPeserta}` : 'PANITIA'),
      "Kota/Daerah": item.desaKota || "-",
      "Desa": item.desaNama || "-",
      "Dapukan": item.dapukan || "Peserta",
      "Waktu": item.timestamp ? new Date(item.timestamp).toLocaleTimeString("id-ID") : "-",
      "Keterangan": item.keterangan || "hadir"
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");

    // Auto-size columns
    const colWidths = [
      { wch: 5 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Absensi_Mandiri_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredAbsensi = absensiList.filter(item => {
    const matchKota = !filterKota || item.desaKota === filterKota;
    const matchDesa = !filterDesa || item.desaNama === filterDesa;
    return matchKota && matchDesa;
  });

  const uniqueKota = Array.from(new Set(absensiList.map(i => i.desaKota).filter(Boolean))).sort();
  const uniqueDesa = Array.from(new Set(
    absensiList
      .filter(i => !filterKota || i.desaKota === filterKota)
      .map(i => i.desaNama)
      .filter(Boolean)
  )).sort();

  const stopScan = async () => {
    if (scannerRef.current) {
      try { await (scannerRef.current as any).stop(); } catch {}
      scannerRef.current = null;
    }
    setScanMode(false);
    setPhysicalInput("");
    setScanFeedback(null);
  };

  return (
    <div>
      <Topbar title="Absensi Usia Mandiri / Nikah" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Sistem Absensi Mandiri</h2>
            <p>Catat kehadiran peserta usia mandiri / nikah menggunakan QR Code atau pencarian manual</p>
          </div>
        </div>

        {message && (
          <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginBottom: 16 }}>
            {message.text}
          </div>
        )}

        <div className="responsive-grid-2" style={{ marginBottom: 20 }}>
          {/* Left: Scan & Search */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <span className="card-title" style={{ margin: 0 }}>Absensi Mandiri</span>
              <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 4, borderRadius: 8 }}>
                <button
                  type="button"
                  onClick={() => setAbsensiMode("scan_panitia")}
                  style={{
                    padding: "6px 12px", borderRadius: "6px", border: "none",
                    background: absensiMode === "scan_panitia" ? "white" : "transparent",
                    color: absensiMode === "scan_panitia" ? "#0f172a" : "#64748b",
                    fontWeight: 700, fontSize: "12px", cursor: "pointer",
                    boxShadow: absensiMode === "scan_panitia" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                  }}
                >
                  Scan Panitia
                </button>
                <button
                  type="button"
                  onClick={() => setAbsensiMode("qr_self")}
                  style={{
                    padding: "6px 12px", borderRadius: "6px", border: "none",
                    background: absensiMode === "qr_self" ? "white" : "transparent",
                    color: absensiMode === "qr_self" ? "#0f172a" : "#64748b",
                    fontWeight: 700, fontSize: "12px", cursor: "pointer",
                    boxShadow: absensiMode === "qr_self" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                  }}
                >
                  QR Mandiri
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Kegiatan <span className="required">*</span></label>
                <select className="form-control" value={selectedKegiatan} onChange={(e) => setSelectedKegiatan(e.target.value)}>
                  <option value="">-- Pilih Kegiatan --</option>
                  {kegiatan.map((k) => (
                    <option key={k.id} value={k.id}>{k.judul} ({k.tanggal})</option>
                  ))}
                </select>
              </div>

              {absensiMode === "scan_panitia" ? (
              <><div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div className="form-label" style={{ margin: 0 }}>Scan QR Code</div>
                    <div className="scanner-controls-wrapper" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="text-sm text-muted">Mode:</span>
                        <select
                          className="form-control text-sm"
                          style={{ padding: "4px 8px", width: "auto" }}
                          value={scannerType}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setScannerType(val);
                            if (scanMode) stopScan();
                          } }
                        >
                          <option value="camera">📷 Kamera</option>
                          <option value="physical">🔌 Mesin</option>
                        </select>
                      </div>

                      {scannerType === "camera" && cameras.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="text-sm text-muted">Kamera:</span>
                          <select
                            className="form-control text-sm"
                            style={{ padding: "4px 8px", width: "auto", maxWidth: "120px" }}
                            value={cameraId}
                            onChange={(e) => switchCamera(e.target.value)}
                          >
                            <option value="">Default</option>
                            {cameras.map(c => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {!scanMode ? (
                    <button className="btn btn-primary btn-full" onClick={() => startQRScan()} disabled={!selectedKegiatan}>
                      {scannerType === "camera" ? "📷 Buka Kamera Scan QR" : "🔌 Aktifkan Mesin Scanner"}
                    </button>
                  ) : (
                    <div>
                      {scannerType === "camera" ? (
                        <div style={{ position: "relative" }}>
                          <div id="qr-reader" style={{ width: "100%", borderRadius: 8, overflow: "hidden" }} />
                          {scanFeedback && (
                            <div style={{
                              position: "absolute", bottom: 0, left: 0, right: 0,
                              padding: "10px 14px", textAlign: "center",
                              fontWeight: 600, fontSize: 14,
                              background: scanFeedback.type === "success" ? "rgba(21,128,61,0.92)" : "rgba(185,28,28,0.92)",
                              color: "white", borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
                              zIndex: 10
                            }}>
                              {scanFeedback.text}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="physical-scanner-container">
                          <div className="physical-scanner-glow"></div>
                          <div style={{ position: "relative", zIndex: 1, padding: "20px 0" }}>
                            <div className="scanner-status-indicator">
                              <div className="status-dot pulsed"></div>
                              Ready to Scan
                            </div>

                            <div className="scanner-icon-container">
                              <QrCode size={48} className={`scanner-icon ${scanFeedback?.type === 'success' ? 'success' : scanFeedback?.type === 'error' ? 'error' : ''}`} />
                              <div className="scanner-beam"></div>
                            </div>

                            <div style={{ marginTop: 24 }}>
                              <div className="scanner-badge">PANDA PRJ-666 ACTIVE</div>
                              <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#1e293b", marginBottom: "4px" }}>
                                {isProcessing ? "Sedang Memproses..." : scanFeedback ? (scanFeedback.type === "success" ? "Berhasil!" : "Gagal!") : "Arahkan Scanner"}
                              </h3>
                              <p style={{ color: "#64748b", fontSize: "14px", maxWidth: "280px", margin: "0 auto", lineHeight: "1.5" }}>
                                {isProcessing ? "Mencocokkan data dengan database JB2..." : scanFeedback ? scanFeedback.text : "Pencatatan kehadiran otomatis aktif. Hubungkan Panda Scanner ke Port USB."}
                              </p>
                            </div>

                            {lastScanned && (
                              <div className="last-scanned-card">
                                <div className="last-scanned-avatar">
                                  {lastScanned.foto ? <img src={lastScanned.foto} /> : lastScanned.nama.charAt(0)}
                                </div>
                                <div style={{ textAlign: "left", flex: 1 }}>
                                  <div className="last-scanned-name">{lastScanned.nama}</div>
                                  <div className="last-scanned-meta">ID: {lastScanned.nomorUnik} • #{lastScanned.nomorPeserta}</div>
                                </div>
                                <div className="last-scanned-status">Hadir</div>
                              </div>
                            )}

                            <div className="scanner-instruction">
                              Scanner fisik terdeteksi. Silakan arahkan kursor ke sini atau
                              <button
                                onClick={() => physicalInputRef.current?.focus()}
                                className="btn-refocus"
                              >
                                Klik di sini
                              </button>
                              jika tidak merespons.
                            </div>
                            <input
                              ref={physicalInputRef}
                              type="text"
                              className="scanner-hidden-input"
                              value={physicalInput}
                              onChange={handlePhysicalInput}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              onBlur={() => {
                                if (scanMode && scannerType === "physical") {
                                  setTimeout(() => physicalInputRef.current?.focus(), 150);
                                }
                              } } />

                            {physicalInput && (
                              <div className="input-preview">
                                Typing: <code>{physicalInput}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <button className="btn btn-danger btn-full" style={{ marginTop: 12 }} onClick={stopScan}>
                        ✕ Stop Scan
                      </button>
                    </div>
                  )}
                </div><div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
                    <div className="form-label" style={{ marginBottom: 8 }}>Cari Manual Peserta Mandiri</div>
                    <div className="search-bar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nama atau nomor unik... (Tekan Enter untuk semua)"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onKeyDown={handleKeyDownSearch} />
                    </div>
                    {searchResults.length > 0 && (
                      <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                        {searchResults.map((g) => {
                          const isAlreadyRecorded = absensiList.some(a => a.generusId === g.id);
                          return (
                            <div
                              key={g.id}
                              className={`search-result-item ${isAlreadyRecorded ? "disabled" : ""}`}
                              style={{ 
                                padding: "10px 14px", 
                                borderBottom: "1px solid var(--border)", 
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center", 
                                cursor: isAlreadyRecorded ? "default" : "pointer",
                                opacity: isAlreadyRecorded ? 0.7 : 1
                              }}
                              onClick={() => {
                                if (!isAlreadyRecorded) recordAbsensi(g.id);
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, fontSize: "14px", color: isAlreadyRecorded ? "#64748b" : "inherit" }}>{g.nama}</div>
                                <div className="text-sm text-muted">No: {g.nomorPeserta} • {g.desaNama}</div>
                              </div>
                              {isAlreadyRecorded ? (
                                <span className="badge" style={{ background: "#e2e8f0", color: "#475569" }}>Sudah Tercatat</span>
                              ) : (
                                <span className="badge badge-green">Catat</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div></>
              ) : (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
                {selectedKegiatan ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", padding: "12px 0" }}>
                    <div style={{ background: "white", padding: 16, borderRadius: 16, border: "2px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent((typeof window !== "undefined" ? window.location.origin : "") + "/hadir?kegiatanId=" + selectedKegiatan)}&margin=10`}
                        alt="QR Code Mandiri"
                        style={{ width: "220px", height: "220px", display: "block" }}
                      />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: "0 0 6px" }}>Scan untuk Absen Mandiri</h4>
                      <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5, maxWidth: 280 }}>
                        Arahkan kamera smartphone Anda ke QR Code di atas untuk melakukan absensi secara mandiri.
                      </p>
                    </div>
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "8px 16px", borderRadius: 8, fontSize: 12, color: "#2563eb", fontWeight: 700, textTransform: "uppercase" }}>
                      {kegiatan.find(k => k.id === selectedKegiatan)?.judul || selectedKegiatan}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                    <QrCode size={40} style={{ margin: "0 auto 12px", opacity: 0.6 }} />
                    <p style={{ fontSize: 13, margin: 0 }}>Silakan pilih kegiatan terlebih dahulu untuk menampilkan QR Code.</p>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>

          {/* Right: Attendance list */}
          <div className="card">
            <div className="card-header absensi-list-header">
              <div className="absensi-header-title-group">
                <span className="card-title">Daftar Hadir Peserta</span>
                <span className="badge badge-blue">{filteredAbsensi.length} dari {absensiList.length} hadir</span>
              </div>
              <div className="absensi-header-buttons">
                <button className="btn btn-danger btn-sm btn-absensi-header" onClick={deleteAllAbsensi} disabled={!selectedKegiatan || absensiList.length === 0}>
                  <Trash2 size={14} /> Hapus Semua
                </button>
                <button className="btn btn-green btn-sm btn-absensi-header" onClick={handleExport} disabled={absensiList.length === 0}>
                  <Download size={14} /> Export Excel
                </button>
              </div>
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "150px" }}>
                  <select
                    className="form-control text-sm"
                    value={filterKota}
                    onChange={(e) => { setFilterKota(e.target.value); setFilterDesa(""); }}
                  >
                    <option value="">Semua Kota/Daerah</option>
                    {uniqueKota.map(k => <option key={k} value={k!}>{k}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: "150px" }}>
                  <select
                    className="form-control text-sm"
                    value={filterDesa}
                    onChange={(e) => setFilterDesa(e.target.value)}
                  >
                    <option value="">Semua Desa</option>
                    {uniqueDesa.map(d => <option key={d} value={d!}>{d}</option>)}
                  </select>
                </div>
                {(filterKota || filterDesa) && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setFilterKota(""); setFilterDesa(""); }}
                    style={{ padding: "0 10px" }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : filteredAbsensi.length === 0 ? (
              <div className="empty-state">
                <h3>Tidak ada data</h3>
                <p>{absensiList.length === 0 ? "Scan QR code atau cari manual untuk mencatat" : "Tidak ada data yang cocok dengan filter"}</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="table-wrapper desktop-only-table">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: "40px" }}>#</th>
                        <th>Peserta</th>
                        <th>Daerah</th>
                        <th>Dapukan</th>
                        <th>Waktu</th>
                        <th style={{ width: "60px", textAlign: "center" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAbsensi.map((item, i) => (
                        <tr key={item.id}>
                          <td className="text-muted">{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "14px" }}>{item.generusNama}</div>
                            <div className="text-sm text-muted" style={{ fontWeight: 600, color: "var(--primary)" }}>
                              {(item.nomorPeserta && isNaN(Number(item.nomorPeserta))) ? item.nomorPeserta : (item.nomorPeserta ? `#${item.nomorPeserta}` : 'PANITIA')}
                            </div>
                          </td>
                          <td><span className="badge badge-blue" style={{ fontSize: "10px" }}>{item.desaKota || item.desaNama || "Umum"}</span></td>
                          <td>
                            <span style={{ 
                              fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "10px", textTransform: "uppercase",
                              background: item.dapukan?.toLowerCase() === '' ? '#f1f5f9' : '#e0e7ff',
                              color: item.dapukan?.toLowerCase() === '' ? '#475569' : '#4338ca' 
                            }}>{item.dapukan || 'Peserta'}</span>
                          </td>
                          <td className="text-sm text-muted">
                            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) : "-"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="btn-icon text-red"
                              title="Hapus Kehadiran"
                              onClick={() => deleteAbsensi(item.id, item.generusNama || "Peserta")}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="mobile-only-cards">
                  {filteredAbsensi.map((item, i) => {
                    const isPanitia = item.dapukan && item.dapukan.toLowerCase() !== 'peserta' && item.dapukan.toLowerCase() !== '';
                    const formattedNum = (item.nomorPeserta && isNaN(Number(item.nomorPeserta))) 
                      ? item.nomorPeserta 
                      : (item.nomorPeserta ? `#${item.nomorPeserta}` : 'PANITIA');

                    return (
                      <div key={item.id} className="absensi-mobile-card">
                        <div className="card-top">
                          <div className="top-badges">
                            <span className="badge-index">#{i + 1}</span>
                            <span className={`badge-nomor ${isPanitia ? 'badge-panitia' : 'badge-peserta'}`}>
                              {formattedNum}
                            </span>
                            <span className={`badge-dapukan ${isPanitia ? 'dapukan-panitia' : 'dapukan-peserta'}`}>
                              {item.dapukan || 'Peserta'}
                            </span>
                          </div>

                          <div className="top-right-group">
                            {item.timestamp && (
                              <span className="badge-time">
                                <Clock size={11} />
                                {new Date(item.timestamp).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            <button
                              className="btn-delete-card"
                              title="Hapus Kehadiran"
                              onClick={() => deleteAbsensi(item.id, item.generusNama || "Peserta")}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="card-main">
                          <div className="nama-text">{item.generusNama}</div>
                          <div className="meta-row">
                            <span className="meta-wilayah">
                              <MapPin size={12} className="text-muted" />
                              {item.desaKota || item.desaNama || "Umum"}
                            </span>
                            {item.generusNomorUnik && (
                              <span className="unik-badge">{item.generusNomorUnik}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .physical-scanner-container {
          min-height: 320px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 15px 30px -10px rgba(0,0,0,0.05);
        }
        .physical-scanner-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .scanner-icon-container {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .scanner-icon { color: #94a3b8; transition: all 0.3s; }
        .scanner-icon.success { color: #10b981; transform: scale(1.1); }
        .scanner-icon.error { color: #ef4444; }
        .scanner-beam {
          position: absolute;
          top: 20%;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(59, 130, 246, 0.5);
          box-shadow: 0 0 10px #3b82f6;
          animation: scan 2s ease-in-out infinite;
          border-radius: 2px;
        }
        @keyframes scan {
          0%, 100% { top: 20%; opacity: 0; }
          50% { top: 80%; opacity: 1; }
        }
        .scanner-hidden-input {
          position: absolute;
          opacity: 0.05;
          width: 100px;
          height: 20px;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          cursor: default;
        }
        .scanner-instruction {
          font-size: 11px;
          color: #64748b;
          margin: 10px 0;
          line-height: 1.4;
        }
        .btn-refocus {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 0 6px;
          color: #475569;
          font-weight: 700;
          cursor: pointer;
          margin: 0 4px;
        }
        .btn-refocus:hover {
          background: #e2e8f0;
        }
        .scanner-status-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 10px;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
        }
        .status-dot.pulsed {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .input-preview {
          margin-top: 15px;
          font-size: 10px;
          color: #94a3b8;
          background: #f1f5f9;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }
        .scanner-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #dbeafe;
          padding: 4px 12px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .last-scanned-card {
          margin: 20px 20px 0;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideUp 0.4s ease-out;
          width: calc(100% - 40px);
          max-width: 320px;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .last-scanned-avatar {
          width: 40px; height: 40px; border-radius: 10px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-weight: 800; overflow: hidden;
        }
        .last-scanned-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .last-scanned-name { font-size: 14px; font-weight: 800; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .last-scanned-meta { font-size: 11px; color: #64748b; font-weight: 600; }
        .last-scanned-status { margin-left: auto; font-size: 10px; font-weight: 800; color: #10b981; background: #d1fae5; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; }

        .absensi-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .absensi-header-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .absensi-header-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .desktop-only-table {
          display: block;
        }

        .mobile-only-cards {
          display: none;
        }

        @media (max-width: 768px) {
          .absensi-list-header {
            flex-direction: column;
            align-items: stretch !important;
            gap: 10px;
          }

          .absensi-header-title-group {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
          }

          .absensi-header-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            width: 100%;
          }

          .btn-absensi-header {
            justify-content: center;
          }

          .desktop-only-table {
            display: none;
          }

          .mobile-only-cards {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 12px;
          }

          .absensi-mobile-card {
            background: #ffffff;
            border: 1px solid #e6dfd3;
            border-radius: 12px;
            padding: 12px 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f4efe6;
            padding-bottom: 8px;
            gap: 6px;
          }

          .top-badges {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
          }

          .badge-index {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
          }

          .badge-nomor {
            font-size: 12px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 6px;
          }

          .badge-peserta {
            background: #eef4f0;
            color: #26392d;
            border: 1px solid rgba(61, 90, 69, 0.2);
          }

          .badge-panitia {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }

          .badge-dapukan {
            font-size: 10.5px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 6px;
            text-transform: uppercase;
          }

          .dapukan-peserta {
            background: #f1f5f9;
            color: #475569;
          }

          .dapukan-panitia {
            background: #e0e7ff;
            color: #4338ca;
          }

          .top-right-group {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .badge-time {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            color: #64748b;
            background: #f8fafc;
            padding: 2px 6px;
            border-radius: 5px;
            border: 1px solid #e2e8f0;
            font-weight: 600;
          }

          .btn-delete-card {
            background: transparent;
            border: none;
            color: #ef4444;
            padding: 4px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 6px;
            transition: background 0.2s;
          }

          .btn-delete-card:hover {
            background: #fee2e2;
          }

          .card-main {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .nama-text {
            font-size: 14.5px;
            font-weight: 700;
            color: #0f172a;
            word-break: break-word;
          }

          .meta-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            font-size: 12px;
            color: #64748b;
            flex-wrap: wrap;
          }

          .meta-wilayah {
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }

          .unik-badge {
            font-family: monospace;
            font-size: 10.5px;
            color: #64748b;
            background: #f1f5f9;
            padding: 1px 5px;
            border-radius: 4px;
          }
        }
      `}</style>
    </div>
  );
}

export default function MandiriAbsensiPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
      <AbsensiContent />
    </Suspense>
  );
}
