"use client";




import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import {
  Sparkles, Search, User, MapPin, Heart, Calendar,
  GraduationCap, Briefcase, Lock, LogOut, ChevronDown, ChevronLeft, ChevronRight,
  Settings2, CheckCircle2, UserCheck, Users, Globe, Music, Utensils,
  X, ShieldCheck, Star, UtilityPole as UtensilsIcon, ArrowLeft, Instagram, Timer, MessageSquare, Clock, QrCode, Send, HelpCircle
} from "lucide-react";
import { startMandiriKatalogTour, isMandiriKatalogTourDone } from "@/lib/tours/tourKatalog";
import Link from "next/link";
import { getPusherClient } from "@/lib/pusher-client";
import JsBarcode from "jsbarcode";

function LocalBarcode({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 10,
          textMargin: 2
        });
      } catch (err) {
        console.error("JsBarcode error:", err);
      }
    }
  }, [value]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        maxWidth: "260px",
        width: "100%",
        height: "auto",
        display: "block",
        margin: "0 auto"
      }}
    />
  );
}

function IndonesianDateInput({ value, onChange, ...props }: any) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const displayValue = value ? value.split('-').reverse().join('/') : "";

  const handleTriggerPicker = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch (err) {
        console.error("Failed to showpicker:", err);
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '45px' }}>
      <input
        type="text"
        value={displayValue}
        placeholder="DD/MM/YYYY"
        readOnly
        onClick={handleTriggerPicker}
        style={{
          ...props.style,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          cursor: 'pointer',
          background: 'white'
        }}
      />
      {/* Calendar icon absolute positioned */}
      <span
        onClick={handleTriggerPicker}
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 2,
          cursor: 'pointer',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          color: '#64748b'
        }}
      >
        <Calendar size={18} />
      </span>
      {/* Native hidden date field that opens the picker */}
      <input
        ref={dateInputRef}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}

export default function PublicKatalogPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [gender, setGender] = useState("all");
  const [category, setCategory] = useState("all");
  const [pendidikan, setPendidikan] = useState("all");
  const [desaFilter, setDesaFilter] = useState("all");
  const [kelompokFilter, setKelompokFilter] = useState("all");
  const [pekerjaanFilter, setPekerjaanFilter] = useState("all");
  const [umurFilter, setUmurFilter] = useState("all");
  const [kriteriaFilter, setKriteriaFilter] = useState("all");
  const [hobiFilter, setHobiFilter] = useState("all");
  const [makananFilter, setMakananFilter] = useState("all");
  const [sukuFilter, setSukuFilter] = useState("all");
  const [umurMinFilter, setUmurMinFilter] = useState("");
  const [umurMaxFilter, setUmurMaxFilter] = useState("");
  const [anakKeFilter, setAnakKeFilter] = useState("");
  const [jumlahSaudaraFilter, setJumlahSaudaraFilter] = useState("");
  const [tinggiMinFilter, setTinggiMinFilter] = useState("");
  const [tinggiMaxFilter, setTinggiMaxFilter] = useState("");

  const [kotaList, setKotaList] = useState<string[]>([]);
  const [selectedKota, setSelectedKota] = useState("all");
  const [page, setPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userGender, setUserGender] = useState("");
  const [latestActivity, setLatestActivity] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [hasAttended, setHasAttended] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusQueue, setStatusQueue] = useState<any>(null);
  const [pendidikanList, setPendidikanList] = useState<string[]>([]);
  const [wilayahList, setWilayahList] = useState<any[]>([]);
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [pekerjaanList, setPekerjaanList] = useState<string[]>([]);
  const [umurList, setUmurList] = useState<number[]>([]);
  const [kriteriaList, setKriteriaList] = useState<string[]>([]);
  const [hobiList, setHobiList] = useState<string[]>([]);
  const [makananList, setMakananList] = useState<string[]>([]);
  const [sukuList, setSukuList] = useState<string[]>([]);
  const [filterKotaList, setFilterKotaList] = useState<string[]>([]);
  const [filterWilayahList, setFilterWilayahList] = useState<any[]>([]);
  const [filterKelompokList, setFilterKelompokList] = useState<any[]>([]);
  const [selections, setSelections] = useState<any[]>([]);

  // Box Love state
  const [boxLoveStatus, setBoxLoveStatus] = useState<string>("closed");
  const [katalogPublicStatus, setKatalogPublicStatus] = useState<string>("closed");

  // Komentar state
  const [komentarNama, setKomentarNama] = useState("");
  const [komentarAnon, setKomentarAnon] = useState(false);
  const [submittingKomentar, setSubmittingKomentar] = useState<string | null>(null);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [sentComments, setSentComments] = useState<any[]>([]);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [hasNewComments, setHasNewComments] = useState(false);
  const [activeTab, setActiveTab] = useState<"katalog" | "cart" | "profile" | "absen" | "hasil" | "saran">("katalog");
  const [hasilRRList, setHasilRRList] = useState<any[]>([]);
  const [loadingHasil, setLoadingHasil] = useState(false);
  const [hasilRRDrafts, setHasilRRDrafts] = useState<Record<string, string>>({});
  const [submittingHasilId, setSubmittingHasilId] = useState<string | null>(null);
  const [showAddHasilModal, setShowAddHasilModal] = useState(false);
  const [newHasilTargetId, setNewHasilTargetId] = useState("");
  const [newHasilChoice, setNewHasilChoice] = useState("Lanjut");
  const [saranText, setSaranText] = useState("");
  const [kepadaSaran, setKepadaSaran] = useState("");
  const [kepadaSaranLainnya, setKepadaSaranLainnya] = useState("");
  const [isAnonimSaran, setIsAnonimSaran] = useState(false);
  const [submittingSaran, setSubmittingSaran] = useState(false);
  const [mySaranList, setMySaranList] = useState<any[]>([]);
  const [editingSaranId, setEditingSaranId] = useState<string | null>(null);
  const [showSaranForm, setShowSaranForm] = useState(false);
  const [absenTabMode, setAbsenTabMode] = useState<"show_barcode" | "scan_camera">("show_barcode");
  const [scanningAbsen, setScanningAbsen] = useState(false);
  const absenScannerRef = useRef<any>(null);
  const [attendanceValidation, setAttendanceValidation] = useState<{
    kegiatanId?: string | null;
    kegiatanJudul?: string | null;
    keterangan?: string | null;
    timestamp?: string | null;
    nama?: string | null;
    nomorUrut?: string | number | null;
  } | null>(null);
  const [myFullProfile, setMyFullProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<any>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);


  // Helper to distinguish Pemanggil (Pengirim) vs Dipanggil (Penerima) RR status
  const checkUserAlreadyFilled = (targetItem: any, currentUser: any, activeRooms: any[], hasilRRList: any[], isAdmin: boolean) => {
    if (!targetItem || !currentUser) return false;

    const targetNo = String(targetItem.nomorUnik || targetItem.no || "");
    const targetId = String(targetItem.id || "");
    const userNo = String(currentUser.nomorUnik || currentUser.no || "");
    const userId = String(currentUser.id || "");

    // 1. Check in hasilRRList
    const rrEntry = hasilRRList.find((h: any) => {
      const pNo = String(h.pengirimNo || "");
      const pId = String(h.pengirimId || "");
      const rNo = String(h.penerimaNo || "");
      const rId = String(h.penerimaId || "");

      if (isAdmin) {
        return pNo === targetNo || pId === targetId || rNo === targetNo || rId === targetId;
      }
      const isMatch1 = (pNo === userNo || pId === userId) && (rNo === targetNo || rId === targetId);
      const isMatch2 = (rNo === userNo || rId === userId) && (pNo === targetNo || pId === targetId);
      return isMatch1 || isMatch2;
    });

    if (rrEntry) {
      const isPemanggil = String(rrEntry.pengirimNo || "") === userNo || String(rrEntry.pengirimId || "") === userId;
      const isDipanggil = String(rrEntry.penerimaNo || "") === userNo || String(rrEntry.penerimaId || "") === userId;

      if (isPemanggil && rrEntry.hasilPengirim && rrEntry.hasilPengirim !== "Menunggu") return true;
      if (isDipanggil && rrEntry.hasilPenerima && rrEntry.hasilPenerima !== "Menunggu") return true;
      if (!isPemanggil && !isDipanggil && isAdmin && rrEntry.hasilPengirim && rrEntry.hasilPengirim !== "Menunggu" && rrEntry.hasilPenerima && rrEntry.hasilPenerima !== "Menunggu") return true;
    }

    // 2. Check in activeRooms
    const room = activeRooms.find((r: any) => {
      const pNo = String(r.pengirimNo || "");
      const rNo = String(r.penerimaNo || "");

      if (isAdmin) {
        return pNo === targetNo || rNo === targetNo;
      }
      return (pNo === userNo && rNo === targetNo) || (rNo === userNo && pNo === targetNo);
    });

    if (room) {
      const isPemanggil = String(room.pengirimNo || "") === userNo;
      const isDipanggil = String(room.penerimaNo || "") === userNo;

      if (isPemanggil && room.hasilPengirim && room.hasilPengirim !== "Menunggu") return true;
      if (isDipanggil && room.hasilPenerima && room.hasilPenerima !== "Menunggu") return true;
      if (!isPemanggil && !isDipanggil && isAdmin && room.hasilPengirim && room.hasilPengirim !== "Menunggu" && room.hasilPenerima && room.hasilPenerima !== "Menunggu") return true;
    }

    return false;
  };

  const hasilRRPendingCount = hasilRRList.filter((item) => {
    if (!currentUser?.id) return false;
    const isPengirim = item.pengirimId === currentUser.id;
    const myHasil = isPengirim ? item.hasilPengirim : item.hasilPenerima;
    return !myHasil;
  }).length;



  // ─── HELPER: Safely build a query string with encoded params ──────────────
  // FIX: Prevents "The string did not match the expected pattern" DOMException
  // on mobile WebKit (iOS Safari) caused by unencoded special chars in URLs.
  const buildQuery = (params: Record<string, string | undefined | null>): string => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) p.set(k, v);
    });
    return p.toString();
  };

  const formatAttendanceDate = (value?: string | null) => {
    if (!value) return "";
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const applyAttendanceValidation = useCallback((payload: any, fallback: any = {}) => {
    const attendance = payload?.attendance || payload?.existing || {};
    setAttendanceValidation({
      kegiatanId: attendance.kegiatanId || payload?.kegiatanId || fallback.kegiatanId || null,
      kegiatanJudul: attendance.kegiatanJudul || payload?.kegiatanJudul || fallback.kegiatanJudul || "Kegiatan Mandiri",
      keterangan: attendance.keterangan || payload?.attendanceKeterangan || payload?.keterangan || fallback.keterangan || "hadir",
      timestamp: attendance.timestamp || payload?.attendanceTimestamp || payload?.timestamp || fallback.timestamp || null,
      nama: payload?.nama || payload?.generusNama || fallback.nama || null,
      nomorUrut: payload?.nomorUrut || fallback.nomorUrut || null,
    });
  }, []);

  const refreshAttendanceStatus = useCallback(async () => {
    const storedUnik = localStorage.getItem("attended_nomor_unik");
    if (!storedUnik) return;

    const storedToken = localStorage.getItem("attended_session_token");
    let deviceId = localStorage.getItem("mandiri_device_id");
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("mandiri_device_id", deviceId);
    }

    try {
      const res = await fetch(`/api/public/mandiri/katalog/check-status?${buildQuery({
        nomorUnik: storedUnik,
        ...(storedToken ? { sessionToken: storedToken } : {}),
        deviceId,
      })}`, { cache: "no-store" });
      if (!res.ok) return;

      const json = await res.json();
      if (json.status === "attended") {
        setHasAttended(true);
        applyAttendanceValidation(json);
        setCurrentUser((prev: any) => prev ? {
          ...prev,
          status: "attended",
          id: json.id || prev.id,
          nama: json.nama || prev.nama,
          nomorUrut: json.nomorUrut || prev.nomorUrut,
          nomorUnik: json.nomorUnik || prev.nomorUnik,
        } : prev);
      } else if (json.status === "waiting") {
        setAttendanceValidation(null);
        setCurrentUser((prev: any) => prev ? { ...prev, status: "waiting" } : prev);
      }
    } catch (e) {
      console.error("refreshAttendanceStatus error:", e);
    }
  }, [applyAttendanceValidation]);

  const stopSelfAbsenScan = async () => {
    if (absenScannerRef.current) {
      try {
        await absenScannerRef.current.stop();
      } catch { }
      absenScannerRef.current = null;
    }
    setScanningAbsen(false);
  };

  const startSelfAbsenScan = async () => {
    const uniqueNo = currentUser?.nomorUnik ||
      myFullProfile?.nomorUnik ||
      (typeof window !== "undefined" && localStorage.getItem("attended_nomor_unik")) ||
      "";
    if (!uniqueNo) {
      Swal.fire({ icon: "error", title: "Gagal", text: "Nomor Unik Anda tidak ditemukan. Pastikan Anda sudah login." });
      return;
    }

    setScanningAbsen(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (absenScannerRef.current) {
        try { await absenScannerRef.current.stop(); } catch { }
      }

      const scanner = new Html5Qrcode("katalog-qr-reader");
      absenScannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
          } catch { }

          await scanner.stop();
          absenScannerRef.current = null;
          setScanningAbsen(false);

          let kegId = "";
          try {
            const urlObj = new URL(decodedText);
            kegId = urlObj.searchParams.get("kegiatanId") || "";
          } catch {
            const match = decodedText.match(/[?&]kegiatanId=([^&]+)/);
            if (match) kegId = match[1];
          }

          if (!kegId) {
            Swal.fire({ icon: "error", title: "QR Code Tidak Valid", text: "QR Code ini bukan untuk absensi kegiatan." });
            return;
          }

          Swal.fire({
            title: "Mencatat Kehadiran...",
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
          });

          try {
            const res = await fetch("/api/public/absensi", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kegiatanId: kegId, nomorUnik: uniqueNo }),
            });
            const data = await res.json();

            if (res.status === 409) {
              applyAttendanceValidation(data, {
                kegiatanId: kegId,
                nama: currentUser?.nama,
                nomorUrut: currentUser?.nomorUrut,
              });
              setCurrentUser((prev: any) => prev ? { ...prev, status: "attended" } : prev);
              setAbsenTabMode("show_barcode");
              Swal.fire({ icon: "info", title: "Sudah Hadir", text: "Anda sudah tercatat hadir untuk kegiatan ini." });
            } else if (!res.ok) {
              Swal.fire({ icon: "error", title: "Gagal", text: data.error || "Gagal mencatat absensi." });
            } else {
              applyAttendanceValidation(data, {
                kegiatanId: kegId,
                nama: currentUser?.nama,
                nomorUrut: currentUser?.nomorUrut,
                timestamp: new Date().toISOString(),
              });
              setCurrentUser((prev: any) => prev ? { ...prev, status: "attended" } : prev);
              Swal.fire({ icon: "success", title: "Berhasil", text: "Kehadiran Anda berhasil dicatat!", timer: 2000, showConfirmButton: false });
              setAbsenTabMode("show_barcode");
              refreshAttendanceStatus();
            }
          } catch {
            Swal.fire({ icon: "error", title: "Error", text: "Terjadi kesalahan jaringan." });
          }
        },
        () => { }
      );
    } catch (e) {
      console.error("Self QR scan error:", e);
      Swal.fire({ icon: "error", title: "Kamera Gagal", text: "Gagal mengakses kamera. Mohon berikan izin kamera." });
    }
  };

  useEffect(() => {
    if (activeTab !== "absen" || absenTabMode !== "scan_camera") {
      stopSelfAbsenScan();
    }
  }, [activeTab, absenTabMode]);

  const fetchUserComments = useCallback(async (userId: string) => {
    try {
      // FIX: Use encodeURIComponent for userId to prevent URL parse errors on mobile
      const resRec = await fetch(`/api/mandiri/komentar?penerimaId=${encodeURIComponent(userId)}`);
      if (resRec.ok) {
        const data = await resRec.json();
        const lastSeen = localStorage.getItem(`last_seen_comment_${userId}`);
        if (data.length > 0 && data[0].id !== lastSeen && !isCommentsModalOpen) {
          setHasNewComments(true);
        }
        setUserComments(data);
      }

      const resSent = await fetch(`/api/mandiri/komentar?pengirimId=${encodeURIComponent(userId)}`);
      if (resSent.ok) {
        const data = await resSent.json();
        setSentComments(data);
      }
    } catch (e) {
      console.error("Error fetching comments:", e);
    }
  }, [isCommentsModalOpen]);

  // Periodic polling for comments
  useEffect(() => {
    if (currentUser?.id) {
      const interval = setInterval(() => {
        fetchUserComments(currentUser.id);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id, fetchUserComments]);

  // Update last seen when modal is open
  useEffect(() => {
    if (isCommentsModalOpen && currentUser?.id && userComments.length > 0) {
      localStorage.setItem(`last_seen_comment_${currentUser.id}`, userComments[0].id);
      setHasNewComments(false);
    }
  }, [isCommentsModalOpen, currentUser?.id, userComments]);

  const limit = 20;

  useEffect(() => {
    const saved = localStorage.getItem("mandiri_selections");
    if (saved) {
      try { setSelectedIds(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("mandiri_selections", JSON.stringify(selectedIds));
  }, [selectedIds]);

  const fetchActiveRooms = useCallback(async () => {
    const storedUnik = localStorage.getItem("attended_nomor_unik");
    const storedToken = localStorage.getItem("attended_session_token");
    try {
      const roomsRes = await fetch("/api/mandiri/rooms", {
        headers: {
          ...(storedUnik ? { "x-nomor-unik": storedUnik } : {}),
          ...(storedToken ? { "x-session-token": storedToken } : {}),
        }
      });
      if (roomsRes.ok) {
        setActiveRooms(await roomsRes.json());
      }
    } catch (e) {
      console.error("fetchActiveRooms error:", e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const storedUnik = localStorage.getItem("attended_nomor_unik");
      const storedToken = localStorage.getItem("attended_session_token");

      // FIX: Use buildQuery helper so ALL values are properly encoded
      // This is the primary fix for "The string did not match the expected pattern"
      const qs = buildQuery({
        search,
        page: String(page),
        limit: String(limit),
        jenisKelamin: gender,
        status: category === "pilihan" ? "all" : category,
        pendidikan,
        mandiriDesaId: desaFilter,
        kelompokId: kelompokFilter,
        pekerjaan: pekerjaanFilter,
        umur: umurFilter,
        umurMin: umurMinFilter,
        umurMax: umurMaxFilter,
        suku: sukuFilter,
        anakKe: anakKeFilter,
        jumlahSaudara: jumlahSaudaraFilter,
        tinggiMin: tinggiMinFilter,
        tinggiMax: tinggiMaxFilter,
        kriteria: kriteriaFilter,
        hobi: hobiFilter,
        makanan: makananFilter,
        kota: selectedKota,
        nomorUnik: storedUnik || "",
        sessionToken: storedToken || "",
        onlyChosen: category === "pilihan" ? "true" : "",
      });

      const res = await fetch(`/api/public/mandiri/katalog?${qs}`, { cache: "no-store" });

      if (res.status === 403) {
        setIsLocked(true);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) {
      console.error("fetchData error:", e);
    } finally {
      setLoading(false);
    }
  }, [search, page, gender, category, pendidikan, selectedKota, desaFilter, kelompokFilter, pekerjaanFilter, umurFilter, umurMinFilter, umurMaxFilter, sukuFilter, anakKeFilter, jumlahSaudaraFilter, tinggiMinFilter, tinggiMaxFilter, kriteriaFilter, hobiFilter, makananFilter, hasAttended, isAdmin]);

  useEffect(() => {
    if (hasAttended) fetchData();
  }, [fetchData, hasAttended]);

  useEffect(() => {
    async function init() {
      try {
        const storedUnik = localStorage.getItem("attended_nomor_unik");
        const storedToken = localStorage.getItem("attended_session_token");
        let deviceId = localStorage.getItem("mandiri_device_id");
        if (!deviceId) {
          deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          localStorage.setItem("mandiri_device_id", deviceId);
        }

        // Concurrent fetching for all parallelizable initial endpoints
        const [titleRes, descRes, filterRes, boxLoveRes, katalogStatusRes, profileRes, checkStatusRes, desaRes, kelRes] = await Promise.all([
          fetch("/api/public/mandiri/settings?key=mandiri_registration_title", { cache: "no-store" }),
          fetch("/api/public/mandiri/settings?key=mandiri_registration_description", { cache: "no-store" }),
          fetch("/api/public/mandiri/filters", { cache: "no-store" }),
          fetch("/api/mandiri/box-love?action=status", { cache: "no-store" }),
          fetch("/api/public/mandiri/settings?key=mandiri_katalog_public_status", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }).catch(() => null),
          storedUnik ? fetch(`/api/public/mandiri/katalog/check-status?${buildQuery({
            nomorUnik: storedUnik,
            ...(storedToken ? { sessionToken: storedToken } : {}),
            deviceId,
          })}`, { cache: "no-store" }) : Promise.resolve(null),
          fetch("/api/public/mandiri/desa", { cache: "no-store" }).catch(() => null),
          fetch("/api/public/mandiri/kelompok", { cache: "no-store" }).catch(() => null)
        ]);

        let title = "KATALOG PESERTA dan PANITIA";
        let description = "";
        if (titleRes.ok) { const t = await titleRes.json(); if (t.value) title = t.value; }
        if (descRes.ok) { const d = await descRes.json(); if (d.value) description = d.value; }
        setLatestActivity({ title, description });

        if (filterRes.ok) {
          const filterJson = await filterRes.json();
          setPendidikanList(filterJson.pendidikan || []);
          setPekerjaanList(filterJson.pekerjaan || []);
          setUmurList(filterJson.umur || []);
          setKriteriaList(filterJson.kriteriaPasangan || []);
          setHobiList(filterJson.hobi || []);
          setMakananList(filterJson.makanan || []);
          setSukuList(filterJson.suku || []);

          if (filterJson.kota) setFilterKotaList(filterJson.kota.sort());
          if (filterJson.wilayah) setFilterWilayahList(filterJson.wilayah);
          if (filterJson.kelompok) setFilterKelompokList(filterJson.kelompok);
        }

        if (desaRes && desaRes.ok) {
          const desas = await desaRes.json();
          if (Array.isArray(desas)) {
            setWilayahList(desas);
            const cities = Array.from(new Set(desas.map((d: any) => d.kota || d.daerahNama || ""))).filter(Boolean).sort() as string[];
            setKotaList(cities);
          }
        }

        if (kelRes && kelRes.ok) {
          const kelompoks = await kelRes.json();
          if (Array.isArray(kelompoks)) {
            setKelompokList(kelompoks);
          }
        }

        if (boxLoveRes.ok) {
          const boxLoveJson = await boxLoveRes.json();
          setBoxLoveStatus(boxLoveJson.value || "closed");
        }

        if (katalogStatusRes && katalogStatusRes.ok) {
          const json = await katalogStatusRes.json();
          setKatalogPublicStatus(json.value || "closed");
        }

        let userIsAdmin = false;
        let genderFromCheckStatus: string | null = null;

        if (checkStatusRes && checkStatusRes.ok) {
          const rawText = await checkStatusRes.text();
          if (rawText) {
            const data = JSON.parse(rawText);

            if (data.status === "attended" || data.status === "waiting") {
              if (data.status === "attended") {
                applyAttendanceValidation(data);
              } else {
                setAttendanceValidation(null);
              }
              setHasAttended(true);
              const userRole = data.role || localStorage.getItem("attended_role") || "Peserta";
              setCurrentUser({
                id: data.id,
                nama: data.nama,
                nomorUrut: data.nomorUrut,
                nomorUnik: data.nomorUnik || storedUnik || "",
                mandiriDesaNama: data.mandiriDesaNama,
                mandiriDesaKota: data.mandiriDesaKota,
                jenisKelamin: data.jenisKelamin,
                role: userRole,
                noTelp: data.noTelp,
                status: data.status,
              });

              if (data.jenisKelamin) {
                genderFromCheckStatus = data.jenisKelamin;
                setUserGender(data.jenisKelamin);
                // Peserta/panitia melihat katalog lawan jenis
                setGender(data.jenisKelamin === "L" ? "P" : "L");
              }
              setKomentarNama(data.nama);
              localStorage.setItem("attended_role", userRole);

              // Parallelize comments check and selections fetch
              const selQs = buildQuery({ nomorUnik: storedUnik, token: storedToken || "" });
              const [commRes, selRes] = await Promise.all([
                fetchUserComments(data.id),
                fetch(`/api/mandiri/pilih?${selQs}`, { cache: "no-store" })
              ]);

              if (selRes && selRes.ok) {
                const selText = await selRes.text();
                if (selText) {
                  try {
                    const selJson = JSON.parse(selText);
                    if (Array.isArray(selJson)) {
                      setSelections(selJson);
                      setSelectedIds(selJson.map((s: any) => String(s.penerimaId)));
                      setStatusQueue(selJson.find((s: any) => s.status === "Menunggu") || null);
                    }
                  } catch (e) { console.error("selJson parse error:", e); }
                }
              }
            } else if (data.status === "multi_login") {
              handleLogout();
            } else if (data.status === "not_found" || data.status === "no_activity") {
              localStorage.removeItem("attended_nomor_unik");
              localStorage.removeItem("attended_session_token");
              localStorage.removeItem("attended_role");
              setHasAttended(false);
              window.location.href = "/mandiri/katalog/login";
              return;
            }
          }
        }

        // Verifikasi admin/tim_pnkb session via profileRes
        // Hanya set gender dari profile jika checkStatusRes belum menemukannya,
        // untuk mencegah jenisKelamin hardcoded "L" di profile API menimpa data asli peserta/panitia
        if (profileRes && profileRes.ok) {
          try {
            const profile = await profileRes.json();
            if (profile && ["admin", "admin_romantic_room", "tim_pnkb", "tim_pnkb_gambuh"].includes(profile.role)) {
              userIsAdmin = true;
              setIsAdmin(true);
              if (!genderFromCheckStatus && profile.jenisKelamin) {
                setUserGender(profile.jenisKelamin);
                setGender(profile.jenisKelamin === "L" ? "P" : "L");
              }
            }
          } catch (e) { }
        }
        // Fetch active rooms for all users (admin, peserta, panitia)
        // so the banner/button reflects the real room state for everyone
        try {
          const storedUnikForRooms = localStorage.getItem("attended_nomor_unik");
          const storedTokenForRooms = localStorage.getItem("attended_session_token");
          const roomsRes = await fetch("/api/mandiri/rooms", {
            headers: {
              ...(storedUnikForRooms ? { "x-nomor-unik": storedUnikForRooms } : {}),
              ...(storedTokenForRooms ? { "x-session-token": storedTokenForRooms } : {}),
            }
          });
          if (roomsRes.ok) {
            setActiveRooms(await roomsRes.json());
          }
        } catch (e) { }
      } catch (e) {
        console.error("init error:", e);
      } finally {
        setVerifying(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    async function fetchMyProfile() {
      setLoadingProfile(true);
      try {
        const storedUnik = (typeof window !== "undefined" ? localStorage.getItem("attended_nomor_unik") : "") || currentUser?.nomorUnik || "";
        const storedToken = (typeof window !== "undefined" ? localStorage.getItem("attended_session_token") : "") || "";
        const qs = buildQuery({ nomorUnik: storedUnik, sessionToken: storedToken });
        const res = await fetch(`/api/public/mandiri/katalog/${currentUser.id}${qs ? `?${qs}` : ""}`);
        if (res.ok) {
          const json = await res.json();
          setMyFullProfile(json);
        }
      } catch (err) {
        console.error("fetchMyProfile error:", err);
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchMyProfile();
  }, [currentUser?.id, currentUser?.nomorUnik]);



  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setPage(1);
    }, 400); // Increased debounce slightly for better mobile performance
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (verifying) return; // Do not fetch data while verifying / initializing!
    const timer = setTimeout(fetchData, 100);
    return () => clearTimeout(timer);
  }, [fetchData, verifying]);

  const fetchSelections = useCallback(async () => {
    const storedUnik = localStorage.getItem("attended_nomor_unik");
    const storedToken = localStorage.getItem("attended_session_token");
    if (!storedUnik) return;

    const selQs = buildQuery({ nomorUnik: storedUnik, token: storedToken || "" });
    try {
      const selRes = await fetch(`/api/mandiri/pilih?${selQs}`);
      if (selRes.ok) {
        const selText = await selRes.text();
        if (selText) {
          const selJson = JSON.parse(selText);
          if (Array.isArray(selJson)) {
            setSelections(selJson);
            setSelectedIds(selJson.map((s: any) => String(s.penerimaId)));
            setStatusQueue(selJson.find((s: any) => s.status === "Menunggu") || null);
          }
        }
      }
    } catch (e) {
      console.error("fetchSelections error:", e);
    }
  }, []);

  const fetchHasilRR = useCallback(async (showLoading = false) => {
    if (!currentUser?.id) return;
    if (showLoading) setLoadingHasil(true);
    try {
      const res = await fetch(`/api/mandiri/hasil-rr?generusId=${currentUser.id}`);
      if (res.ok) {
        const json = await res.json();
        setHasilRRList(json);
      }
    } catch (e) {
      console.error("fetchHasilRR error:", e);
    } finally {
      if (showLoading) setLoadingHasil(false);
    }
  }, [currentUser?.id]);

  const fetchMySaran = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/public/saran?userId=${currentUser.id}`);
      if (res.ok) {
        const json = await res.json();
        setMySaranList(Array.isArray(json) ? json : []);
      }
    } catch (e) {
      console.error("fetchMySaran error:", e);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === "hasil") {
      fetchHasilRR(true);
    }
    if (activeTab === "saran") {
      fetchMySaran();
    }
  }, [activeTab, fetchHasilRR, fetchMySaran]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchHasilRR(false);
    }
  }, [currentUser?.id, fetchHasilRR]);

  // Auto-run Onboarding Tour saat pertama kali buka katalog
  useEffect(() => {
    if (currentUser?.id && !loading) {
      if (!isMandiriKatalogTourDone()) {
        const timer = setTimeout(() => {
          startMandiriKatalogTour();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser?.id, loading]);

  // Realtime updates using Pusher
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe("taaruf-channel");

    const handleUpdate = () => {
      // Trigger data refetching; also refresh rooms since auto-finalize may have cleared the room
      fetchActiveRooms();
      fetchData();
      fetchSelections();
      fetchHasilRR(false);
    };

    const handleAttendanceUpdate = () => {
      fetchData();
      refreshAttendanceStatus();
    };

    const handleBoxLoveUpdate = (data: any) => {
      if (data && data.status) {
        setBoxLoveStatus(data.status);
      }
    };

    const handleRoomChanged = (data: any) => {
      // Always refresh activeRooms so the banner/button clears for all users
      fetchActiveRooms();
      fetchData();
      fetchSelections();
      fetchHasilRR(false);

      if (data && data.action === "clear" && currentUser) {
        const myId = String(currentUser.id);
        const isAssociated =
          String(data.pengirimId) === myId ||
          String(data.penerimaId) === myId ||
          String(data.assignedGuardId) === myId ||
          String(data.assignedCallerId) === myId ||
          String(data.assignedCaller2Id) === myId;

        if (isAssociated) {
          Swal.fire({
            title: "Pemberitahuan",
            text: "Amal sholeh anda ke ruang titik tunggu utama, agar dijemput oleh Tim PNKB & Ibu Gambuh",
            icon: "info",
            confirmButtonText: "Baik",
            confirmButtonColor: "#3d5a45",
            allowOutsideClick: false
          });
        }
      }
    };

    channel.bind("taaruf-changed", handleUpdate);
    channel.bind("room-changed", handleRoomChanged);
    channel.bind("absensi-updated", handleAttendanceUpdate);
    channel.bind("box-love-status-changed", handleBoxLoveUpdate);

    return () => {
      channel.unbind("taaruf-changed", handleUpdate);
      channel.unbind("room-changed", handleRoomChanged);
      channel.unbind("absensi-updated", handleAttendanceUpdate);
      channel.unbind("box-love-status-changed", handleBoxLoveUpdate);
      pusher.unsubscribe("taaruf-channel");
    };
  }, [fetchData, fetchSelections, fetchHasilRR, fetchActiveRooms, refreshAttendanceStatus, currentUser]);

  const handleSendKomentar = async (penerimaId: string, itemNama: string, komentar: string) => {
    if (submittingKomentar) return;

    if (sentComments.some(sc => sc.penerimaId === penerimaId)) {
      Swal.fire("Akses Diblokir", "Anda sudah mengirimkan komentar kepada peserta ini.", "warning");
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: `Berikan komentar ${komentar}?`,
      text: `Anda akan memberikan komentar "${komentar}" untuk ${itemNama}. Setelah dikirim, Anda tidak dapat mengubah komentar ini.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Kirim',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#3d5a45',
    });

    if (!isConfirmed) return;

    setSubmittingKomentar(penerimaId);
    try {
      const res = await fetch("/api/mandiri/komentar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          penerimaId,
          pengirimId: currentUser?.id,
          pengirimNama: komentarNama,
          isAnonim: komentarAnon,
          komentar,
        }),
      });
      const result = await res.json();
      if (result.success) {
        Swal.fire({ title: "Berhasil!", text: "Komentar Anda telah terkirim.", icon: "success", timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        if (currentUser?.id) fetchUserComments(currentUser.id);
      } else {
        Swal.fire("Gagal", result.error || "Gagal mengirim komentar", "error");
      }
    } catch (e) {
      // FIX: More descriptive error — distinguish network vs server error
      Swal.fire("Error", "Gagal terhubung ke server. Periksa koneksi internet Anda.", "error");
    } finally {
      setSubmittingKomentar(null);
    }
  };

  const submitHasilRR = async (id: string | null, hasil: string, targetId?: string) => {
    const key = id || targetId || "new";
    setSubmittingHasilId(key);
    try {
      const res = await fetch("/api/mandiri/hasil-rr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id || undefined,
          targetId: targetId || undefined,
          generusId: currentUser?.id,
          hasil,
          kegiatanId: latestActivity?.id || ""
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Berhasil Disimpan",
          text: data.finished
            ? "Penilaian kedua peserta lengkap! Pertemuan selesai."
            : "Penilaian Anda disimpan. Menunggu penilaian dari lawan untuk mengetahui hasil.",
          timer: 2200,
          showConfirmButton: false
        });
        if (id) {
          setHasilRRDrafts(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
        setShowAddHasilModal(false);
        setNewHasilTargetId("");
        fetchHasilRR();
        fetchSelections();
      } else {
        Swal.fire("Gagal", data.error || "Gagal menyimpan hasil", "error");
      }
    } catch (e) {
      Swal.fire("Error", "Gagal terhubung ke server", "error");
    } finally {
      setSubmittingHasilId(null);
    }
  };

  const handleSubmitHasilRR = async (id: string, partnerName: string) => {
    const hasil = hasilRRDrafts[id];
    if (!hasil) {
      Swal.fire("Pilih Penilaian", "Silakan pilih penilaian terlebih dahulu (Lanjut / Ragu-Ragu / Tidak Lanjut).", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Simpan Penilaian?",
      text: `Anda akan memberikan penilaian "${hasil}" untuk ${partnerName}. Hasil hanya disetujui (Approved) jika lawan juga memilih Lanjut.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      await submitHasilRR(id, hasil);
    }
  };

  const handleSubmitSaran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saranText.trim()) return;

    setSubmittingSaran(true);
    try {
      const storedToken = localStorage.getItem("attended_session_token");

      const payload: any = {
        untuk: "Panggilan Ta'aruf",
        kepada: kepadaSaran === 'Lainnya' ? kepadaSaranLainnya : kepadaSaran,
        saran: saranText,
        nama: currentUser?.nama || "",
        isAnonim: isAnonimSaran,
        userId: currentUser?.id
      };

      let res;
      if (editingSaranId) {
        payload.id = editingSaranId;
        payload.token = storedToken;
        res = await fetch("/api/public/saran", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/public/saran", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Saran/masukan Anda telah disimpan!",
          timer: 2000,
          showConfirmButton: false
        });
        setSaranText("");
        setKepadaSaran("");
        setKepadaSaranLainnya("");
        setIsAnonimSaran(false);
        setEditingSaranId(null);

        // Refresh the list
        if (currentUser?.id) {
          const freshRes = await fetch(`/api/public/saran?userId=${currentUser.id}`);
          if (freshRes.ok) {
            const freshJson = await freshRes.json();
            setMySaranList(Array.isArray(freshJson) ? freshJson : []);
          }
        }
      } else {
        Swal.fire("Gagal", data.error || "Gagal menyimpan saran", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Gagal terhubung ke server", "error");
    } finally {
      setSubmittingSaran(false);
    }
  };

  const handleEditSaran = (saran: any) => {
    setSaranText(saran.saran);
    const standardOptions = ["Tim Acara", "Tim Panggilan Ta'aruf", "Tim PNKB dan Ibu Gambuh"];
    if (saran.kepada && !standardOptions.includes(saran.kepada)) {
      setKepadaSaran("Lainnya");
      setKepadaSaranLainnya(saran.kepada);
    } else {
      setKepadaSaran(saran.kepada || "");
      setKepadaSaranLainnya("");
    }
    setIsAnonimSaran(saran.isAnonim === 1);
    setEditingSaranId(saran.id);
  };

  const handleDeleteSaran = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Saran?',
      text: "Apakah Anda yakin ingin menghapus saran ini?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("attended_session_token");
        const res = await fetch(`/api/public/saran?id=${id}&userId=${currentUser?.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          Swal.fire('Terhapus!', 'Saran telah dihapus.', 'success');
          fetchMySaran();
        } else {
          Swal.fire('Gagal', 'Gagal menghapus saran', 'error');
        }
      } catch (e) {
        Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
      }
    }
  };

  const handleLogout = async () => {
    const { isConfirmed } = await Swal.fire({
      title: "Keluar dari Akun?",
      text: "Anda akan keluar dari perangkat ini. Status Anda tidak akan diubah.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
      confirmButtonColor: "#3d5a45",
      cancelButtonColor: "#64748b"
    });

    if (!isConfirmed) return;

    Swal.fire({
      title: "Sedang keluar...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const storedUnik = localStorage.getItem("attended_nomor_unik");
    if (storedUnik) {
      try {
        await fetch("/api/public/mandiri/katalog/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nomorUnik: storedUnik })
        });
      } catch (e) {
        console.error("Failed to perform logout API request:", e);
      }
    }
    localStorage.removeItem("attended_nomor_unik");
    localStorage.removeItem("attended_session_token");
    setHasAttended(false);
    unlockBodyScroll();
    Swal.close();
    window.location.href = "/mandiri/katalog/login";
  };

  const handlePulang = async () => {
    const { value: alasan, isConfirmed } = await Swal.fire({
      title: "Konfirmasi Pulang",
      text: "Apakah Anda yakin ingin pulang? Masukkan alasan pulang Anda:",
      input: "text",
      inputPlaceholder: "Contoh: Keperluan keluarga, lelah, dll.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Saya Pulang",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return "Alasan pulang wajib diisi!";
        }
      }
    });

    if (!isConfirmed) return;

    Swal.fire({
      title: "Sedang memproses...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const storedUnik = localStorage.getItem("attended_nomor_unik");
    if (storedUnik) {
      try {
        const res = await fetch("/api/public/mandiri/katalog/pulang", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nomorUnik: storedUnik, alasanPulang: alasan })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Gagal memproses");
        }

        await Swal.fire({
          title: "Berhasil",
          text: "Semoga alloh berikan pengampunan dan jodoh yg barokah",
          icon: "success",
          confirmButtonText: "Aamiin",
          confirmButtonColor: "#3d5a45"
        });
      } catch (e: any) {
        console.error("Failed to perform pulang API request:", e);
        Swal.fire("Gagal", e.message || "Gagal memproses data", "error");
        return;
      }
    } else {
      Swal.close();
    }

    localStorage.removeItem("attended_nomor_unik");
    localStorage.removeItem("attended_session_token");
    setHasAttended(false);
    unlockBodyScroll();
    window.location.href = "/mandiri/katalog/login";
  };

  // ─── Box Love handlers ────────────────────────────────────────────────────

  const lockBodyScroll = () => {
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.dataset.scrollY = String(scrollY);
  };
  const unlockBodyScroll = () => {
    const scrollY = Number(document.body.dataset.scrollY || "0");
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollY);
  };



  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleAdminSelesaikanSesi = async (sp: any) => {
    const room = sp.roomId ? activeRooms.find((r: any) => r.id === sp.roomId) : activeRooms.find((r: any) => String(r.pengirimNo) === String(sp.nomorUnik) || String(r.penerimaNo) === String(sp.nomorUnik));

    if (!room) {
      // Rooms might not be loaded yet — try refreshing first
      await fetchActiveRooms();
      Swal.fire("Error", "Ruangan tidak ditemukan. Coba lagi.", "error");
      return;
    }

    if (!room.startedAt) {
      Swal.fire({
        icon: "warning",
        title: "Sesi Belum Dimulai",
        text: "Sesi pertemuan belum dimulai oleh Admin.",
        confirmButtonColor: "#f43f5e"
      });
      return;
    }

    const isPengirim = String(currentUser?.nomorUnik) === String(room.pengirimNo);
    const isPenerima = String(currentUser?.nomorUnik) === String(room.penerimaNo);
    // A third-party admin is someone who is NOT one of the two participants
    // AND is not an assigned panitia in this room
    const isAssignedPanitia = !isPengirim && !isPenerima && currentUser?.id && (
      room.assignedGuardId === currentUser.id ||
      room.assignedCallerId === currentUser.id ||
      room.assignedCaller2Id === currentUser.id
    );
    const isThirdPartyAdmin = !isPengirim && !isPenerima && !isAssignedPanitia;

    // Guard: if not a participant/admin and no pemilihanId, can't proceed
    if (!isThirdPartyAdmin && !room.pemilihanId) {
      Swal.fire("Info", "Sesi ini sudah berakhir atau belum memiliki data pemilihan.", "info");
      await fetchActiveRooms();
      await fetchHasilRR();
      return;
    }

    let htmlContent = `<div style="text-align: left; margin-bottom: 20px;">`;

    if (isThirdPartyAdmin) {
      htmlContent += `<p style="font-size: 14px; margin-bottom: 15px; color: #64748b;">Tentukan hasil pertemuan untuk kedua belah pihak:</p>`;
    } else if (isAssignedPanitia) {
      htmlContent += `<p style="font-size: 14px; margin-bottom: 15px; color: #64748b;">Anda bertugas di ruangan ini. Tentukan hasil pertemuan untuk kedua peserta:</p>`;
    } else {
      htmlContent += `<p style="font-size: 14px; margin-bottom: 15px; color: #64748b;">Bagaimana hasil pertemuan Anda?</p>`;
    }
    const uid = Math.random().toString(36).substring(7);

    if (isPengirim || isThirdPartyAdmin || isAssignedPanitia) {
      htmlContent += `
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-weight: 800; font-size: 11px; text-transform: uppercase; color: #1e293b; margin-bottom: 8px; letter-spacing: 0.5px;">
                    ${isThirdPartyAdmin ? 'Pemilih: ' : 'Anda: '}<span style="color: #f43f5e; margin-left: 4px;">${room.pengirimNama}</span>
                </label>
                <div style="display: flex; gap: 8px;">
                    <input type="radio" id="p_lanjut_${uid}" name="hasil_p" value="Lanjut" style="display:none">
                    <label for="p_lanjut_${uid}" class="swal-custom-radio">Lanjut</label>
                    <input type="radio" id="p_ragu_${uid}" name="hasil_p" value="Ragu-ragu" style="display:none">
                    <label for="p_ragu_${uid}" class="swal-custom-radio">Ragu-ragu</label>
                    <input type="radio" id="p_tidak_${uid}" name="hasil_p" value="Tidak Lanjut" style="display:none">
                    <label for="p_tidak_${uid}" class="swal-custom-radio">Tidak Lanjut</label>
                </div>
            </div>
        `;
    }

    if (isPenerima || isThirdPartyAdmin || isAssignedPanitia) {
      htmlContent += `
            <div>
                <label style="display: block; font-weight: 800; font-size: 11px; text-transform: uppercase; color: #1e293b; margin-bottom: 8px; letter-spacing: 0.5px;">
                    ${isThirdPartyAdmin ? 'Terpilih: ' : 'Anda: '}<span style="color: #f43f5e; margin-left: 4px;">${room.penerimaNama}</span>
                </label>
                <div style="display: flex; gap: 8px;">
                    <input type="radio" id="t_lanjut_${uid}" name="hasil_t" value="Lanjut" style="display:none">
                    <label for="t_lanjut_${uid}" class="swal-custom-radio">Lanjut</label>
                    <input type="radio" id="t_ragu_${uid}" name="hasil_t" value="Ragu-ragu" style="display:none">
                    <label for="t_ragu_${uid}" class="swal-custom-radio">Ragu-ragu</label>
                    <input type="radio" id="t_tidak_${uid}" name="hasil_t" value="Tidak Lanjut" style="display:none">
                    <label for="t_tidak_${uid}" class="swal-custom-radio">Tidak Lanjut</label>
                </div>
            </div>
        `;
    }

    htmlContent += `
        <style>
            .swal-custom-radio { 
                flex: 1; 
                padding: 10px; 
                border: 2px solid #f1f5f9; 
                border-radius: 10px; 
                text-align: center; 
                cursor: pointer; 
                font-weight: 800; 
                font-size: 12px;
                transition: all 0.2s;
                color: #64748b;
            }
            .swal-custom-radio:hover {
                background: #f8fafc;
            }
            input[type="radio"]:checked + .swal-custom-radio {
                border-color: #f43f5e;
                background: #fff1f2;
                color: #f43f5e;
            }
        </style>
    </div>`;

    const { value: formValues } = await Swal.fire({
      title: isThirdPartyAdmin ? 'Selesaikan Sesi?' : 'Input Hasil RR',
      html: htmlContent,
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const hasil_p = document.querySelector('input[name="hasil_p"]:checked') ? (document.querySelector('input[name="hasil_p"]:checked') as HTMLInputElement).value : undefined;
        const hasil_t = document.querySelector('input[name="hasil_t"]:checked') ? (document.querySelector('input[name="hasil_t"]:checked') as HTMLInputElement).value : undefined;

        if (isPengirim && !hasil_p) {
          Swal.showValidationMessage("Silakan pilih hasil pertemuan Anda terlebih dahulu.");
          return false;
        }
        if (isPenerima && !hasil_t) {
          Swal.showValidationMessage("Silakan pilih hasil pertemuan Anda terlebih dahulu.");
          return false;
        }
        if ((isThirdPartyAdmin || isAssignedPanitia) && (!hasil_p || !hasil_t)) {
          Swal.showValidationMessage("Silakan pilih hasil untuk kedua peserta.");
          return false;
        }

        return { hasil_p, hasil_t };
      }
    });

    if (formValues) {
      try {
        let isSuccess = false;

        if (isThirdPartyAdmin || isAssignedPanitia) {
          // Admin / panitia yang ditugaskan: selesaikan room via PATCH
          const res = await fetch(`/api/mandiri/rooms/${room.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("attended_session_token") || ""}`
            },
            body: JSON.stringify({ action: "clear", hasilPengirim: formValues.hasil_p, hasilPenerima: formValues.hasil_t, operatorCompanionId: currentUser?.id })
          });
          if (!res.ok) throw new Error((await res.json()).error);
          isSuccess = true;
        } else {
          // Peserta (pengirim / penerima): submit hasil individual via POST
          if (!room.pemilihanId) {
            Swal.fire("Info", "Sesi ini sudah berakhir.", "info");
            await fetchActiveRooms();
            await fetchHasilRR();
            return;
          }
          const resultVal = isPengirim ? formValues.hasil_p : formValues.hasil_t;
          const res = await fetch("/api/mandiri/hasil-rr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: room.pemilihanId,
              generusId: currentUser?.id,
              hasil: resultVal
            })
          });
          if (!res.ok) throw new Error((await res.json()).error);
          isSuccess = true;
        }
        if (isSuccess) {
          Swal.fire({
            title: "Berhasil!",
            text: (isThirdPartyAdmin || isAssignedPanitia) ? "Sesi telah selesai dan hasil disimpan." : "Hasil pertemuan Anda berhasil disimpan.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
          });
          // Refresh all relevant state so UI reflects the new status immediately
          fetchData();
          fetchActiveRooms();
          fetchHasilRR();
        }
      } catch (err: any) {
        Swal.fire("Error", err.message, "error");
      }
    }
  };

  const handleConfirmSelection = async (targetId: string, targetName: string) => {
    const nomorUnik = localStorage.getItem("attended_nomor_unik");
    const token = localStorage.getItem("attended_session_token");

    const result = await Swal.fire({
      title: 'Pilih Peserta?',
      text: `Apakah Anda yakin ingin memilih ${targetName}? Pilihan ini akan langsung diteruskan ke antrean panggilan ta'aruf.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Pilih!',
      cancelButtonText: 'Batal',
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: "Memproses Pilihan...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      try {
        const res = await fetch("/api/mandiri/pilih", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId, nomorUnik, token }),
        });

        const text = await res.text();
        if (!text) throw new Error("Server tidak mengembalikan data. Coba lagi.");
        let json: any;
        try { json = JSON.parse(text); } catch { throw new Error("Respons server tidak valid. Coba lagi."); }
        if (!res.ok) throw new Error(json.error || "Gagal melakukan pemilihan");

        if (json.selections) {
          setSelections(json.selections);
          setSelectedIds(json.selections.map((s: any) => String(s.penerimaId)));
          setStatusQueue(json.selections.find((s: any) => s.status === "Menunggu") || null);
        }

        setData(prev => prev.map(item =>
          item.id === targetId ? { ...item, selectedCount: (item.selectedCount || 0) + 1 } : item
        ));

        if (selectedParticipant && selectedParticipant.id === targetId) {
          setSelectedParticipant((prev: any) => ({ ...prev, selectedCount: (prev.selectedCount || 0) + 1 }));
        }

        Swal.fire({ title: 'Berhasil!', text: 'Pilihan Anda telah dikirim. Sedang dalam antrean panggilan panitia.', icon: 'success', timer: 3000, showConfirmButton: false });
        closeDetail();
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error");
      }
    }
  };

  const handleCancelSelection = async (targetId: string, targetName: string) => {
    const nomorUnik = localStorage.getItem("attended_nomor_unik");
    const token = localStorage.getItem("attended_session_token");

    const result = await Swal.fire({
      title: 'Batalkan Pilihan?',
      text: `Apakah Anda yakin ingin membatalkan pilihan Anda untuk ${targetName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Batalkan!',
      cancelButtonText: 'Kembali',
    });

    if (result.isConfirmed) {
      try {
        const qs = buildQuery({
          targetId,
          nomorUnik: nomorUnik || "",
          token: token || "",
        });
        const res = await fetch(`/api/mandiri/pilih?${qs}`, {
          method: "DELETE",
        });

        const text = await res.text();
        if (!text) throw new Error("Server tidak mengembalikan data. Coba lagi.");
        let json: any;
        try { json = JSON.parse(text); } catch { throw new Error("Respons server tidak valid. Coba lagi."); }
        if (!res.ok) throw new Error(json.error || "Gagal membatalkan pemilihan");

        if (json.selections) {
          setSelections(json.selections);
          setSelectedIds(json.selections.map((s: any) => String(s.penerimaId)));
          setStatusQueue(json.selections.find((s: any) => s.status === "Menunggu") || null);
        }

        setData(prev => prev.map(item =>
          item.id === targetId ? { ...item, selectedCount: Math.max(0, (item.selectedCount || 0) - 1) } : item
        ));

        if (selectedParticipant && selectedParticipant.id === targetId) {
          setSelectedParticipant((prev: any) => ({ ...prev, selectedCount: Math.max(0, (prev.selectedCount || 0) - 1) }));
        }

        Swal.fire({ title: 'Dibatalkan!', text: 'Pilihan Anda telah berhasil dibatalkan.', icon: 'success', timer: 3000, showConfirmButton: false });
        closeDetail();
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error");
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  const openDetail = (participant: any) => {
    setSelectedParticipant(participant);
    setIsModalOpen(true);
    lockBodyScroll();
  };

  const closeDetail = () => {
    setIsModalOpen(false);
    unlockBodyScroll();
  };

  useEffect(() => {
    if (!verifying && !isLocked && !hasAttended) {
      window.location.href = "/mandiri/katalog/login";
    }
  }, [verifying, isLocked, hasAttended]);

  // ─── Early returns ────────────────────────────────────────────────────────

  if (isLocked || (katalogPublicStatus === "closed" && !hasAttended && !isAdmin)) {
    return (
      <div className="portal-root katalog-page-root">
        <div className="arabesque-bg-layer" aria-hidden="true" />
        <div className="ambient-glow-layer" aria-hidden="true" />
        <div className="locked-container">
          <div className="locked-card">
            <Lock size={48} className="lock-icon" />
            <h1>Halaman Ditutup</h1>
            <p>Maaf, katalog saat ini ditutup oleh Panitia.</p>
            <Link href="/" className="home-btn">Kembali ke Beranda</Link>
          </div>
        </div>
        <style jsx>{`
          .locked-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; position: relative; z-index: 1; }
          .locked-card { background: #faf7f2; padding: 40px; border-radius: 24px; box-shadow: 0 16px 40px rgba(0,0,0,0.25); text-align: center; max-width: 420px; border: 1px solid rgba(197, 160, 89, 0.45); }
          .lock-icon { color: #c5a059; margin-bottom: 20px; }
          h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 700; color: #26392d; margin-bottom: 12px; }
          p { color: #627265; margin-bottom: 24px; line-height: 1.6; font-size: 14px; }
          .home-btn { display: inline-block; background: #3d5a45; color: white; padding: 12px 28px; border-radius: 999px; font-weight: 700; text-decoration: none; transition: 0.2s; border: 1px solid #c5a059; }
          .home-btn:hover { background: #4d7057; transform: translateY(-2px); }
        `}</style>
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="portal-root katalog-page-root">
        <div className="arabesque-bg-layer" aria-hidden="true" />
        <div className="ambient-glow-layer" aria-hidden="true" />
        <div className="loading-screen">
          <div className="spinner-large"></div>
          <div className="loading-text">Memuat Katalog Pashmina 8.0...</div>
        </div>
        <style jsx>{`
          .loading-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; position: relative; z-index: 1; gap: 16px; }
          .spinner-large { width: 50px; height: 50px; border: 4px solid rgba(197, 160, 89, 0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 1s linear infinite; }
          .loading-text { color: #c5a059; font-size: 14px; font-weight: 600; letter-spacing: 0.3px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }



  if (!hasAttended && !isAdmin) {
    return null; // Return empty while redirecting
  }

  const selectedNames = selections.map(item => `${item.penerimaNama} (#${item.penerimaNoUrut || item.penerimaNo})`);

  return (
    <div className="portal-root katalog-page-root">
      <div className="arabesque-bg-layer" aria-hidden="true" />
      <div className="ambient-glow-layer" aria-hidden="true" />

      <div className="container pb-24">

      {/* Desktop Tabs */}
      <div id="tour-katalog-tabs" className="desktop-tab-nav">
        <button className={activeTab === "katalog" ? "active" : ""} onClick={() => setActiveTab("katalog")}>
          <Users size={16} />
          <span>Katalog</span>
        </button>
        <button id="tour-katalog-cart-tab" className={activeTab === "cart" ? "active" : ""} onClick={() => setActiveTab("cart")}>
          <div className="badge-icon-wrapper">
            <Heart size={16} fill={activeTab === "cart" ? "#c5a059" : "transparent"} color={activeTab === "cart" ? "#c5a059" : "#64748b"} />
            {selectedIds.length > 0 && (
              <span className="badge-count-bubble">{selectedIds.length}</span>
            )}
          </div>
          <span>Pilihanku</span>
        </button>
        <button className={activeTab === "hasil" ? "active" : ""} onClick={() => setActiveTab("hasil")}>
          <div className="badge-icon-wrapper">
            <MessageSquare size={16} />
            {hasilRRPendingCount > 0 && (
              <span className="badge-count-bubble">{hasilRRPendingCount}</span>
            )}
          </div>
          <span>Hasil RR</span>
        </button>
        <button id="tour-katalog-profile-tab" className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>
          <User size={16} />
          <span>Profil Saya</span>
        </button>
      </div>

      {/* HEADER */}
      <header className="page-header">
        <div className="badge-top">
          <Sparkles size={12} />
          {activeTab === "katalog" && "KATALOG PESERTA"}
          {activeTab === "cart" && "PILIHAN SAYA"}
          {activeTab === "hasil" && "HASIL TA'ARUF"}
          {activeTab === "saran" && "SARAN & MASUKAN"}
          {activeTab === "profile" && "PROFIL SAYA"}
          {activeTab === "absen" && "ABSENSI SAYA"}
        </div>
        <h1>
          {activeTab === "katalog" && <>DATA <span>PESERTA</span></>}
          {activeTab === "cart" && <>LOVE <span>LETTER</span></>}
          {activeTab === "hasil" && <>HASIL <span>TA&apos;ARUF</span></>}
          {activeTab === "saran" && <>SARAN <span>MASUKAN</span></>}
          {activeTab === "profile" && <>PROFIL <span>SAYA</span></>}
          {activeTab === "absen" && <>SCAN <span>ABSENSI</span></>}
        </h1>
        <div className="header-actions">
          <button
            type="button"
            className="btn-notification"
            onClick={() => startMandiriKatalogTour({ force: true })}
            title="Panduan Penggunaan Katalog"
            style={{ marginRight: 8, background: "rgba(197, 160, 89, 0.15)", color: "#c5a059", border: "1px solid rgba(197, 160, 89, 0.4)" }}
          >
            <HelpCircle size={18} />
          </button>
          <p className="welcome-msg">Selamat datang kembali, {currentUser?.nama || "User"}</p>
          <button
            className={`btn-notification ${hasNewComments ? 'has-new' : ''}`}
            onClick={() => {
              setIsCommentsModalOpen(true);
              setHasNewComments(false);
              if (currentUser?.id) fetchUserComments(currentUser.id);
            }}
          >
            <MessageSquare size={20} />
            {hasNewComments && <span className="notification-dot"></span>}
          </button>
        </div>
      </header>

      {(() => {
        if (!currentUser) return null;
        const activeRoomForUser = activeRooms.find((r: any) =>
          String(r.pengirimNo) === String(currentUser.nomorUnik) ||
          String(r.penerimaNo) === String(currentUser.nomorUnik) ||
          r.assignedGuardId === currentUser.id ||
          r.assignedCallerId === currentUser.id ||
          r.assignedCaller2Id === currentUser.id
        );

        if (activeRoomForUser) {
          const isPengirim = String(activeRoomForUser.pengirimNo) === String(currentUser.nomorUnik);
          const isPenerima = String(activeRoomForUser.penerimaNo) === String(currentUser.nomorUnik);
          const isPeserta = isPengirim || isPenerima;
          const roleStr = isPeserta ? 'Peserta' : 'Panitia';
          const isStarted = !!activeRoomForUser.startedAt;

          let hasSubmitted = false;
          if (isPengirim && activeRoomForUser.hasilPengirim && activeRoomForUser.hasilPengirim !== "Menunggu") {
            hasSubmitted = true;
          } else if (isPenerima && activeRoomForUser.hasilPenerima && activeRoomForUser.hasilPenerima !== "Menunggu") {
            hasSubmitted = true;
          }

          return (
            <div style={{ background: isStarted ? '#fef2f2' : '#fff7ed', border: `1px solid ${isStarted ? '#fecdd3' : '#fed7aa'}`, borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', color: isStarted ? '#9f1239' : '#9a3412', boxShadow: isStarted ? '0 4px 12px rgba(244, 63, 94, 0.1)' : '0 4px 12px rgba(249, 115, 22, 0.1)' }}>
              <div style={{ background: isStarted ? '#f43f5e' : '#f97316', color: 'white', padding: '10px', borderRadius: '50%', display: 'flex' }}>
                <Users size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  Di Dalam Ruangan
                  <span style={{ fontSize: '10px', background: isStarted ? '#ffe4e6' : '#ffedd5', color: isStarted ? '#be123c' : '#c2410c', padding: '2px 8px', borderRadius: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                    {roleStr}
                  </span>
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
                  Anda saat ini sedang ditugaskan/berada di dalam <strong>{activeRoomForUser.nama || activeRoomForUser.roomNama}</strong>.
                </div>
              </div>
              {!hasSubmitted ? (
                isStarted ? (
                  <button
                    onClick={() => handleAdminSelesaikanSesi({ roomId: activeRoomForUser.id, ...currentUser })}
                    style={{ flexShrink: 0, background: '#f43f5e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(244, 63, 94, 0.3)', transition: 'transform 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    {roleStr === 'Peserta' ? 'Input Hasil RR' : 'Selesaikan Sesi'}
                  </button>
                ) : (
                  <button
                    disabled
                    style={{ flexShrink: 0, background: '#cbd5e1', color: '#64748b', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'not-allowed', opacity: 0.8 }}
                  >
                    {roleStr === 'Peserta' ? 'Input Hasil RR' : 'Selesaikan Sesi'}
                  </button>
                )
              ) : (
                <div style={{ flexShrink: 0, background: '#fecdd3', color: '#9f1239', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '13px' }}>
                  Menunggu Pasangan...
                </div>
              )}
            </div>
          );
        }
        return null;
      })()}

      {/* TAB CONTENT: KATALOG */}
      {activeTab === "katalog" && (
        <>
          <div className="toolbar" style={{ width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
            <div id="tour-katalog-search" className="search-group" style={{ display: 'grid', gridTemplateColumns: '1fr 44px', gap: '8px', width: '100%' }}>
              <div className="search-bar" style={{ minWidth: 0, overflow: 'hidden' }}>
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  inputMode="search"
                  autoCorrect="off"
                  autoComplete="off"
                  placeholder="Cari nama, no. urut, kriteria, kota, atau desa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ minWidth: 0, width: '100%' }}
                />
                {searchTerm && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setSearchTerm("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                className={`btn-filter-toggle ${showFilters ? "active" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
                title="Filter"
                style={{ width: '44px', height: '44px', padding: 0 }}
              >
                <Settings2 size={16} />
              </button>
            </div>

            <div className="toolbar-status-row">
              <div className="status-badge">
                <Users size={14} />
                <span>{total} Peserta</span>
              </div>
            </div>

            {showFilters && (
              <div className="filter-controls">
                <div className="filter-field-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="filter-label">Kategori Peserta</label>
                  <div className="toggle-group">
                    {(["all", "peserta", "panitia"] as const).map(cat => (
                      <button key={cat} className={category === cat ? "active" : ""} onClick={() => { setCategory(cat); setPage(1); }}>
                        {cat === "all" ? "Semua" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Pendidikan</label>
                  <div className="select-container">
                    <select className="select-box" value={pendidikan} onChange={(e) => { setPendidikan(e.target.value); setPage(1); }}>
                      <option value="all">Semua Pendidikan</option>
                      {pendidikanList.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Daerah</label>
                  <div className="select-container">
                    <select className="select-box" value={selectedKota} onChange={(e) => { setSelectedKota(e.target.value); setDesaFilter("all"); setKelompokFilter("all"); setPage(1); }}>
                      <option value="all">Semua Daerah</option>
                      {(filterKotaList.length > 0 ? filterKotaList : kotaList).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Desa</label>
                  <div className="select-container">
                    <select className="select-box" value={desaFilter} onChange={(e) => { setDesaFilter(e.target.value); setKelompokFilter("all"); setPage(1); }}>
                      <option value="all">Semua Desa</option>
                      {(filterWilayahList.length > 0 ? filterWilayahList : wilayahList).filter(w => selectedKota === "all" || w.kota === selectedKota).map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Kelompok</label>
                  <div className="select-container">
                    <select className="select-box" value={kelompokFilter} onChange={(e) => { setKelompokFilter(e.target.value); setPage(1); }}>
                      <option value="all">Semua Kelompok</option>
                      {(filterKelompokList.length > 0 ? filterKelompokList : kelompokList).filter((k: any) => {
                        let activeWilayahList = filterWilayahList.length > 0 ? filterWilayahList : wilayahList;
                        let pMatch = true;
                        if (selectedKota !== "all") {
                          const p = activeWilayahList.find((w: any) => String(w.id) === String(k.desaId || k.mandiriDesaId));
                          if (!p || p.kota !== selectedKota) pMatch = false;
                        }
                        return pMatch && (desaFilter === "all" || String(k.desaId || k.mandiriDesaId) === desaFilter);
                      }).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Kategori Usia</label>
                  <div className="select-container">
                    <select className="select-box" value={umurFilter} onChange={(e) => { setUmurFilter(e.target.value); setPage(1); }}>
                      <option value="all">Semua Usia</option>
                      <option value="17-20">17 - 20 Tahun</option>
                      <option value="21-25">21 - 25 Tahun</option>
                      <option value="26-30">26 - 30 Tahun</option>
                      <option value=">30">&gt; 30 Tahun</option>
                      <optgroup label="Umur Spesifik">
                        {umurList.map(u => <option key={u} value={u}>{u} Tahun</option>)}
                      </optgroup>
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Suku</label>
                  <div className="select-container">
                    <select className="select-box" value={sukuFilter} onChange={(e) => { setSukuFilter(e.target.value); setPage(1); }}>
                      <option value="all">Semua Suku</option>
                      {sukuList.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Urutan Anak</label>
                  <div className="input-range-container">
                    <input type="number" className="filter-input-box" placeholder="Anak Ke" value={anakKeFilter} onChange={(e) => { setAnakKeFilter(e.target.value); setPage(1); }} />
                    <input type="number" className="filter-input-box" placeholder="Dari Saudara" value={jumlahSaudaraFilter} onChange={(e) => { setJumlahSaudaraFilter(e.target.value); setPage(1); }} />
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Tinggi Badan (cm)</label>
                  <div className="input-range-container">
                    <input type="number" className="filter-input-box" placeholder="Tinggi Min" value={tinggiMinFilter} onChange={(e) => { setTinggiMinFilter(e.target.value); setPage(1); }} />
                    <input type="number" className="filter-input-box" placeholder="Tinggi Max" value={tinggiMaxFilter} onChange={(e) => { setTinggiMaxFilter(e.target.value); setPage(1); }} />
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Pekerjaan</label>
                  <div className="select-container">
                    <select className="select-box" value={pekerjaanFilter} onChange={(e) => { setPekerjaanFilter(e.target.value); setPage(1); }}>
                      <option value="all">Semua Pekerjaan</option>
                      {pekerjaanList.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Hobi</label>
                  <div className="select-container">
                    <select className="select-box" value={hobiFilter} onChange={(e) => { setHobiFilter(e.target.value); setPage(1); }}>
                      <option value="all">Semua Hobi</option>
                      {hobiList.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Makanan/Minuman</label>
                  <div className="select-container">
                    <select className="select-box" value={makananFilter} onChange={(e) => { setMakananFilter(e.target.value); setPage(1); }}>
                      <option value="all">Semua Makanan/Minuman</option>
                      {makananList.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>

                <div className="filter-field-group">
                  <label className="filter-label">Kriteria Pasangan</label>
                  <div className="select-container">
                    <select className="select-box" value={kriteriaFilter} onChange={(e) => { setKriteriaFilter(e.target.value); setPage(1); }}>
                      <option value="all">Semua Kriteria Pasangan</option>
                      {kriteriaList.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>

                <button className="btn-reset-filters" onClick={() => {
                  setSearch("");
                  setSearchTerm("");
                  setGender(userGender === "L" ? "P" : (userGender === "P" ? "L" : "all"));
                  setCategory("all");
                  setPendidikan("all");
                  setSelectedKota("all");
                  setDesaFilter("all");
                  setKelompokFilter("all");
                  setPekerjaanFilter("all");
                  setUmurFilter("all");
                  setUmurMinFilter("");
                  setUmurMaxFilter("");
                  setSukuFilter("all");
                  setAnakKeFilter("");
                  setJumlahSaudaraFilter("");
                  setTinggiMinFilter("");
                  setTinggiMaxFilter("");
                  setKriteriaFilter("all");
                  setHobiFilter("all");
                  setMakananFilter("all");
                  setPage(1);
                  setShowFilters(false);
                }}>
                  <X size={14} />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>

          <div className="user-title-context">
            {statusQueue && (
              <div className="status-queue-banner">
                <Timer size={14} />
                <span>Sedang dalam antrean panggilan</span>
              </div>
            )}
          </div>

          <main id="tour-katalog-cards" className="grid-container">
            {loading && data.length === 0 ? (
              [...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)
            ) : (
              data.filter(item => item.id !== currentUser?.id && item.nomorUrut !== currentUser?.nomorUrut).map((item) => {
                const isPulang = item.keterangan?.toLowerCase() === "pulang";
                const isTidakHadir = item.keterangan?.toLowerCase() === "alpha" || item.keterangan?.toLowerCase() === "izin";
                const isPanitia = Boolean(item.panitiaStatus) || (Boolean(item.role) && item.role !== "generus" && item.role !== "Peserta");
                const isBelumHadir = Number(item.isHadir) === 0;
                const isUnavailable = isPulang || isTidakHadir;
                return (
                  <div key={item.id} className={`participant-card ${isUnavailable ? "is-pulang" : ""}`} style={{ position: "relative", opacity: isUnavailable ? 1 : undefined, filter: isUnavailable ? "none" : undefined }}>
                    <div style={isUnavailable ? { filter: "blur(5px) grayscale(0.6)", opacity: 0.7, pointerEvents: "none", userSelect: "none" } : {}}>
                      <div
                        className="card-image-wrapper"
                        style={{ cursor: item.foto ? "zoom-in" : "default" }}
                        onClick={(e) => {
                          if (item.foto) {
                            e.stopPropagation();
                            Swal.fire({
                              imageUrl: item.foto,
                              imageAlt: item.nama,
                              showConfirmButton: false,
                              showCloseButton: true,
                              width: "auto",
                              padding: "1rem"
                            });
                          }
                        }}
                      >
                        <img
                          src={item.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.nama)}&background=random`}
                          alt={item.nama}
                          className="card-image"
                          loading="lazy"
                        />
                        <div className="floating-badge id-badge">#{item.nomorUrut || "-"}</div>
                        {item.selectedCount >= 5 && (
                          <div className="floating-badge full-badge" style={isPulang ? { top: '50px' } : undefined}>PENUH (5/5)</div>
                        )}
                        {isPulang && (
                          <div className="floating-badge pulang-badge">PULANG</div>
                        )}
                        <div className={`floating-badge label-badge ${isPanitia ? "status-panitia" : ""}`}>
                          {isPanitia ? "PANITIA" : "PESERTA"}
                        </div>
                      </div>

                      <div className="card-content">
                        <h2 className="card-name">{item.nama}</h2>
                        <div className="card-location">
                          <MapPin size={14} />
                          <span>{item.mandiriDesaKota || "-"} • {item.mandiriDesaNama || item.desaNama || "-"}</span>
                        </div>

                        {/* Indikator Kuota Terlihat di Mobile & Desktop */}
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: item.selectedCount >= 5 ? '#fee2e2' : '#dcfce7',
                            color: item.selectedCount >= 5 ? '#ef4444' : '#16a34a',
                            border: '1px solid',
                            borderColor: item.selectedCount >= 5 ? '#fecaca' : '#bbf7d0'
                          }}>
                            <UserCheck size={12} />
                            <span>{item.selectedCount >= 5 ? "Kuota Habis" : "Masih Ada Kuota"}</span>
                          </div>
                        </div>

                        <div className="card-stats-grid">
                          <div className="stat-pill"><Calendar size={14} /><span>{item.tanggalLahir ? `${new Date().getFullYear() - new Date(item.tanggalLahir).getFullYear()} Tahun` : "-"}</span></div>
                          <div className="stat-pill"><GraduationCap size={14} /><span>{item.pendidikan || "-"}</span></div>
                          <div className="stat-pill"><Briefcase size={14} /><span>{item.pekerjaan || "Swasta"}</span></div>
                          <div className="stat-pill"><Globe size={14} /><span>{item.suku || "-"}</span></div>
                          <div className="stat-pill">
                            <Instagram size={14} />
                            {item.instagram ? (
                              <a href={`https://instagram.com/${item.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="card-instagram-link">
                                @{item.instagram.replace('@', '')}
                              </a>
                            ) : <span>-</span>}
                          </div>
                        </div>

                        <div className="card-passions-mini">
                          <div className="pass-pill"><Music size={12} /><span>Hobi: {item.hobi || "-"}</span></div>
                          <div className="pass-pill"><Utensils size={12} /><span>Makan/Minuman: {item.makananMinumanFavorit || "-"}</span></div>
                        </div>

                        <div className="card-actions">
                          <button className="btn-secondary" onClick={() => openDetail(item)}>Detail Profil</button>
                          {item.nomorUrut !== currentUser?.nomorUrut && (() => {
                            if (isUnavailable) return null;
                            const isSelected = selectedIds.includes(String(item.id));
                            const sel = selections.find((s: any) => String(s.penerimaId) === String(item.id));
                            const isWaiting = sel && sel.status === "Menunggu";

                            if (item.handshakeStatus) {
                              if (item.handshakeStatus === "Selesai") {
                                const alreadyFilled = checkUserAlreadyFilled(item, currentUser, activeRooms, hasilRRList, isAdmin);
                                return (
                                  <>
                                    <button className="btn-secondary disabled" disabled style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                      <Users size={16} />
                                      <span>Sudah Bertemu</span>
                                    </button>
                                    {alreadyFilled ? (
                                      <button className="btn-primary disabled" disabled style={{ background: '#94a3b8', borderColor: '#94a3b8', color: 'white', opacity: 0.6, cursor: 'not-allowed', marginTop: '8px' }}>
                                        <Heart size={16} />
                                        <span>Input Hasil RR</span>
                                      </button>
                                    ) : (
                                      <button className="btn-primary" style={{ background: '#10b981', borderColor: '#10b981', marginTop: '8px' }} onClick={() => { setIsModalOpen(false); setActiveTab('hasil'); }}>
                                        <Heart size={16} />
                                        <span>Input Hasil RR</span>
                                      </button>
                                    )}
                                  </>
                                );
                              }
                              if (item.handshakeStatus === "Diterima") {
                                return (
                                  <>
                                    <button className="btn-secondary disabled" disabled style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                      <Users size={16} />
                                      <span>Dalam Ruangan</span>
                                    </button>
                                    {(() => {
                                      const room = activeRooms.find((r: any) => String(r.pengirimNo) === String(item.nomorUnik) || String(r.penerimaNo) === String(item.nomorUnik));
                                      const isPart = room && currentUser && (String(currentUser.nomorUnik) === String(room.pengirimNo) || String(currentUser.nomorUnik) === String(room.penerimaNo) || room.assignedGuardId === currentUser.id || room.assignedCallerId === currentUser.id || room.assignedCaller2Id === currentUser.id);
                                      if (!isAdmin && !isPart) return null;

                                      const isStarted = room && !!room.startedAt;
                                      const alreadyFilled = checkUserAlreadyFilled(item, currentUser, activeRooms, hasilRRList, isAdmin);

                                      if (!isStarted || alreadyFilled) {
                                        return (
                                          <button className="btn-primary disabled" disabled style={{ background: '#94a3b8', borderColor: '#94a3b8', color: 'white', opacity: 0.6, cursor: 'not-allowed', marginTop: '8px' }}>
                                            {isAdmin ? <CheckCircle2 size={16} /> : <Heart size={16} />}
                                            <span>{isAdmin ? 'Selesaikan Sesi' : 'Input Hasil RR'}</span>
                                          </button>
                                        );
                                      }

                                      return (
                                        <button className="btn-primary" style={{ background: '#10b981', borderColor: '#10b981', marginTop: '8px' }} onClick={() => handleAdminSelesaikanSesi(item)}>
                                          {isAdmin ? <CheckCircle2 size={16} /> : <Heart size={16} />}
                                          <span>{isAdmin ? 'Selesaikan Sesi' : 'Input Hasil RR'}</span>
                                        </button>
                                      );
                                    })()}
                                  </>
                                );
                              }
                              if (item.handshakeStatus === "Menunggu") {
                                if (!isSelected) {
                                  return (
                                    <button className="btn-secondary disabled" disabled style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                      <Clock size={16} />
                                      <span>Dalam Antrean</span>
                                    </button>
                                  );
                                }
                              }
                            }

                            if (isSelected) {
                              if (isWaiting) {
                                return (
                                  <button
                                    className="btn-danger"
                                    onClick={() => handleCancelSelection(String(item.id), item.nama)}
                                  >
                                    <X size={16} />
                                    <span>Batalkan Pilihan</span>
                                  </button>
                                );
                              } else {
                                return (
                                  <button
                                    className="btn-primary selected disabled"
                                    disabled
                                  >
                                    <CheckCircle2 size={16} />
                                    <span>Terpilih</span>
                                  </button>
                                );
                              }
                            }

                            const isFull = (item.selectedCount || 0) >= 5;
                            const isMaxed = selectedIds.length >= 3;
                            const isDisabled = isFull || isMaxed;

                            // Ensure button is visible for BOTH peserta and panitia AS LONG AS they are not waiting.
                            // isBelumHadir already checks for Panitia attendance, and currentUser.status checks for the logged in user.
                            if (currentUser?.status === "waiting" || isBelumHadir || (!hasAttended && isAdmin)) {
                              return null;
                            }

                            if (katalogPublicStatus === "closed") {
                              return null;
                            }

                            return (
                              <button
                                className={`btn-primary ${isDisabled ? "disabled" : ""}`}
                                onClick={() => handleConfirmSelection(String(item.id), item.nama)}
                                disabled={isDisabled}
                              >
                                <Heart size={16} />
                                <span>{isFull ? "Penuh" : (isMaxed ? "Batas Tercapai" : "Pilih")}</span>
                              </button>
                            );
                          })()}
                        </div>

                        {item.id !== currentUser?.id && (
                          <div className="commentary-box">
                            {sentComments.some(sc => sc.penerimaId === item.id) ? (
                              <div className="comment-sent-indicator">
                                <MessageSquare size={14} />
                                <span>Komentar Anda: {sentComments.find(sc => sc.penerimaId === item.id)?.komentar}</span>
                              </div>
                            ) : (
                              <>
                                <div className="commentary-header">
                                  <div className="anon-toggle">
                                    <input type="checkbox" id={`anon-${item.id}`} checked={komentarAnon} onChange={(e) => setKomentarAnon(e.target.checked)} />
                                    <label htmlFor={`anon-${item.id}`}>Anonim</label>
                                  </div>
                                  {!komentarAnon && (
                                    <input
                                      type="text"
                                      className="comment-name-input"
                                      placeholder="Nama Anda..."
                                      value={komentarNama}
                                      onChange={(e) => setKomentarNama(e.target.value)}
                                      disabled={!!currentUser}
                                      autoComplete="off"
                                    />
                                  )}
                                </div>
                                <div className="comment-tags-label">Berikan Komentar Singkat:</div>
                                <div className="comment-buttons">
                                  {["Humble", "Baik", "Pendiam", "Penyabar", "Friendly"].map(tag => (
                                    <button
                                      key={tag}
                                      className={`btn-tag ${submittingKomentar === item.id ? "loading" : ""}`}
                                      onClick={() => handleSendKomentar(item.id, item.nama, tag)}
                                      disabled={!!submittingKomentar}
                                    >
                                      {tag}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {isUnavailable && (
                      <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                        padding: "24px"
                      }}>
                        <div style={{
                          background: "rgba(255, 255, 255, 0.95)",
                          padding: "20px",
                          borderRadius: "20px",
                          textAlign: "center",
                          color: "#ef4444",
                          fontWeight: 700,
                          fontSize: "14px",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                          border: "2px solid #fee2e2",
                          lineHeight: 1.5,
                          backdropFilter: "blur(4px)"
                        }}>
                          Mohon maaf peserta {item.nama} {isPulang ? "pulang lebih awal" : (isBelumHadir ? "belum melakukan absensi kehadiran" : "tidak hadir")}, Anda tidak bisa memilih peserta tersebut.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </main>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-nav-btn"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
                <span className="pagination-text">Prev</span>
              </button>
              <div className="page-numbers">
                {(() => {
                  let start = Math.max(1, page - 2);
                  let end = Math.min(totalPages, start + 4);
                  if (end - start < 4) {
                    start = Math.max(1, end - 4);
                  }
                  const pages = [];
                  for (let i = start; i <= end; i++) {
                    pages.push(i);
                  }
                  return pages.map(num => (
                    <button
                      key={num}
                      className={page === num ? "active" : ""}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  ));
                })()}
              </div>
              <button
                className="pagination-nav-btn"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                title="Halaman Berikutnya"
              >
                <span className="pagination-text">Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* TAB CONTENT: CART / LOVE LETTER */}
      {activeTab === "cart" && (
        <div className="cart-container">
          <div className="selection-info-card">
            <Heart size={20} fill="#c5a059" color="#c5a059" />
            <span>Pilihan Anda ({selectedIds.length}/3)</span>
          </div>

          {statusQueue && (
            <div className="status-queue-banner block mb-6">
              <Timer size={14} />
              <span>Sedang dalam antrean panggilan</span>
            </div>
          )}

          {selections.length === 0 ? (
            <div className="empty-cart-state">
              <div className="empty-cart-icon">💌</div>
              <h3>Belum Ada Pilihan</h3>
              <p>Cari peserta yang cocok di tab Katalog, lalu pilih untuk dikirim ke daftar antrean panggilan.</p>
              <button className="goto-catalog-btn" onClick={() => setActiveTab("katalog")}>Cari Peserta</button>
            </div>
          ) : (
            <div className="cart-list">
              {selections.map((sel: any) => {
                const isWaiting = sel.status === "Menunggu";
                return (
                  <div key={sel.id} className="cart-item-card">
                    <div className="cart-item-info">
                      <div className="cart-item-avatar">
                        <Heart size={20} fill="#c5a059" color="#c5a059" />
                      </div>
                      <div>
                        <div className="cart-item-name">#{sel.penerimaNoUrut || sel.penerimaNo} {sel.penerimaNama}</div>
                        <div className="cart-item-status">
                          <span className={`status-badge-pill ${sel.status.toLowerCase()}`}>
                            {sel.status === "Menunggu" ? "⏳ Menunggu Admin" : sel.status === "Selesai" ? "✓ Selesai (Kuota Terpakai)" : `💖 ${sel.status}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isWaiting ? (
                      <button
                        className="cart-btn-danger"
                        onClick={() => handleCancelSelection(String(sel.penerimaId), sel.penerimaNama)}
                      >
                        <X size={16} />
                        <span>Batalkan</span>
                      </button>
                    ) : (
                      <button className="cart-btn-disabled" disabled>
                        <CheckCircle2 size={16} />
                        <span>{sel.status === "Selesai" ? "Terpakai" : "Terpilih"}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}


        </div>
      )}

      {/* TAB CONTENT: ABSEN */}
      {activeTab === "absen" && (() => {
        const uniqueNo = currentUser?.nomorUnik ||
          myFullProfile?.nomorUnik ||
          (typeof window !== "undefined" && localStorage.getItem("attended_nomor_unik")) ||
          "";
        const attendanceRoleLabel = (() => {
          const role = String(currentUser?.role || "").toLowerCase();
          const nomorUnik = String(currentUser?.nomorUnik || myFullProfile?.nomorUnik || uniqueNo || "").toUpperCase();
          return (role && !["peserta", "generus"].includes(role)) || nomorUnik.startsWith("PNB")
            ? "Panitia"
            : "Peserta";
        })();
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "24px 16px", minHeight: "60vh", justifyContent: "center" }}>

            {/* Mode Toggle Switch */}
            <div style={{ display: "flex", gap: "6px", background: "rgba(197, 160, 89, 0.15)", padding: "5px", borderRadius: "14px", width: "100%", maxWidth: "360px", marginBottom: "4px", border: "1px solid rgba(197, 160, 89, 0.35)" }}>
              <button
                type="button"
                onClick={() => setAbsenTabMode("show_barcode")}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: absenTabMode === "show_barcode" ? "1px solid #c5a059" : "none",
                  background: absenTabMode === "show_barcode" ? "#26392d" : "transparent",
                  color: absenTabMode === "show_barcode" ? "#faf7f2" : "#c4d4c8",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: absenTabMode === "show_barcode" ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
                  transition: "all 0.2s"
                }}
              >
                QR Code Saya
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbsenTabMode("scan_camera");
                  setTimeout(() => startSelfAbsenScan(), 100);
                }}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: absenTabMode === "scan_camera" ? "1px solid #c5a059" : "none",
                  background: absenTabMode === "scan_camera" ? "#26392d" : "transparent",
                  color: absenTabMode === "scan_camera" ? "#faf7f2" : "#c4d4c8",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: absenTabMode === "scan_camera" ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
                  transition: "all 0.2s"
                }}
              >
                Scan QR Kegiatan
              </button>
            </div>

            <div style={{ background: "#faf7f2", borderRadius: "24px", padding: "28px 24px", boxShadow: "0 10px 35px rgba(0,0,0,0.2)", border: "1px solid rgba(197, 160, 89, 0.45)", textAlign: "center", width: "100%", maxWidth: "360px" }}>

              {absenTabMode === "show_barcode" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "6px" }}>
                    <QrCode size={20} color="#c5a059" />
                    <span style={{ fontWeight: 700, fontSize: "20px", color: "#26392d", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>QR Code Absensi</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#627265", marginBottom: "20px" }}>Tunjukkan QR Code ini ke panitia untuk absensi</p>

                  {uniqueNo ? (
                    <>
                      <div style={{ background: "white", borderRadius: "18px", padding: "16px", display: "inline-block", border: "2px solid rgba(197, 160, 89, 0.4)", marginBottom: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.06)" }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${uniqueNo}&margin=10`}
                          alt="QR Code Peserta"
                          style={{ width: "160px", height: "160px", display: "block" }}
                        />
                      </div>
                      <div>
                        <div style={{ background: "linear-gradient(135deg, #26392d, #3d5a45)", color: "#faf7f2", borderRadius: "12px", padding: "10px 22px", fontSize: "19px", fontWeight: 800, letterSpacing: "3px", marginBottom: "6px", display: "inline-block", border: "1px solid #c5a059", boxShadow: "0 4px 15px rgba(38, 57, 45, 0.25)" }}>
                          {uniqueNo}
                        </div>
                      </div>
                      <p style={{ fontSize: "11px", color: "#627265", margin: "6px 0 0", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>Nomor Unik {attendanceRoleLabel}</p>
                    </>
                  ) : (
                    <div style={{ padding: "30px", color: "#627265", fontSize: "13px" }}>
                      <QrCode size={40} color="#c5a059" style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                      <p>Data QR Code tidak tersedia</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "6px" }}>
                    <QrCode size={20} color="#c5a059" />
                    <span style={{ fontWeight: 700, fontSize: "20px", color: "#26392d", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Scan QR Kegiatan</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#627265", marginBottom: "20px" }}>Pindai QR Code kegiatan yang ditampilkan panitia</p>

                  <div style={{ position: "relative", width: "100%", height: "240px", borderRadius: "16px", overflow: "hidden", border: "2px dashed rgba(197, 160, 89, 0.45)", background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div id="katalog-qr-reader" style={{ width: "100%", height: "100%" }} />
                    <style dangerouslySetInnerHTML={{
                      __html: `
                      #katalog-qr-reader video {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                      }
                    `}} />
                    {!scanningAbsen && (
                      <div style={{ position: "absolute", zIndex: 2, padding: "20px", color: "#627265" }}>
                        <button
                          type="button"
                          onClick={startSelfAbsenScan}
                          style={{
                            background: "#3d5a45",
                            color: "white",
                            border: "1px solid #c5a059",
                            padding: "10px 22px",
                            borderRadius: "999px",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "13px",
                            boxShadow: "0 4px 12px rgba(61, 90, 69, 0.3)"
                          }}
                        >
                          Mulai Pindai Kamera
                        </button>
                      </div>
                    )}
                  </div>
                  {scanningAbsen && (
                    <button
                      type="button"
                      onClick={stopSelfAbsenScan}
                      style={{
                        marginTop: "16px",
                        background: "#842029",
                        color: "white",
                        border: "1px solid #f5c2c7",
                        padding: "8px 18px",
                        borderRadius: "999px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Batal / Matikan Kamera
                    </button>
                  )}
                </>
              )}
            </div>

            {attendanceValidation && (
              <div style={{ background: "#faf7f2", borderRadius: "20px", padding: "18px 20px", border: "1px solid rgba(197, 160, 89, 0.45)", width: "100%", maxWidth: "360px", boxShadow: "0 8px 25px rgba(0,0,0,0.12)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#3d5a45", display: "flex", alignItems: "center", justifyContent: "center", color: "#faf7f2", border: "1px solid #c5a059", flexShrink: 0 }}>
                    <ShieldCheck size={22} color="#c5a059" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#3d5a45", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
                      <CheckCircle2 size={14} color="#3d5a45" />
                      <span>Kehadiran Tervalidasi</span>
                    </div>
                    <div style={{ color: "#26392d", fontSize: "15px", fontWeight: 700, lineHeight: 1.35, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                      {attendanceRoleLabel} sudah hadir.
                    </div>
                    <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px", color: "#627265", fontSize: "12px", fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <Calendar size={14} color="#c5a059" />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attendanceValidation.kegiatanJudul || "Pashmina 8.0"}</span>
                      </div>
                      {attendanceValidation.timestamp && (
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <Clock size={14} color="#c5a059" />
                          <span>{formatAttendanceDate(attendanceValidation.timestamp)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentUser && (
              <div style={{ background: "#faf7f2", borderRadius: "18px", padding: "16px 20px", border: "1px solid rgba(197, 160, 89, 0.4)", width: "100%", maxWidth: "360px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, #26392d, #3d5a45)", border: "1px solid #c5a059", display: "flex", alignItems: "center", justifyContent: "center", color: "#faf7f2", fontWeight: 800, fontSize: "18px", flexShrink: 0 }}>
                    {currentUser.nama?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "15px", color: "#26392d", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{currentUser.nama}</div>
                    <div style={{ fontSize: "12px", color: "#627265", fontWeight: 600 }}>No. Urut #{currentUser.nomorUrut || "-"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB CONTENT: HASIL RR */}
      {activeTab === "hasil" && (
        <div className="cart-container" style={{ padding: '0 16px', maxWidth: '600px', margin: '0 auto', animation: 'slideUp 0.3s ease-out' }}>
          {/* Header Bar */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                Hasil Pertemuan Ta&apos;aruf
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Saling beri penilaian. Disetujui jika kedua belah pihak memilih <b>Lanjut</b>.
              </p>
            </div>
            <button
              onClick={() => setShowAddHasilModal(true)}
              style={{
                background: '#26392d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(38, 57, 45, 0.25)'
              }}
            >
              + Beri Nilai Baru
            </button>
          </div>

          {loadingHasil ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Memuat Hasil...</div>
          ) : hasilRRList.length === 0 ? (
            <div className="empty-cart" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: '#c5a059' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>Belum Ada Hasil Pertemuan</h3>
              <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
                Anda belum memiliki hasil pertemuan. Jika sudah bertemu dengan peserta, klik tombol di bawah untuk memberikan penilaian.
              </p>
              <button
                onClick={() => setShowAddHasilModal(true)}
                style={{
                  background: '#26392d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(38, 57, 45, 0.2)'
                }}
              >
                + Beri Nilai Pertemuan
              </button>
            </div>
          ) : (() => {
            const matchList = hasilRRList.filter(h => h.hasilPengirim === "Lanjut" && h.hasilPenerima === "Lanjut");
            return (
              <div className="cart-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* === MATCH SECTION: Both chose Lanjut === */}
                {matchList.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      <span style={{ fontSize: '28px' }}>💕</span>
                      <h3 style={{ margin: '4px 0 2px', fontSize: '17px', fontWeight: 800, color: '#be185d' }}>Pasangan Lanjut (Approved)</h3>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Kedua peserta sama-sama memilih <b>Lanjut</b></p>
                    </div>
                    {matchList.map(h => {
                      const isPengirim = h.pengirimId === currentUser?.id;
                      const isPenerima = h.penerimaId === currentUser?.id;
                      const isPanitia = !isPengirim && !isPenerima;
                      const partnerName = isPengirim ? h.penerimaNama : h.pengirimNama;
                      const partnerNoUrut = isPengirim ? h.penerimaNoUrut : h.pengirimNoUrut;
                      const myName = isPengirim ? h.pengirimNama : h.penerimaNama;
                      const myNoUrut = isPengirim ? h.pengirimNoUrut : h.penerimaNoUrut;

                      if (isPanitia) {
                        return (
                          <div key={`match-${h.id}`} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '2px solid #fbcfe8', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <div style={{ fontWeight: 800, fontSize: '16px', color: '#1e293b' }}>
                                Sesi: Pertemuan Ta&apos;aruf
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '4px 8px' }}>
                                Selesai
                              </span>
                            </div>
                            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#475569' }}>
                              Peserta: <strong>{h.pengirimNama}</strong> & <strong>{h.penerimaNama}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#dcfce7', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>{h.pengirimNama}:</div>
                                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, background: '#dcfce7', color: '#166534', border: `1px solid #bbf7d0` }}>
                                  ✓ Lanjut
                                </span>
                              </div>
                              <div style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#dcfce7', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>{h.penerimaNama}:</div>
                                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, background: '#dcfce7', color: '#166534', border: `1px solid #bbf7d0` }}>
                                  ✓ Lanjut
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={`match-${h.id}`} style={{
                          background: 'linear-gradient(135deg, #fdf2f8 0%, #fff1f2 50%, #fef2f2 100%)',
                          borderRadius: '16px',
                          padding: '20px',
                          border: '2px solid #fbcfe8',
                          boxShadow: '0 4px 15px rgba(190,24,93,0.08)',
                          marginBottom: '4px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {/* My side */}
                            <div style={{ textAlign: 'center', flex: 1, minWidth: '100px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>{myName}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>#{myNoUrut}</div>
                              <div style={{
                                marginTop: '6px',
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 800,
                                background: '#dcfce7',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                              }}>✓ Lanjut</div>
                            </div>

                            {/* Heart icon */}
                            <div style={{ fontSize: '28px', lineHeight: 1 }}>❤️</div>

                            {/* Partner side */}
                            <div style={{ textAlign: 'center', flex: 1, minWidth: '100px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>{partnerName}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>#{partnerNoUrut}</div>
                              <div style={{
                                marginTop: '6px',
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 800,
                                background: '#dcfce7',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                              }}>✓ Lanjut</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
                            {new Date(h.createdAt).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* === ALL SESSIONS (excluding matches shown above) === */}
                {hasilRRList.filter(h => !(h.hasilPengirim === "Lanjut" && h.hasilPenerima === "Lanjut")).length > 0 && (
                  <>
                    {matchList.length > 0 && (
                      <div style={{ textAlign: 'center', margin: '4px 0 8px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#475569', margin: 0 }}>Sesi Lainnya</h4>
                      </div>
                    )}
                    {hasilRRList.filter(h => !(h.hasilPengirim === "Lanjut" && h.hasilPenerima === "Lanjut")).map(h => {
                      const isPengirim = h.pengirimId === currentUser?.id;
                      const partnerName = isPengirim ? h.penerimaNama : h.pengirimNama;
                      const partnerNoUrut = isPengirim ? h.penerimaNoUrut : h.pengirimNoUrut;
                      const myHasil = isPengirim ? h.hasilPengirim : h.hasilPenerima;
                      const partnerHasil = isPengirim ? h.hasilPenerima : h.hasilPengirim;
                      const selectedHasil = myHasil || hasilRRDrafts[h.id] || "";
                      const isSubmittingThis = submittingHasilId === h.id;

                      const isPenerima = h.penerimaId === currentUser?.id;
                      const isPanitia = !isPengirim && !isPenerima;

                      const isRagu = (val: string) => val === "Ragu-Ragu" || val === "Ragu-ragu";

                      const bothAnswered = !!myHasil && !!partnerHasil;
                      const isSelesai = h.status === "Selesai" || bothAnswered;
                      const isDipanggil = h.statusTunggu === "dipanggil";

                      const getResultBadge = (val: string) => {
                        if (val === "Lanjut") return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: '✓ Lanjut' };
                        if (isRagu(val)) return { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', label: '~ Ragu-Ragu' };
                        return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: '✗ Tidak Lanjut' };
                      };

                      if (isPanitia) {
                        return (
                          <div key={h.id} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <div style={{ fontWeight: 800, fontSize: '16px', color: '#1e293b' }}>
                                Sesi: Pertemuan Ta&apos;aruf
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: isSelesai ? '#166534' : isDipanggil ? '#1d4ed8' : '#854d0e', background: isSelesai ? '#f0fdf4' : isDipanggil ? '#eff6ff' : '#fefce8', border: `1px solid ${isSelesai ? '#bbf7d0' : isDipanggil ? '#bfdbfe' : '#fde68a'}`, borderRadius: '999px', padding: '4px 8px' }}>
                                {isSelesai ? "Selesai" : isDipanggil ? "Dipanggil" : "Dalam Antrean"}
                              </span>
                            </div>
                            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#475569' }}>
                              Peserta: <strong>{h.pengirimNama}</strong> & <strong>{h.penerimaNama}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>{h.pengirimNama}:</div>
                                {h.hasilPengirim ? (
                                  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, background: getResultBadge(h.hasilPengirim).bg, color: getResultBadge(h.hasilPengirim).color, border: `1px solid ${getResultBadge(h.hasilPengirim).border}` }}>
                                    {getResultBadge(h.hasilPengirim).label}
                                  </span>
                                ) : <span style={{ color: '#94a3b8', fontSize: '12px' }}>Belum Menilai</span>}
                              </div>
                              <div style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>{h.penerimaNama}:</div>
                                {h.hasilPenerima ? (
                                  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, background: getResultBadge(h.hasilPenerima).bg, color: getResultBadge(h.hasilPenerima).color, border: `1px solid ${getResultBadge(h.hasilPenerima).border}` }}>
                                    {getResultBadge(h.hasilPenerima).label}
                                  </span>
                                ) : <span style={{ color: '#94a3b8', fontSize: '12px' }}>Belum Menilai</span>}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={h.id} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: '#1e293b' }}>
                              {partnerName} <span style={{ color: '#64748b', fontSize: '12px' }}>#{partnerNoUrut}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: isSelesai ? '#166534' : isDipanggil ? '#1d4ed8' : '#854d0e', background: isSelesai ? '#f0fdf4' : isDipanggil ? '#eff6ff' : '#fefce8', border: `1px solid ${isSelesai ? '#bbf7d0' : isDipanggil ? '#bfdbfe' : '#fde68a'}`, borderRadius: '999px', padding: '4px 8px' }}>
                                {isSelesai ? "Selesai" : isDipanggil ? "Dipanggil" : "Dalam Antrean"}
                              </span>
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {new Date(h.createdAt).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                          </div>

                          <div style={{ marginBottom: '10px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Jawaban Anda:</div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              disabled={!!myHasil}
                              onClick={() => setHasilRRDrafts(prev => ({ ...prev, [h.id]: "Lanjut" }))}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 700,
                                border: selectedHasil === "Lanjut" ? '2px solid #22c55e' : '1px solid #e2e8f0',
                                background: selectedHasil === "Lanjut" ? '#f0fdf4' : (!!myHasil ? '#f8fafc' : 'white'),
                                color: selectedHasil === "Lanjut" ? '#166534' : (!!myHasil ? '#94a3b8' : '#64748b'),
                                cursor: !!myHasil ? 'not-allowed' : 'pointer',
                                transition: '0.2s',
                                opacity: !!myHasil && selectedHasil !== "Lanjut" ? 0.6 : 1
                              }}
                            >Lanjut</button>
                            <button
                              disabled={!!myHasil}
                              onClick={() => setHasilRRDrafts(prev => ({ ...prev, [h.id]: "Ragu-Ragu" }))}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 700,
                                border: isRagu(selectedHasil) ? '2px solid #eab308' : '1px solid #e2e8f0',
                                background: isRagu(selectedHasil) ? '#fefce8' : (!!myHasil ? '#f8fafc' : 'white'),
                                color: isRagu(selectedHasil) ? '#854d0e' : (!!myHasil ? '#94a3b8' : '#64748b'),
                                cursor: !!myHasil ? 'not-allowed' : 'pointer',
                                transition: '0.2s',
                                opacity: !!myHasil && !isRagu(selectedHasil) ? 0.6 : 1
                              }}
                            >Ragu-Ragu</button>
                            <button
                              disabled={!!myHasil}
                              onClick={() => setHasilRRDrafts(prev => ({ ...prev, [h.id]: "Tidak Lanjut" }))}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 700,
                                border: selectedHasil === "Tidak Lanjut" ? '2px solid #ef4444' : '1px solid #e2e8f0',
                                background: selectedHasil === "Tidak Lanjut" ? '#fef2f2' : (!!myHasil ? '#f8fafc' : 'white'),
                                color: selectedHasil === "Tidak Lanjut" ? '#991b1b' : (!!myHasil ? '#94a3b8' : '#64748b'),
                                cursor: !!myHasil ? 'not-allowed' : 'pointer',
                                transition: '0.2s',
                                opacity: !!myHasil && selectedHasil !== "Tidak Lanjut" ? 0.6 : 1
                              }}
                            >Tidak Lanjut</button>
                          </div>
                          {!myHasil && (
                            <button
                              disabled={!hasilRRDrafts[h.id] || isSubmittingThis}
                              onClick={() => handleSubmitHasilRR(h.id, partnerName)}
                              style={{
                                width: '100%',
                                marginTop: '14px',
                                padding: '11px',
                                borderRadius: '10px',
                                border: 'none',
                                background: hasilRRDrafts[h.id] ? '#10b981' : '#e2e8f0',
                                color: hasilRRDrafts[h.id] ? 'white' : '#94a3b8',
                                fontSize: '13px',
                                fontWeight: 800,
                                cursor: hasilRRDrafts[h.id] && !isSubmittingThis ? 'pointer' : 'not-allowed',
                                transition: '0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                            >
                              <CheckCircle2 size={16} />
                              {isSubmittingThis ? "Menyimpan..." : "Submit Penilaian"}
                            </button>
                          )}

                          {/* Show partner's result once both have answered */}
                          {bothAnswered && (
                            <div style={{ marginTop: '14px', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Jawaban {partnerName}:</div>
                              {(() => {
                                const badge = getResultBadge(partnerHasil);
                                return (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '999px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    background: badge.bg,
                                    color: badge.color,
                                    border: `1px solid ${badge.border}`,
                                  }}>{badge.label}</span>
                                );
                              })()}
                              <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                                Penilaian selesai. Sesi panggilan telah selesai digunakan.
                              </p>
                            </div>
                          )}
                          {myHasil && !partnerHasil && (
                            <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e', textAlign: 'center' }}>
                              <Timer size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '5px' }} />
                              Menunggu jawaban dari <b>{partnerName}</b>... (Hasil baru disetujui jika lawan juga memberi nilai <b>Lanjut</b>)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB CONTENT: SARAN */}
      {activeTab === "saran" && (
        <div className="cart-container" style={{ padding: '0 16px', maxWidth: '600px', margin: '0 auto', animation: 'slideUp 0.3s ease-out' }}>
          <div style={{ background: '#faf7f2', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', border: '1px solid rgba(197, 160, 89, 0.4)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 700, fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#26392d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={20} color="#c5a059" />
              Saran & Masukan
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#627265', lineHeight: 1.5 }}>
              Berikan saran, kritik, atau masukan Anda terkait pelaksanaan sesi ta&apos;aruf untuk membantu kami menjadi lebih baik.
            </p>

            {mySaranList.length > 0 && !showSaranForm && !editingSaranId ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#627265' }}>
                    Riwayat saran dan masukan yang pernah Anda kirimkan.
                  </p>
                  <button onClick={() => setShowSaranForm(true)} style={{ background: '#3d5a45', color: 'white', border: '1px solid #c5a059', padding: '8px 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Tambah
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {mySaranList.map((s, idx) => (
                    <div key={idx} style={{ padding: '16px', background: '#ffffff', borderRadius: '14px', border: '1px solid rgba(197, 160, 89, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, marginRight: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#c5a059', marginBottom: '4px', fontWeight: 600 }}>
                          {new Date(s.createdAt.replace(' ', 'T') + (!s.createdAt.endsWith('Z') ? 'Z' : '')).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                          {s.isAnonim ? ' • Anonim' : ''}
                          {s.kepada ? ` • Kepada: ${s.kepada}` : ''}
                        </div>
                        <div style={{ fontSize: '14px', color: '#1f2922', whiteSpace: 'pre-wrap' }}>{s.saran}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEditSaran(s)} style={{ background: 'white', border: '1px solid rgba(197, 160, 89, 0.4)', color: '#3d5a45', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onClick={() => handleDeleteSaran(s.id)} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                await handleSubmitSaran(e);
                setShowSaranForm(false);
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <select
                    value={kepadaSaran}
                    onChange={(e) => setKepadaSaran(e.target.value)}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid rgba(197, 160, 89, 0.4)', outline: 'none', fontSize: '14px', lineHeight: 1.5, background: '#ffffff', color: '#1f2922', transition: '0.2s', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={(e) => e.target.style.borderColor = '#3d5a45'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(197, 160, 89, 0.4)'}
                    required
                  >
                    <option value="" disabled>Pilih Tujuan Saran...</option>
                    <option value="Tim Acara">Tim Acara</option>
                    <option value="Tim Panggilan Ta'aruf">Tim Panggilan Ta&apos;aruf</option>
                    <option value="Tim PNKB dan Ibu Gambuh">Tim PNKB dan Ibu Gambuh</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                {kepadaSaran === 'Lainnya' && (
                  <div style={{ marginBottom: '16px' }}>
                    <input
                      type="text"
                      value={kepadaSaranLainnya}
                      onChange={(e) => setKepadaSaranLainnya(e.target.value)}
                      placeholder="Masukkan tujuan saran lainnya..."
                      style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid rgba(197, 160, 89, 0.4)', outline: 'none', fontSize: '14px', lineHeight: 1.5, background: '#ffffff', color: '#1f2922', transition: '0.2s', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      onFocus={(e) => e.target.style.borderColor = '#3d5a45'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(197, 160, 89, 0.4)'}
                      required
                    />
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <textarea
                    value={saranText}
                    onChange={(e) => setSaranText(e.target.value)}
                    placeholder="Ketik saran atau masukan Anda di sini..."
                    rows={6}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid rgba(197, 160, 89, 0.4)', outline: 'none', resize: 'none', fontSize: '14px', lineHeight: 1.5, background: '#ffffff', color: '#1f2922', transition: '0.2s', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={(e) => e.target.style.borderColor = '#3d5a45'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(197, 160, 89, 0.4)'}
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <input
                    type="checkbox"
                    id="anonim-saran"
                    checked={isAnonimSaran}
                    onChange={(e) => setIsAnonimSaran(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="anonim-saran" style={{ fontSize: '13px', color: '#26392d', cursor: 'pointer', fontWeight: 600 }}>
                    Kirim sebagai Anonim
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    disabled={submittingSaran || !saranText.trim()}
                    style={{ flex: 1, padding: '14px', borderRadius: '16px', border: !saranText.trim() ? 'none' : '1px solid #c5a059', background: !saranText.trim() ? '#ede8de' : '#3d5a45', color: !saranText.trim() ? '#8c9b90' : 'white', fontWeight: 800, fontSize: '14px', cursor: !saranText.trim() ? 'not-allowed' : 'pointer', transition: '0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  >
                    {submittingSaran ? (
                      "Mengirim..."
                    ) : (
                      <>
                        <Send size={18} />
                        Kirim Saran
                      </>
                    )}
                  </button>
                  {editingSaranId ? (
                    <button
                      type="button"
                      onClick={() => { setEditingSaranId(null); setSaranText(''); setKepadaSaran(''); setIsAnonimSaran(false); }}
                      style={{ padding: '14px 20px', borderRadius: '16px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#faf7f2', color: '#26392d', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      Batal
                    </button>
                  ) : mySaranList.length > 0 && showSaranForm ? (
                    <button
                      type="button"
                      onClick={() => { setShowSaranForm(false); setSaranText(''); setKepadaSaran(''); setIsAnonimSaran(false); }}
                      style={{ padding: '14px 20px', borderRadius: '16px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#faf7f2', color: '#26392d', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      Batal
                    </button>
                  ) : null}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PROFILE */}
      {activeTab === "profile" && (
        <div className="profile-tab-container">
          {loadingProfile ? (
            <div className="skeleton-profile" />
          ) : myFullProfile ? (
            <div className="profile-details-card">
              <div className="profile-header-main">
                <div
                  className="profile-avatar-large"
                  style={{ cursor: myFullProfile.foto ? "zoom-in" : "default" }}
                  onClick={() => {
                    if (myFullProfile.foto) {
                      Swal.fire({
                        imageUrl: myFullProfile.foto,
                        imageAlt: myFullProfile.nama,
                        showConfirmButton: false,
                        showCloseButton: true,
                        width: "auto",
                        padding: "1rem"
                      });
                    }
                  }}
                >
                  {myFullProfile.foto ? (
                    <img src={myFullProfile.foto} alt={myFullProfile.nama} />
                  ) : (
                    <span>{myFullProfile.nama?.charAt(0) || "?"}</span>
                  )}
                </div>
                <h2>#{myFullProfile.nomorUrut || "-"} {myFullProfile.nama}</h2>
                <div className="profile-role-badge">{myFullProfile.panitiaStatus || "PESERTA"}</div>
              </div>

              <div className="profile-info-grid">
                <div className="profile-info-section">
                  <h4>Informasi Personal</h4>
                  <div className="profile-info-row">
                    <span className="label">Nomor Unik</span>
                    <span className="value">{myFullProfile.nomorUnik}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Jenis Kelamin</span>
                    <span className="value">{myFullProfile.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Usia</span>
                    <span className="value">
                      {myFullProfile.tanggalLahir ? `${new Date().getFullYear() - new Date(myFullProfile.tanggalLahir).getFullYear()} Tahun` : "-"}
                    </span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Suku</span>
                    <span className="value">{myFullProfile.suku || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Pendidikan</span>
                    <span className="value">{myFullProfile.pendidikan || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Pekerjaan</span>
                    <span className="value">{myFullProfile.pekerjaan || "-"}</span>
                  </div>
                </div>

                <div className="profile-info-section">
                  <h4>Domisili & Kontak</h4>
                  <div className="profile-info-row">
                    <span className="label">Daerah/Kota</span>
                    <span className="value">{myFullProfile.mandiriDesaKota || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Desa</span>
                    <span className="value">{myFullProfile.mandiriDesaNama || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Instagram</span>
                    <span className="value">
                      {myFullProfile.instagram ? (
                        <a href={`https://instagram.com/${myFullProfile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="profile-insta-link">
                          @{myFullProfile.instagram.replace('@', '')}
                        </a>
                      ) : "-"}
                    </span>
                  </div>
                </div>

                <div className="profile-info-section">
                  <h4>Hobi & Favorit</h4>
                  <div className="profile-info-row">
                    <span className="label">Hobi</span>
                    <span className="value">{myFullProfile.hobi || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Makanan & Minuman Favorit</span>
                    <span className="value">{myFullProfile.makananMinumanFavorit || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Kriteria Pasangan</span>
                    <span className="value">{myFullProfile.kriteriaPasangan || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="profile-actions-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="profile-edit-btn" onClick={() => {
                  let initKota = "";
                  if (myFullProfile.mandiriDesaId) {
                    const matchW = wilayahList.find(w => String(w.id) === String(myFullProfile.mandiriDesaId));
                    if (matchW) initKota = matchW.kota;
                  }

                  setEditProfileForm({
                    nama: myFullProfile.nama || "",
                    jenisKelamin: myFullProfile.jenisKelamin || "L",
                    statusNikah: myFullProfile.statusNikah || (myFullProfile.jenisKelamin === "P" ? "Janda" : "Duda"),
                    jumlahAnak: myFullProfile.jumlahAnak ?? 0,
                    anakKe: myFullProfile.anakKe ?? "",
                    jumlahSaudara: myFullProfile.jumlahSaudara ?? "",
                    tinggiBadan: myFullProfile.tinggiBadan ?? "",
                    tempatLahir: myFullProfile.tempatLahir || "",
                    tanggalLahir: myFullProfile.tanggalLahir || "",
                    suku: myFullProfile.suku || "",
                    pendidikan: myFullProfile.pendidikan || "",
                    pekerjaan: myFullProfile.pekerjaan || "",
                    hobi: myFullProfile.hobi || "",
                    makananMinumanFavorit: myFullProfile.makananMinumanFavorit || "",
                    instagram: myFullProfile.instagram || "",
                    kriteriaPasangan: myFullProfile.kriteriaPasangan || "",
                    foto: myFullProfile.foto || "",
                    kota: initKota,
                    mandiriDesaId: myFullProfile.mandiriDesaId?.toString() || "",
                    mandiriKelompokId: myFullProfile.mandiriKelompokId?.toString() || "",
                  });
                  setIsEditingProfile(true);
                }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '16px', border: '1px solid #c5a059', background: '#3d5a45', color: 'white', fontWeight: 800, fontSize: '15px', cursor: 'pointer', transition: '0.2s', width: '100%', marginBottom: '4px' }}>
                  <Settings2 size={18} />
                  <span>Edit Biodata</span>
                </button>
                <button className="profile-pulang-btn" onClick={handlePulang}>
                  <LogOut size={18} />
                  <span>Pulang</span>
                </button>
                <button className="profile-logout-btn" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-error" style={{ textAlign: "center", padding: "40px 24px", background: "#faf7f2", borderRadius: "24px", border: "1px solid rgba(197, 160, 89, 0.4)", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", maxWidth: "420px", margin: "20px auto" }}>
              <p style={{ margin: "0 0 16px 0", fontSize: "15px", color: "#26392d", fontWeight: 600 }}>Gagal memuat profil Anda.</p>
              <button
                type="button"
                onClick={() => {
                  if (currentUser?.id) {
                    setLoadingProfile(true);
                    const storedUnik = (typeof window !== "undefined" ? localStorage.getItem("attended_nomor_unik") : "") || currentUser?.nomorUnik || "";
                    const storedToken = (typeof window !== "undefined" ? localStorage.getItem("attended_session_token") : "") || "";
                    const qs = buildQuery({ nomorUnik: storedUnik, sessionToken: storedToken });
                    fetch(`/api/public/mandiri/katalog/${currentUser.id}${qs ? `?${qs}` : ""}`)
                      .then(r => r.json())
                      .then(json => { if (!json.error) setMyFullProfile(json); })
                      .finally(() => setLoadingProfile(false));
                  }
                }}
                style={{ background: "#3d5a45", color: "white", border: "1px solid #c5a059", padding: "10px 24px", borderRadius: "999px", fontWeight: 700, fontSize: "13px", cursor: "pointer", transition: "0.2s" }}
              >
                Coba Muat Ulang
              </button>
            </div>
          )}
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditingProfile && (
        <div className="modal-overlay" onClick={() => setIsEditingProfile(false)} style={{ zIndex: 9999 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%', padding: '28px', borderRadius: '24px', background: '#faf7f2', border: '1px solid rgba(197, 160, 89, 0.45)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '24px', fontWeight: 700, fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#26392d' }}>Edit Biodata</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                <div
                  style={{ width: "100px", height: "100px", borderRadius: "50%", background: "rgba(197, 160, 89, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "12px", border: "2px solid #c5a059", cursor: editProfileForm.foto ? "zoom-in" : "default" }}
                  onClick={() => {
                    if (editProfileForm.foto) {
                      Swal.fire({
                        imageUrl: editProfileForm.foto,
                        imageAlt: "Foto Profil",
                        showConfirmButton: false,
                        showCloseButton: true,
                        width: "auto",
                        padding: "1rem"
                      });
                    }
                  }}
                >
                  {editProfileForm.foto ? (
                    <img src={editProfileForm.foto} alt="Foto Baru" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <User size={40} color="#26392d" />
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <label style={{ background: "#3d5a45", color: "white", border: "1px solid #c5a059", padding: "8px 18px", borderRadius: "999px", fontSize: "12px", fontWeight: "bold", cursor: uploadingFoto ? "not-allowed" : "pointer", opacity: uploadingFoto ? 0.7 : 1 }}>
                    {uploadingFoto ? "Mengunggah..." : "Ganti Foto"}
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingFoto}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          Swal.fire("File Terlalu Besar", "Maksimal ukuran foto adalah 5MB.", "warning");
                          return;
                        }
                        setUploadingFoto(true);
                        const formData = new FormData();
                        formData.append("file", file);
                        try {
                          const res = await fetch("/api/upload", { method: "POST", body: formData });
                          const data = await res.json();
                          if (res.ok && data.url) {
                            setEditProfileForm({ ...editProfileForm, foto: data.url });
                          } else {
                            throw new Error(data.error || "Gagal upload");
                          }
                        } catch (err) {
                          Swal.fire("Error", "Gagal mengunggah foto.", "error");
                        } finally {
                          setUploadingFoto(false);
                        }
                      }}
                    />
                  </label>
                  {editProfileForm.foto && (
                    <button type="button" onClick={() => setEditProfileForm({ ...editProfileForm, foto: "" })} style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid #fca5a5", padding: "8px 16px", borderRadius: "999px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>
                      Hapus Foto
                    </button>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "#627265", marginTop: "8px" }}>Format JPG/PNG/WEBP maks 5MB.</div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Nama Lengkap</label>
                <input type="text" value={editProfileForm.nama} onChange={e => setEditProfileForm({ ...editProfileForm, nama: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Jenis Kelamin</label>
                  <select value={editProfileForm.jenisKelamin} onChange={e => setEditProfileForm({ ...editProfileForm, jenisKelamin: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Suku</label>
                  <input type="text" value={editProfileForm.suku} onChange={e => setEditProfileForm({ ...editProfileForm, suku: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Tempat Lahir</label>
                  <input type="text" value={editProfileForm.tempatLahir} onChange={e => setEditProfileForm({ ...editProfileForm, tempatLahir: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Tanggal Lahir</label>
                  <IndonesianDateInput value={editProfileForm.tanggalLahir} onChange={(val: string) => setEditProfileForm({ ...editProfileForm, tanggalLahir: val })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Tinggi Badan (cm)</label>
                  <input type="number" value={editProfileForm.tinggiBadan || ""} onChange={e => setEditProfileForm({ ...editProfileForm, tinggiBadan: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Status Pernikahan</label>
                  <select value={editProfileForm.statusNikah || (editProfileForm.jenisKelamin === "P" ? "Janda" : "Duda")} onChange={e => setEditProfileForm({ ...editProfileForm, statusNikah: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }}>
                    <option value="Duda">Duda</option>
                    <option value="Janda">Janda</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Jumlah Anak</label>
                  <input type="number" min={0} value={editProfileForm.jumlahAnak ?? ""} onChange={e => setEditProfileForm({ ...editProfileForm, jumlahAnak: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Anak Ke</label>
                  <input type="number" value={editProfileForm.anakKe || ""} onChange={e => setEditProfileForm({ ...editProfileForm, anakKe: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Dari Saudara</label>
                  <input type="number" value={editProfileForm.jumlahSaudara || ""} onChange={e => setEditProfileForm({ ...editProfileForm, jumlahSaudara: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Daerah/Kota</label>
                  <select value={editProfileForm.kota || ""} onChange={e => setEditProfileForm({ ...editProfileForm, kota: e.target.value, mandiriDesaId: "", mandiriKelompokId: "" })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }}>
                    <option value="">Pilih Daerah/Kota</option>
                    {kotaList.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Desa</label>
                  <select value={editProfileForm.mandiriDesaId || ""} onChange={e => setEditProfileForm({ ...editProfileForm, mandiriDesaId: e.target.value, mandiriKelompokId: "" })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} disabled={!editProfileForm.kota}>
                    <option value="">Pilih Desa</option>
                    {wilayahList.filter(w => w.kota === editProfileForm.kota).map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Kelompok</label>
                <select value={editProfileForm.mandiriKelompokId || ""} onChange={e => setEditProfileForm({ ...editProfileForm, mandiriKelompokId: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} disabled={!editProfileForm.mandiriDesaId}>
                  <option value="">Pilih Kelompok</option>
                  {kelompokList.filter(k => String(k.desaId || k.mandiriDesaId) === String(editProfileForm.mandiriDesaId)).map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Alamat Lengkap</label>
                <textarea value={editProfileForm.alamat || ""} onChange={e => setEditProfileForm({ ...editProfileForm, alamat: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none', minHeight: '60px', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Pendidikan</label>
                <input type="text" value={editProfileForm.pendidikan} onChange={e => setEditProfileForm({ ...editProfileForm, pendidikan: e.target.value })} placeholder="S1/SMA/dll" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Pekerjaan</label>
                <input type="text" value={editProfileForm.pekerjaan} onChange={e => setEditProfileForm({ ...editProfileForm, pekerjaan: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Instagram</label>
                <input type="text" value={editProfileForm.instagram} onChange={e => setEditProfileForm({ ...editProfileForm, instagram: e.target.value })} placeholder="@username" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Hobi</label>
                <input type="text" value={editProfileForm.hobi} onChange={e => setEditProfileForm({ ...editProfileForm, hobi: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Makanan/Minuman Favorit</label>
                <input type="text" value={editProfileForm.makananMinumanFavorit} onChange={e => setEditProfileForm({ ...editProfileForm, makananMinumanFavorit: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#26392d' }}>Kriteria Pasangan</label>
                <textarea value={editProfileForm.kriteriaPasangan} onChange={e => setEditProfileForm({ ...editProfileForm, kriteriaPasangan: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.4)', background: '#ffffff', color: '#1f2922', outline: 'none', minHeight: '80px', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setIsEditingProfile(false)} disabled={savingProfile} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid rgba(197, 160, 89, 0.4)', background: 'white', color: '#26392d', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
              <button onClick={async () => {
                setSavingProfile(true);
                try {
                  const storedUnik = localStorage.getItem("attended_nomor_unik");
                  const storedToken = localStorage.getItem("attended_session_token");
                  const res = await fetch(`/api/public/mandiri/katalog/${currentUser.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nomorUnik: storedUnik, token: storedToken, ...editProfileForm }),
                  });
                  if (!res.ok) throw new Error("Gagal menyimpan");

                  const selectedWilayah = wilayahList.find(w => String(w.id) === String(editProfileForm.mandiriDesaId));

                  setMyFullProfile((prev: any) => ({
                    ...prev,
                    ...editProfileForm,
                    mandiriDesaKota: editProfileForm.kota || prev.mandiriDesaKota,
                    mandiriDesaNama: selectedWilayah ? selectedWilayah.nama : prev.mandiriDesaNama
                  }));
                  setIsEditingProfile(false);
                  Swal.fire({ title: "Berhasil!", text: "Biodata berhasil diperbarui.", icon: "success", timer: 2000, showConfirmButton: false });
                } catch (e) {
                  Swal.fire("Gagal", "Terjadi kesalahan saat menyimpan.", "error");
                } finally {
                  setSavingProfile(false);
                }
              }} disabled={savingProfile} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #c5a059', background: '#3d5a45', color: 'white', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}>
                {savingProfile ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM MOBILE NAVIGATION BAR */}
      <nav className="mobile-nav-bar">
        <button
          className={`nav-bar-item ${activeTab === "katalog" ? "active" : ""}`}
          onClick={() => setActiveTab("katalog")}
        >
          <Users size={20} />
          <span>Katalog</span>
        </button>
        <button
          className={`nav-bar-item ${activeTab === "cart" ? "active" : ""}`}
          onClick={() => setActiveTab("cart")}
        >
          <div className="badge-icon-wrapper">
            <Heart size={20} fill={activeTab === "cart" ? "#c5a059" : "transparent"} color={activeTab === "cart" ? "#c5a059" : "#64748b"} />
            {selectedIds.length > 0 && (
              <span className="badge-count-bubble">{selectedIds.length}</span>
            )}
          </div>
          <span>Pilihanku</span>
        </button>
        <button
          className={`nav-bar-item ${activeTab === "absen" ? "active" : ""}`}
          onClick={() => setActiveTab("absen")}
        >
          <QrCode size={20} />
          <span>Absen</span>
        </button>
        <button
          className={`nav-bar-item ${activeTab === "hasil" ? "active" : ""}`}
          onClick={() => setActiveTab("hasil")}
        >
          <div className="badge-icon-wrapper">
            <MessageSquare size={20} />
            {hasilRRPendingCount > 0 && (
              <span className="badge-count-bubble">{hasilRRPendingCount}</span>
            )}
          </div>
          <span>Hasil RR</span>
        </button>
        <button
          className={`nav-bar-item ${activeTab === "saran" ? "active" : ""}`}
          onClick={() => setActiveTab("saran")}
        >
          <Sparkles size={20} />
          <span>Saran</span>
        </button>
        <button
          className={`nav-bar-item ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <User size={20} />
          <span>Profil</span>
        </button>
      </nav>

      {/* DETAIL MODAL */}
      {isModalOpen && selectedParticipant && (() => {
        const sp = selectedParticipant;
        const isMe = sp.nomorUrut === currentUser?.nomorUrut;
        const isSelected = selectedIds.includes(String(sp.id));
        const isFull = (sp.selectedCount || 0) >= 5;
        const isMaxed = selectedIds.length >= 3;
        const isMale = sp.jenisKelamin === "L";
        const heroGrad = "linear-gradient(180deg, #18261e 0%, #26392d 100%)";
        return (
          <div className="dm-overlay" onClick={closeDetail}>
            <div className="dm-sheet" onClick={e => e.stopPropagation()}>

              {/* HERO */}
              <div className="dm-hero" style={{ background: heroGrad }}>
                <button className="dm-close" onClick={closeDetail}><X size={18} /></button>
                <div
                  className="dm-avatar-wrap"
                  style={{ cursor: sp.foto ? "zoom-in" : "default" }}
                  onClick={() => {
                    if (sp.foto) {
                      Swal.fire({
                        imageUrl: sp.foto,
                        imageAlt: sp.nama,
                        showConfirmButton: false,
                        showCloseButton: true,
                        width: "auto",
                        padding: "1rem"
                      });
                    }
                  }}
                >
                  {sp.foto
                    ? <img src={sp.foto} alt={sp.nama} className="dm-avatar-img" />
                    : <div className="dm-avatar-init" style={{ background: "linear-gradient(135deg, #26392d, #3d5a45)", color: "#faf7f2" }}>{sp.nama.charAt(0)}</div>
                  }
                </div>
                <div className="dm-hero-badge">#{sp.nomorUrut || "-"}</div>
                <h2 className="dm-name">{sp.nama}</h2>
                <div className="dm-loc"><MapPin size={13} color="#c5a059" /><span>{sp.mandiriDesaKota || "-"} • {sp.mandiriDesaNama || sp.desaNama || "-"}</span></div>
                <div className="dm-chips">
                  <span className="dm-chip">{isMale ? "👨 Ikhwan" : "🧕 Akhwat"}</span>
                  <span className="dm-chip"><UserCheck size={12} color="#c5a059" /> {sp.selectedCount || 0}/5 Dipilih</span>
                </div>
              </div>

              {/* BODY */}
              <div className="dm-body">
                <div className="dm-section-title">Informasi Pribadi</div>
                <div className="dm-grid">
                  <div className="dm-field"><span className="dm-label">TTL</span><span className="dm-val">{sp.tempatLahir || "-"}, {sp.tanggalLahir || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Usia</span><span className="dm-val">{sp.tanggalLahir ? `${new Date().getFullYear() - new Date(sp.tanggalLahir).getFullYear()} Tahun` : "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Pendidikan</span><span className="dm-val">{sp.pendidikan || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Pekerjaan</span><span className="dm-val">{sp.pekerjaan || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Suku</span><span className="dm-val">{sp.suku || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Status Pernikahan</span><span className="dm-val">{sp.statusNikah || "-"}{sp.jumlahAnak != null ? ` • ${sp.jumlahAnak} anak` : ""}</span></div>
                  <div className="dm-field"><span className="dm-label">Anak Ke</span><span className="dm-val">{sp.anakKe || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Dari Saudara</span><span className="dm-val">{sp.jumlahSaudara || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Hobi</span><span className="dm-val">{sp.hobi || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Instagram</span><span className="dm-val">{sp.instagram ? <a href={`https://instagram.com/${sp.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>@{sp.instagram.replace('@', '')}</a> : "-"}</span></div>
                  <div className="dm-field dm-field-full"><span className="dm-label">Makanan/Minuman Favorit</span><span className="dm-val">{sp.makananMinumanFavorit || "-"}</span></div>
                  <div className="dm-field dm-field-full"><span className="dm-label">Kriteria Pasangan</span><span className="dm-val">{sp.kriteriaPasangan || "-"}</span></div>
                </div>
              </div>

              {/* CTA */}
              <div className="dm-cta">
                {(() => {
                  if (isMe) {
                    return <button className="dm-btn dm-btn-disabled" disabled>Ini Profil Anda</button>;
                  }

                  const isPulang = sp.keterangan?.toLowerCase() === "pulang";
                  const isTidakHadir = sp.keterangan?.toLowerCase() === "alpha" || sp.keterangan?.toLowerCase() === "izin";
                  const isBelumHadir = sp.isHadir === 0;

                  if (isPulang || isTidakHadir || isBelumHadir) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ textAlign: "center", color: "#742a2a", fontSize: "13px", fontWeight: "600", padding: "14px 18px", background: "#fcf6f4", borderRadius: "16px", border: "1px solid rgba(197, 160, 89, 0.4)", lineHeight: 1.5, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                          Mohon maaf, peserta <strong style={{ color: "#26392d" }}>{sp.nama}</strong> {isPulang ? "pulang lebih awal" : (isBelumHadir ? "belum melakukan absensi kehadiran" : "tidak hadir")}, Anda tidak bisa memilih peserta tersebut.
                        </div>
                        <button className="dm-btn dm-btn-disabled" disabled style={{ background: '#ede8de', color: '#8c9b90', cursor: 'not-allowed', border: '1px solid rgba(197, 160, 89, 0.3)' }}>
                          <Heart size={18} />
                          {isBelumHadir ? "Belum Hadir (Tidak Bisa Dipilih)" : "Tidak Tersedia"}
                        </button>
                      </div>
                    );
                  }

                  if (currentUser?.status === "waiting") {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ textAlign: "center", color: "#26392d", fontSize: "13px", fontWeight: "600", padding: "14px 18px", background: "#fcf6f4", borderRadius: "16px", border: "1px solid rgba(197, 160, 89, 0.4)", lineHeight: 1.5, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                          Anda belum melakukan absensi kehadiran. Silakan absen terlebih dahulu untuk dapat memilih peserta.
                        </div>
                        <button className="dm-btn dm-btn-disabled" disabled style={{ background: '#ede8de', color: '#8c9b90', cursor: 'not-allowed', border: '1px solid rgba(197, 160, 89, 0.3)' }}>
                          <Heart size={18} />
                          Absen Terlebih Dahulu
                        </button>
                      </div>
                    );
                  }

                  if (sp.handshakeStatus) {
                    if (sp.handshakeStatus === "Selesai") {
                      const alreadyFilled = checkUserAlreadyFilled(sp, currentUser, activeRooms, hasilRRList, isAdmin);
                      return (
                        <>
                          <button className="dm-btn dm-btn-disabled" disabled><Users size={18} />Sudah Bertemu</button>
                          {alreadyFilled ? (
                            <button className="dm-btn dm-btn-disabled" disabled style={{ background: '#94a3b8', color: 'white', border: 'none', marginTop: '8px', opacity: 0.6, cursor: 'not-allowed' }}>
                              <Heart size={18} />Input Hasil RR
                            </button>
                          ) : (
                            <button className="dm-btn" style={{ background: '#10b981', color: 'white', border: 'none', marginTop: '8px' }} onClick={() => { setIsModalOpen(false); setActiveTab('hasil'); }}>
                              <Heart size={18} />Input Hasil RR
                            </button>
                          )}
                        </>
                      );
                    }
                    if (sp.handshakeStatus === "Diterima") {
                      return (
                        <>
                          <button className="dm-btn dm-btn-disabled" disabled><Users size={18} />Dalam Ruangan</button>
                          {(() => {
                            const room = activeRooms.find((r: any) => String(r.pengirimNo) === String(sp.nomorUnik) || String(r.penerimaNo) === String(sp.nomorUnik));
                            const isPart = room && currentUser && (String(currentUser.nomorUnik) === String(room.pengirimNo) || String(currentUser.nomorUnik) === String(room.penerimaNo) || room.assignedGuardId === currentUser.id || room.assignedCallerId === currentUser.id || room.assignedCaller2Id === currentUser.id);
                            if (!isAdmin && !isPart) return null;

                            const isStarted = room && !!room.startedAt;
                            const alreadyFilled = checkUserAlreadyFilled(sp, currentUser, activeRooms, hasilRRList, isAdmin);

                            if (!isStarted || alreadyFilled) {
                              return (
                                <button className="dm-btn dm-btn-disabled" disabled style={{ background: '#94a3b8', color: 'white', border: 'none', opacity: 0.6, cursor: 'not-allowed', marginTop: '8px' }}>
                                  {isAdmin ? <CheckCircle2 size={18} /> : <Heart size={18} />}{isAdmin ? 'Selesaikan Sesi' : 'Input Hasil RR'}
                                </button>
                              );
                            }

                            return (
                              <button type="button" className="dm-btn" style={{ background: '#10b981', color: 'white', border: 'none', marginTop: '8px' }} onClick={() => handleAdminSelesaikanSesi(sp)}>
                                {isAdmin ? <CheckCircle2 size={18} /> : <Heart size={18} />}{isAdmin ? 'Selesaikan Sesi' : 'Input Hasil RR'}
                              </button>
                            );
                          })()}
                        </>
                      );
                    }
                    if (sp.handshakeStatus === "Menunggu") {
                      if (isSelected) {
                        return (
                          <button className="dm-btn dm-btn-danger" onClick={() => handleCancelSelection(String(sp.id), sp.nama)}>
                            <X size={18} />Batalkan Pilihan
                          </button>
                        );
                      }
                      return <button className="dm-btn dm-btn-disabled" disabled><Clock size={18} />Dalam Antrean</button>;
                    }
                  }

                  if (isSelected) {
                    const sel = selections.find((s: any) => String(s.penerimaId) === String(sp.id));
                    const isWaiting = sel && sel.status === "Menunggu";
                    if (isWaiting) {
                      return (
                        <button className="dm-btn dm-btn-danger" onClick={() => handleCancelSelection(String(sp.id), sp.nama)}>
                          <X size={18} />Batalkan Pilihan
                        </button>
                      );
                    } else {
                      return <button className="dm-btn dm-btn-selected" disabled><CheckCircle2 size={18} />Sudah Terpilih</button>;
                    }
                  }

                  if (isFull) {
                    return <button className="dm-btn dm-btn-disabled" disabled>Peserta Penuh (5/5)</button>;
                  }

                  if (isMaxed) {
                    return <button className="dm-btn dm-btn-disabled" disabled>Batas Pilihan Tercapai (3/3)</button>;
                  }

                  if (katalogPublicStatus === "closed") {
                    return null;
                  }

                  return (
                    <button className="dm-btn" style={{ background: "linear-gradient(135deg, #26392d, #3d5a45)", border: "1px solid #c5a059", color: "#faf7f2", boxShadow: "0 4px 15px rgba(38, 57, 45, 0.3)" }} onClick={() => handleConfirmSelection(String(sp.id), sp.nama)}>
                      <Heart size={18} fill="#c5a059" color="#c5a059" />Pilih Peserta Ini
                    </button>
                  );
                })()}
              </div>

            </div>
          </div>
        );
      })()}



      {/* COMMENTS MODAL */}
      {isCommentsModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsCommentsModalOpen(false); unlockBodyScroll(); }}>
          <div className="modal-box comments-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="icon-badge"><MessageSquare size={28} className="text-blue-500" /></div>
              <h2>Pusat Komentar</h2>
              <p>Kelola komentar masuk dan pantau jejak Anda</p>
              <button className="modal-close-btn" onClick={() => { setIsCommentsModalOpen(false); unlockBodyScroll(); }}><X size={24} /></button>
            </div>

            <div className="modal-body">
              <div className="comment-section-tabs">
                <h3 className="tab-title sent">Jejak Komentar Saya</h3>
                <div className="comments-list sent">
                  {sentComments.length > 0 ? sentComments.map((c) => (
                    <div key={c.id} className="comment-item sent">
                      <div className="comment-bubble sent-red">
                        <div className="sent-indicator">🚩 JEJAK TERKIRIM</div>
                        <p className="comment-text">"{c.komentar}"</p>
                        <div className="comment-meta">
                          <div className="author-info">
                            <span className="author-label text-red-500">Untuk:</span>
                            <span className="comment-author">#{c.penerimaNoUrut} {c.penerimaNama}</span>
                          </div>
                          <span className="comment-date red">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )) : <div className="no-comments mini"><p>Anda belum mengirimkan komentar.</p></div>}
                </div>
              </div>

              <div className="spacer-modal" />

              <div className="comment-section-tabs">
                <h3 className="tab-title">Komentar Untuk Anda</h3>
                <div className="comments-list">
                  {userComments.length > 0 ? userComments.map((c) => (
                    <div key={c.id} className="comment-item">
                      <div className="comment-bubble">
                        <div className="comment-icon"><MessageSquare size={16} fill="#3b82f6" color="#3b82f6" /></div>
                        <p className="comment-text">"{c.komentar}"</p>
                        <div className="comment-meta">
                          <div className="author-info">
                            <span className="author-label">Dari:</span>
                            <span className="comment-author">
                              {c.isAnonim ? "Anonim" : (c.realPengirimNama || c.pengirimNama || "Seseorang")}
                              {c.realPengirimNoUrut && !c.isAnonim && ` (#${c.realPengirimNoUrut})`}
                            </span>
                          </div>
                          <span className="comment-date">{new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="no-comments">
                      <Heart size={48} style={{ marginBottom: "16px", color: "#e2e8f0" }} />
                      <p>Belum ada komentar untuk Anda.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BERI NILAI / TAMBAH HASIL */}
      {showAddHasilModal && (() => {
        const availableCandidateMap = new Map<string, { id: string; nama: string; nomor: string; detail: string }>();

        // 1. From selections
        (selections || []).forEach((s: any) => {
          if (s.penerimaId) {
            availableCandidateMap.set(String(s.penerimaId), {
              id: String(s.penerimaId),
              nama: s.penerimaNama,
              nomor: String(s.penerimaNoUrut || s.penerimaNo || ""),
              detail: "Dari Pilihan Anda"
            });
          }
        });

        // 2. From hasilRRList
        (hasilRRList || []).forEach((h: any) => {
          const isPengirim = h.pengirimId === currentUser?.id;
          const partnerId = isPengirim ? h.penerimaId : h.pengirimId;
          const partnerName = isPengirim ? h.penerimaNama : h.pengirimNama;
          const partnerNo = isPengirim ? h.penerimaNoUrut : h.pengirimNoUrut;
          if (partnerId && !availableCandidateMap.has(String(partnerId))) {
            availableCandidateMap.set(String(partnerId), {
              id: String(partnerId),
              nama: partnerName,
              nomor: String(partnerNo || ""),
              detail: isPengirim ? "Pilihan Anda" : "Memilih / Memanggil Anda"
            });
          }
        });

        // 3. From catalog data
        (data || []).forEach((p: any) => {
          if (String(p.id) !== String(currentUser?.id) && !availableCandidateMap.has(String(p.id))) {
            availableCandidateMap.set(String(p.id), {
              id: String(p.id),
              nama: p.nama,
              nomor: String(p.nomorUrut || p.nomorPeserta || p.nomorUnik || ""),
              detail: p.desaKota || p.desaNama || "Katalog"
            });
          }
        });

        const candidates = Array.from(availableCandidateMap.values());

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }} onClick={() => setShowAddHasilModal(false)}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              animation: 'slideUp 0.25s ease-out'
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>Beri Nilai Pertemuan</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Pilih peserta yang telah Anda temui</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddHasilModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>

              {/* Select Participant */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Peserta yang Ditemui <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={newHasilTargetId}
                  onChange={(e) => setNewHasilTargetId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13.5px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc' }}
                >
                  <option value="">-- Pilih Peserta --</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.nomor} {c.nama} ({c.detail})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Rating */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Penilaian Anda:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setNewHasilChoice("Lanjut")}
                    style={{
                      flex: 1,
                      padding: '10px 6px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: newHasilChoice === "Lanjut" ? '2px solid #22c55e' : '1px solid #e2e8f0',
                      background: newHasilChoice === "Lanjut" ? '#f0fdf4' : 'white',
                      color: newHasilChoice === "Lanjut" ? '#166534' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Lanjut
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewHasilChoice("Ragu-Ragu")}
                    style={{
                      flex: 1,
                      padding: '10px 6px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: newHasilChoice === "Ragu-Ragu" ? '2px solid #eab308' : '1px solid #e2e8f0',
                      background: newHasilChoice === "Ragu-Ragu" ? '#fefce8' : 'white',
                      color: newHasilChoice === "Ragu-Ragu" ? '#854d0e' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    ~ Ragu-Ragu
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewHasilChoice("Tidak Lanjut")}
                    style={{
                      flex: 1,
                      padding: '10px 6px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: newHasilChoice === "Tidak Lanjut" ? '2px solid #ef4444' : '1px solid #e2e8f0',
                      background: newHasilChoice === "Tidak Lanjut" ? '#fef2f2' : 'white',
                      color: newHasilChoice === "Tidak Lanjut" ? '#991b1b' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    ✗ Tidak Lanjut
                  </button>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.4 }}>
                  * Pasangan hanya akan disetujui (Approved) jika lawan juga memberikan penilaian <b>Lanjut</b>.
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddHasilModal(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!newHasilTargetId || submittingHasilId === "new"}
                  onClick={() => submitHasilRR(null, newHasilChoice, newHasilTargetId)}
                  style={{
                    flex: 2,
                    padding: '11px',
                    borderRadius: '10px',
                    border: 'none',
                    background: newHasilTargetId ? '#10b981' : '#cbd5e1',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: newHasilTargetId ? 'pointer' : 'not-allowed'
                  }}
                >
                  {submittingHasilId === "new" ? "Menyimpan..." : "Simpan Penilaian"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      </div>

      <style jsx>{`
        .container { max-width:1200px; margin:0 auto; padding:24px 20px 80px; font-family:'Inter',sans-serif; color:#1f2922; overflow-x:hidden; position:relative; z-index:1; }

        .page-header { text-align:center; margin-bottom:32px; display:flex; flex-direction:column; align-items:center; gap:8px; }
        .badge-top { display:inline-flex; align-items:center; gap:6px; background:rgba(197, 160, 89, 0.15); color:#c5a059; border:1px solid rgba(197, 160, 89, 0.35); padding:6px 16px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; }
        .page-header h1 { font-family:'Cormorant Garamond', Georgia, serif; font-size:42px; font-weight:700; letter-spacing:-0.5px; margin:0; color:#faf7f2; line-height:1.15; }
        .page-header h1 span { color:#c5a059; }
        .welcome-msg { color:#c4d4c8; font-size:15px; margin:0; font-weight:500; }

        .toolbar { display:flex; flex-direction:column; gap:16px; background:#faf7f2; padding:20px; border-radius:24px; box-shadow:0 10px 30px rgba(0,0,0,0.15); border:1px solid rgba(197, 160, 89, 0.4); margin-bottom:28px; box-sizing:border-box; width:100%; overflow:hidden; }
        .search-group { display:flex; gap:8px; width:100%; overflow:hidden; min-width:0; align-items:center; }
        .search-bar { flex:1; min-width:0; overflow:hidden; position:relative; display:flex; align-items:center; gap:8px; background:#ffffff; border:1px solid rgba(197, 160, 89, 0.4); padding:10px 14px; border-radius:14px; }
        .search-bar input { border:none; background:transparent; outline:none; width:100%; min-width:0; font-size:14px; font-weight:500; color:#1f2922; }
        .search-icon { color:#627265; flex-shrink:0; }
        .clear-search-btn { background:#f4efe6; border:none; border-radius:50%; width:20px; height:20px; flex-shrink:0; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#627265; transition:0.2s; margin-left:4px; }
        .clear-search-btn:hover { background:#e5cf9f; color:#17241b; }
        .btn-advanced { display:flex; align-items:center; gap:8px; background:white; border:1px solid rgba(197, 160, 89, 0.4); padding:0 20px; border-radius:16px; font-size:14px; font-weight:600; cursor:pointer; transition:0.2s; white-space:nowrap; color:#26392d; }
        .btn-advanced:hover { background:#f4efe6; }
        .filter-controls { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; align-items: start; width: 100%; }
        .filter-field-group { display: flex; flex-direction: column; gap: 6px; width: 100%; min-width: 0; }
        .filter-label { font-size: 11px; font-weight: 700; color: #26392d; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 2px; }
        .toggle-group { display:flex; background:rgba(197, 160, 89, 0.12); padding:4px; border-radius:14px; width: 100%; }
        .toggle-group button { border:none; background:transparent; padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700; color:#627265; cursor:pointer; transition:0.2s; flex: 1; }
        .toggle-group button.active { background:#26392d; color:#faf7f2; box-shadow:0 4px 10px rgba(0,0,0,0.1); }
        .select-container { position:relative; display:flex; align-items:center; width:100%; min-width:0; }
        .select-box { appearance:none; background:white; border:1px solid rgba(197, 160, 89, 0.4); padding:10px 35px 10px 14px; border-radius:14px; font-size:13px; font-weight:600; cursor:pointer; outline:none; width:100%; min-width:0; color:#1f2922; transition:0.2s; box-sizing:border-box; }
        .select-box:hover { border-color:#c5a059; }
        .select-box:focus { border-color:#3d5a45; box-shadow:0 0 0 3px rgba(197, 160, 89, 0.15); }
        .input-range-container { display:flex; gap:8px; width:100%; min-width:0; }
        .filter-input-box { background:white; border:1px solid rgba(197, 160, 89, 0.4); padding:10px 12px; border-radius:14px; font-size:13px; font-weight:600; outline:none; width:100%; min-width:0; flex:1; color:#1f2922; transition:0.2s; box-sizing:border-box; }
        .filter-input-box:hover { border-color:#c5a059; }
        .filter-input-box:focus { border-color:#3d5a45; box-shadow:0 0 0 3px rgba(197, 160, 89, 0.15); }
        .select-arrow { position:absolute; right:14px; pointer-events:none; color:#c5a059; }
        .status-badge { display:flex; align-items:center; gap:8px; background:rgba(197, 160, 89, 0.12); border:1px solid rgba(197, 160, 89, 0.35); padding:10px 18px; border-radius:14px; font-size:13px; font-weight:700; color:#26392d; }
        .btn-logout { margin-left:auto; display:flex; align-items:center; gap:8px; background:#fef2f2; color:#ef4444; border:1px solid #fee2e2; padding:10px 18px; border-radius:14px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; }
        .btn-logout:hover { background:#fee2e2; }

        .toolbar-status-row {
          display: flex;
          align-items: center;
          margin-top: 4px;
        }
        .btn-filter-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          background: white;
          border: 1px solid rgba(197, 160, 89, 0.4);
          border-radius: 14px;
          cursor: pointer;
          transition: 0.2s;
          color: #26392d;
        }
        .btn-filter-toggle:hover {
          background: #f4efe6;
          border-color: #c5a059;
        }
        .btn-filter-toggle.active {
          background: rgba(197, 160, 89, 0.15);
          border-color: #c5a059;
          color: #26392d;
        }
        .btn-reset-filters {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(197, 160, 89, 0.12);
          border: 1px solid rgba(197, 160, 89, 0.4);
          color: #26392d;
          padding: 10px 18px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
          grid-column: 1 / -1;
        }
        .btn-reset-filters:hover {
          background: #f4efe6;
          border-color: #c5a059;
        }


        .selection-banner { background:linear-gradient(135deg, #1f2e24 0%, #26392d 100%); transition: all 0.2s ease; border: 1px solid rgba(197, 160, 89, 0.45); border-radius:24px; padding:22px 28px; display:flex; justify-content:space-between; align-items:center; color:#faf7f2; margin-bottom:32px; box-shadow:0 12px 30px rgba(0,0,0,0.25); }
        .selection-banner:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(0,0,0,0.3); border-color:#c5a059; }
        .selection-banner.active-filter { border-color: #c5a059; background: #17241b; }
        .banner-left { display:flex; align-items:center; gap:20px; }
        .banner-icon { background:rgba(197, 160, 89, 0.15); border:1px solid rgba(197, 160, 89, 0.4); padding:14px; border-radius:18px; color:#c5a059; }
        .banner-text { display:flex; flex-direction:column; gap:2px; }
        .banner-label { font-size:11px; font-weight:800; color:#c5a059; letter-spacing:1.5px; }
        .banner-value { font-family:'Cormorant Garamond', Georgia, serif; font-size:22px; font-weight:700; color:#faf7f2; margin:0; }
        .pilihan-pill { background:#c5a059; color:#17241b; padding:8px 18px; border-radius:999px; font-size:13px; font-weight:800; transition:0.3s; white-space:nowrap; }
        .pilihan-pill.full { background:#10b981; color:white; box-shadow:0 0 15px rgba(16,185,129,0.4); }

        .user-title-context { margin-bottom:32px; }
        .user-title-context h3 { font-family:'Cormorant Garamond', Georgia, serif; font-size:26px; font-weight:700; margin:0 0 6px 0; color:#faf7f2; }
        .user-meta { display:flex; justify-content:space-between; color:#c4d4c8; font-size:14px; font-weight:600; flex-wrap:wrap; gap:4px; }

        .grid-container { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:24px; }

        .participant-card { background:#faf7f2; border-radius:24px; border:1px solid rgba(197, 160, 89, 0.4); overflow:hidden; transition:0.3s cubic-bezier(0.4,0,0.2,1); box-shadow:0 6px 20px rgba(0,0,0,0.08); }
        .participant-card:hover { transform:translateY(-6px); box-shadow:0 20px 40px rgba(0,0,0,0.2); border-color:#c5a059; }
        .participant-card.is-pulang { opacity:0.65; filter:grayscale(0.3); background:#f4efe6; border-color:#d5c7b0; }
        .participant-card.is-pulang:hover { transform:none; box-shadow:0 4px 20px rgba(0,0,0,0.02); border-color:#d5c7b0; }
        .participant-card.is-pulang .card-image { filter: grayscale(100%); -webkit-filter: grayscale(100%); }
        .pulang-badge { top:16px; right:16px; background:#64748b; color:white; box-shadow:0 4px 12px rgba(100,116,139,0.4); }
        .card-image-wrapper { height:380px; position:relative; overflow:hidden; }
        .card-image { width:100%; height:100%; object-fit:cover; transition:0.5s; }
        .participant-card:hover .card-image { transform:scale(1.05); }
        .floating-badge { position:absolute; padding:6px 12px; border-radius:12px; font-size:12px; font-weight:800; backdrop-filter:blur(8px); }
        .id-badge { top:16px; left:16px; background:#26392d; color:#faf7f2; border:1px solid #c5a059; }
        .full-badge { top:16px; right:16px; background:#ef4444; color:white; box-shadow:0 4px 12px rgba(239,68,68,0.4); animation:pulse-red 2s infinite; }
        @keyframes pulse-red { 0%{transform:scale(1)} 50%{transform:scale(1.05)} 100%{transform:scale(1)} }
        .label-badge { bottom:16px; right:16px; background:rgba(255,255,255,0.92); color:#26392d; border:1px solid rgba(197, 160, 89, 0.4); }
        .label-badge.status-panitia { background:#26392d; color:#faf7f2; border-color:#c5a059; }
        .card-content { padding:24px; }
        .card-name { font-family:'Cormorant Garamond', Georgia, serif; font-size:23px; font-weight:700; color:#26392d; margin:0 0 6px 0; }
        .card-location { display:flex; align-items:center; gap:6px; color:#627265; font-size:13px; font-weight:600; margin-bottom:20px; }
        .card-stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
        .card-passions-mini { display:flex; flex-direction:column; gap:6px; margin-bottom:24px; padding:12px; background:#ffffff; border:1px solid rgba(197, 160, 89, 0.25); border-radius:12px; }
        .pass-pill { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:600; color:#3d5a45; }
        .pass-pill svg { color:#3d5a45; opacity:0.9; }
        .stat-pill { background:#ffffff; border:1px solid rgba(197, 160, 89, 0.25); padding:10px 14px; border-radius:12px; display:flex; align-items:center; gap:10px; font-size:13px; font-weight:700; color:#1f2922; }
        .stat-pill svg { color:#3d5a45; opacity:0.9; }
        .stat-pill.selection-count { background:rgba(197, 160, 89, 0.12); color:#26392d; border:1px solid rgba(197, 160, 89, 0.4); }
        .stat-pill.selection-count svg { color:#c5a059; }
        .card-instagram-link { color:inherit; text-decoration:none; }
        .card-instagram-link:hover { color:#c5a059; text-decoration:underline; }
        .card-actions { display:flex; gap:12px; }
        .btn-secondary { flex:1; background:white; border:1px solid rgba(197, 160, 89, 0.4); color:#26392d; padding:12px; border-radius:14px; font-size:13px; font-weight:700; text-align:center; text-decoration:none; transition:0.2s; cursor:pointer; }
        .btn-secondary:hover { background:#f4efe6; border-color:#c5a059; }
        .btn-primary { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; background:#3d5a45; color:white; border:none; padding:12px; border-radius:14px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; }
        .btn-primary:hover { background:#4d7057; transform:translateY(-2px); }
        .btn-primary.selected { background:#c5a059; color:#17241b; font-weight:800; }
        .btn-primary.disabled { background:#ede8de; color:#8c9b90; cursor:not-allowed; border:1px solid rgba(197, 160, 89, 0.25); }
        .btn-primary.disabled:hover { transform:none; background:#ede8de; }
        .btn-danger { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; background:#fef2f2; color:#ef4444; border:1px solid #fee2e2; padding:12px; border-radius:14px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; }
        .btn-danger:hover { background:#fee2e2; border-color:#fca5a5; transform:translateY(-2px); }

        .pagination {
          margin: 40px auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: nowrap;
        }
        .pagination button {
          background: #faf7f2;
          border: 1px solid rgba(197, 160, 89, 0.4);
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          color: #26392d;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
        .pagination button:hover:not(:disabled) {
          border-color: #c5a059;
          background: #f4efe6;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
        }
        .pagination button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          background: rgba(250, 247, 242, 0.6);
        }
        .pagination-nav-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          height: 38px;
          flex-shrink: 0;
        }
        .page-numbers {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .page-numbers button {
          width: 38px;
          height: 38px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-family: inherit;
        }
        .page-numbers button.active {
          background: linear-gradient(135deg, #26392d, #3d5a45);
          color: #faf7f2;
          border: 1px solid #c5a059;
          box-shadow: 0 4px 15px rgba(38, 57, 45, 0.35);
        }
        @media (max-width: 480px) {
          .pagination { gap: 6px; }
          .pagination-nav-btn { padding: 8px 10px; width: 34px; height: 34px; justify-content: center; }
          .pagination-text { display: none; }
          .page-numbers button { width: 34px; height: 34px; font-size: 12px; }
        }

        .skeleton-card { height:600px; background:#f1f5f9; border-radius:32px; animation:pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

        /* ── Mobile responsive ─────────────────────────────────────────── */
        @media (max-width:1024px) {
          .container { padding:20px 12px; overflow-x:hidden; }
          .page-header h1 { font-size:28px; }
          .toolbar { border-radius:16px; width:100%; box-sizing:border-box; overflow:hidden; }
          .grid-container { grid-template-columns:1fr; }
          .btn-logout { margin-left:0; width:100%; justify-content:center; }
          .search-group { flex-direction:row; width:100%; overflow:hidden; min-width:0; }
          .search-bar { min-width:0; overflow:hidden; }
          .selection-banner { padding:16px 20px; flex-direction:column; gap:12px; align-items:flex-start; }
          .banner-value { font-size:15px; }
          .filter-controls { display:flex; flex-direction:column; gap:10px; align-items:stretch; width:100%; }
          .filter-controls .toggle-group { display:flex; width:100%; }
          .filter-controls .toggle-group button { flex:1; text-align:center; }
          .filter-controls .select-container { width:100%; }
          .filter-controls .select-box { width:100%; min-width:0; }
          .filter-controls .input-range-container { width:100%; display:flex; gap:8px; }
          .filter-controls .filter-input-box { flex:1; min-width:0; }
          .btn-reset-filters { width:100%; justify-content:center; }
        }

        /* ── DETAIL MODAL ───────────────────────────────────────────── */
        .dm-overlay {
          position:fixed; inset:0; z-index:1000;
          background:rgba(23,36,27,0.8);
          backdrop-filter:blur(8px);
          display:flex; align-items:flex-end; justify-content:center;
          animation:fadeIn 0.2s ease;
        }
        @media(min-width:640px) {
          .dm-overlay { align-items:center; padding:20px; }
        }
        .dm-sheet {
          background:#faf7f2;
          width:100%; max-width:480px;
          border-radius:28px 28px 0 0;
          max-height:92dvh;
          display:flex; flex-direction:column;
          overflow:hidden;
          box-shadow:0 -8px 40px rgba(0,0,0,0.3);
          border:1px solid rgba(197, 160, 89, 0.4);
          animation:slideUp 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        @media(min-width:640px) {
          .dm-sheet { border-radius:28px; max-height:90dvh; }
        }

        /* hero */
        .dm-hero {
          position:relative;
          padding:48px 20px 24px;
          display:flex; flex-direction:column; align-items:center;
          flex-shrink:0;
          background:linear-gradient(180deg, #1f2e24 0%, #26392d 100%);
          border-bottom:1px solid rgba(197, 160, 89, 0.35);
        }
        .dm-close {
          position:absolute; top:14px; right:14px;
          width:32px; height:32px; border-radius:50%;
          background:rgba(255,255,255,0.15); border:1px solid rgba(197, 160, 89, 0.35);
          color:white; display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:0.2s;
        }
        .dm-close:hover { background:rgba(255,255,255,0.25); color:#c5a059; }
        .dm-avatar-wrap {
          width:100px; height:100px; border-radius:50%;
          border:3px solid #c5a059;
          overflow:hidden; margin-bottom:14px;
          box-shadow:0 8px 24px rgba(0,0,0,0.3);
          flex-shrink:0;
        }
        .dm-avatar-img { width:100%; height:100%; object-fit:cover; }
        .dm-avatar-init {
          width:100%; height:100%;
          display:flex; align-items:center; justify-content:center;
          font-size:40px; font-weight:900; color:white;
        }
        .dm-hero-badge {
          background:rgba(197, 160, 89, 0.15);
          border:1px solid rgba(197, 160, 89, 0.4);
          color:#c5a059; font-size:11px; font-weight:800;
          padding:3px 12px; border-radius:999px;
          margin-bottom:8px; letter-spacing:0.5px;
        }
        .dm-name {
          font-family:'Cormorant Garamond', Georgia, serif;
          font-size:24px; font-weight:700; color:#faf7f2;
          margin:0 0 6px; text-align:center; line-height:1.2;
        }
        .dm-loc {
          display:flex; align-items:center; gap:5px;
          color:#c4d4c8; font-size:12px; font-weight:600;
          margin-bottom:14px; text-align:center;
        }
        .dm-chips { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; }
        .dm-chip {
          background:rgba(255,255,255,0.12);
          border:1px solid rgba(197, 160, 89, 0.3);
          color:#faf7f2; font-size:11px; font-weight:700;
          padding:4px 12px; border-radius:20px;
          display:flex; align-items:center; gap:4px;
        }

        /* body */
        .dm-body { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:20px 20px 8px; }
        .dm-section-title {
          font-size:11px; font-weight:800; color:#c5a059;
          letter-spacing:1px; text-transform:uppercase;
          margin-bottom:14px;
        }
        .dm-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .dm-field {
          background:#ffffff; border-radius:14px;
          border:1px solid rgba(197, 160, 89, 0.3);
          padding:12px 14px;
          display:flex; flex-direction:column; gap:4px;
        }
        .dm-field-full { grid-column:span 2; }
        .dm-label { font-size:10px; font-weight:800; color:#c5a059; text-transform:uppercase; letter-spacing:0.5px; }
        .dm-val { font-size:13px; font-weight:700; color:#26392d; line-height:1.4; }

        /* cta */
        .dm-cta {
          padding:14px 20px 28px;
          flex-shrink:0;
          background:#faf7f2;
          border-top:1px solid rgba(197, 160, 89, 0.3);
        }
        .dm-btn {
          width:100%; display:flex; align-items:center; justify-content:center; gap:10px;
          color:white; border:none; padding:16px;
          border-radius:18px; font-size:15px; font-weight:800;
          cursor:pointer; transition:all 0.25s;
          background:#3d5a45;
        }
        .dm-btn:not(:disabled):active { transform:scale(0.98); }
        .dm-btn:hover:not(:disabled) { background:#4d7057; }
        .dm-btn-selected { background:#c5a059 !important; color:#17241b !important; cursor:default; }
        .dm-btn-disabled { background:#ede8de !important; color:#8c9b90 !important; cursor:not-allowed; }
        .dm-btn-danger { background:#fcf4f2 !important; color:#842029 !important; border:1px solid rgba(197, 160, 89, 0.4) !important; }
        .dm-btn-danger:hover { background:#f7e5e3 !important; border-color:#c5a059 !important; transform:translateY(-2px); }

        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(40px) scale(0.98);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }

        .status-queue-banner { margin-top:10px; background:#fffdf5; color:#c5a059; padding:8px 16px; border-radius:10px; display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:700; border:1px dashed rgba(197,160,89,0.5); }

        /* ── BOX LOVE ─────────────────────────────────────────────────── */
        .box-love-fab { position:fixed; bottom:32px; right:32px; display:flex; align-items:center; gap:10px; background:linear-gradient(135deg, #3d5a45 0%, #26392d 100%); color:#faf7f2; border:1px solid #c5a059; padding:14px 22px; border-radius:50px; font-size:14px; font-weight:800; cursor:pointer; z-index:100; box-shadow:0 8px 24px rgba(38,57,45,0.35); transition:all 0.3s cubic-bezier(0.16,1,0.3,1); }
        .box-love-fab:hover { transform:translateY(-4px) scale(1.04); box-shadow:0 16px 32px rgba(38,57,45,0.5); border-color:#e5cf9f; }

        .bl-overlay { position:fixed; inset:0; background:rgba(23,36,27,0.75); backdrop-filter:blur(12px); z-index:900; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn 0.2s ease; }
        .bl-popup { background:#faf7f2; border:1px solid rgba(197,160,89,0.4); border-radius:32px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; box-shadow:0 40px 80px rgba(0,0,0,0.3); animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
        .bl-header { display:flex; align-items:center; justify-content:space-between; padding:28px 28px 20px; }
        .bl-logo { display:flex; align-items:center; gap:14px; }
        .bl-logo-icon { font-size:44px; line-height:1; }
        .bl-title { font-family:'Cormorant Garamond', Georgia, serif; font-size:26px; font-weight:700; margin:0; color:#26392d; letter-spacing:-0.5px; }
        .bl-subtitle { font-size:13px; color:#627265; margin:0; font-weight:500; }
        .bl-close { width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:none; background:#f4efe6; border-radius:50%; cursor:pointer; color:#627265; transition:0.2s; flex-shrink:0; }
        .bl-close:hover { background:#e5cf9f; color:#17241b; }
        .bl-notice { margin:0 28px 16px; background:#fffdf5; border:1px solid rgba(197,160,89,0.35); border-radius:12px; padding:10px 16px; font-size:13px; color:#26392d; font-weight:600; display:flex; align-items:center; gap:6px; }
        .bl-body { padding:0 28px; flex:1; }
        .bl-section { margin-bottom:20px; }
        .bl-section-label { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:800; color:#26392d; margin-bottom:10px; }
        .bl-my-info { display:flex; align-items:center; gap:14px; background:#ffffff; border:1.5px solid rgba(197,160,89,0.35); border-radius:16px; padding:14px 18px; position:relative; }
        .bl-my-avatar { width:44px; height:44px; border-radius:50%; overflow:hidden; background:#e5cf9f; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:900; color:#26392d; flex-shrink:0; }
        .bl-my-avatar img { width:100%; height:100%; object-fit:cover; }
        .bl-my-name { font-size:15px; font-weight:800; color:#26392d; }
        .bl-my-loc { font-size:12px; color:#627265; font-weight:600; margin-top:2px; }
        .bl-check { margin-left:auto; color:#10b981; flex-shrink:0; }
        .bl-heart-divider { text-align:center; font-size:24px; margin:4px 0 16px; }
        .bl-search-bar { position:relative; display:flex; align-items:center; }
        .bl-search-bar input { width:100%; border:1px solid rgba(197,160,89,0.4); background:#ffffff; padding:13px 44px 13px 18px; border-radius:14px; font-size:14px; font-weight:600; outline:none; transition:0.2s; color:#1f2922; }
        .bl-search-bar input:focus { border-color:#3d5a45; box-shadow:0 0 0 3px rgba(197,160,89,0.15); }
        .bl-search-icon { position:absolute; right:14px; color:#627265; pointer-events:none; }
        .bl-results { margin-top:10px; border:1px solid rgba(197,160,89,0.35); border-radius:16px; overflow:hidden; max-height:220px; overflow-y:auto; -webkit-overflow-scrolling:touch; background:#ffffff; }
        .bl-result-item { display:flex; align-items:center; gap:14px; padding:12px 16px; cursor:pointer; transition:0.15s; border-bottom:1px solid #f4efe6; }
        .bl-result-item:last-child { border-bottom:none; }
        .bl-result-item:hover { background:#f4efe6; }
        .bl-result-item.selected { background:rgba(197,160,89,0.15); }
        .bl-result-avatar { width:40px; height:40px; border-radius:50%; overflow:hidden; background:rgba(197,160,89,0.2); display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:900; color:#26392d; flex-shrink:0; }
        .bl-result-avatar img { width:100%; height:100%; object-fit:cover; }
        .bl-result-name { font-size:14px; font-weight:800; color:#26392d; }
        .bl-result-loc { font-size:11px; color:#627265; font-weight:600; margin-top:2px; }
        .bl-loading,.bl-empty { text-align:center; padding:12px; color:#627265; font-size:13px; font-weight:600; }
        .bl-footer { padding:20px 28px 28px; }
        .bl-submit-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:10px; background:linear-gradient(135deg, #3d5a45 0%, #26392d 100%); color:white; border:1px solid #c5a059; padding:16px; border-radius:18px; font-size:16px; font-weight:800; cursor:pointer; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); box-shadow:0 6px 20px rgba(38,57,45,0.3); }
        .bl-submit-btn:not(:disabled):hover { transform:translateY(-3px); box-shadow:0 12px 28px rgba(38,57,45,0.45); border-color:#e5cf9f; }
        .bl-submit-btn:disabled { opacity:0.5; cursor:not-allowed; background:#ede8de; color:#8c9b90; box-shadow:none; border-color:transparent; }
        .bl-footer-note { text-align:center; font-size:12px; color:#627265; font-weight:500; margin:12px 0 0; line-height:1.5; }

        /* FIX: Mobile Box Love — bottom sheet style on small screens */
        @media (max-width:480px) {
          .bl-popup { border-radius:24px 24px 0 0; }
          .bl-overlay { align-items:flex-end; padding:0; }
          .box-love-fab { bottom:20px; right:20px; }
        }

        /* ── Commentary ──────────────────────────────────────────────── */
        .commentary-box { margin-top:20px; padding-top:16px; border-top:1px dashed rgba(197,160,89,0.35); }
        .commentary-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
        .anon-toggle { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#26392d; cursor:pointer; }
        .anon-toggle input { width:14px; height:14px; cursor:pointer; }
        .comment-name-input { flex:1; border:1px solid rgba(197,160,89,0.35); background:#ffffff; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:600; outline:none; color:#1f2922; }
        .comment-name-input:focus { border-color:#3d5a45; }
        .comment-tags-label { font-size:10px; font-weight:800; color:#c5a059; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; }
        .comment-buttons { display:flex; flex-wrap:wrap; gap:6px; }
        .btn-tag { background:white; border:1px solid rgba(197,160,89,0.35); padding:6px 12px; border-radius:100px; font-size:11px; font-weight:700; color:#26392d; cursor:pointer; transition:all 0.2s; }
        .btn-tag:hover { background:rgba(197,160,89,0.15); border-color:#c5a059; color:#26392d; transform:translateY(-1px); }
        .btn-tag:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

        /* ── Notification ────────────────────────────────────────────── */
        .header-actions { display:flex; align-items:center; gap:12px; justify-content:center; margin-top:8px; }
        .btn-notification { background:#faf7f2; border:1px solid rgba(197, 160, 89, 0.4); width:44px; height:44px; border-radius:14px; display:flex; align-items:center; justify-content:center; cursor:pointer; position:relative; transition:all 0.2s; color:#26392d; box-shadow:0 4px 10px rgba(0,0,0,0.05); }
        .btn-notification:hover { background:#f4efe6; border-color:#c5a059; color:#c5a059; transform:translateY(-2px); }
        .btn-notification.has-new { border-color:#c5a059; color:#c5a059; animation:pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(197,160,89,0.4)} 70%{box-shadow:0 0 0 10px rgba(197,160,89,0)} 100%{box-shadow:0 0 0 0 rgba(197,160,89,0)} }
        .notification-dot { position:absolute; top:10px; right:10px; width:10px; height:10px; background:#ef4444; border-radius:50%; border:2px solid white; }

        .comment-sent-indicator { display:flex; align-items:center; gap:8px; background:#fffdf5; color:#c5a059; padding:12px 16px; border-radius:12px; font-size:13px; font-weight:700; border:1px solid rgba(197,160,89,0.4); animation:slideIn 0.3s ease-out; }
        @keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }

        /* ── Comments Modal ──────────────────────────────────────────── */
        .comments-modal-box { background:#faf7f2; border:1px solid rgba(197, 160, 89, 0.45); border-radius:32px; padding:40px; max-width:500px; width:95%; max-height:85vh; overflow-y:auto; -webkit-overflow-scrolling:touch; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); }
        .comments-modal-box .modal-header { text-align:center; margin-bottom:32px; }
        .comments-modal-box .icon-badge { width:64px; height:64px; background:rgba(197, 160, 89, 0.15); border:1px solid rgba(197, 160, 89, 0.4); color:#c5a059; display:flex; align-items:center; justify-content:center; border-radius:20px; margin:0 auto 20px; }
        .comments-modal-box h2 { font-family:'Cormorant Garamond', Georgia, serif; font-size:28px; font-weight:700; color:#26392d; margin-bottom:8px; letter-spacing:-0.01em; }
        .comments-modal-box p { color:#627265; font-size:14px; }
        .modal-close-btn { position:absolute; top:20px; right:20px; background:none; border:none; cursor:pointer; color:#627265; padding:8px; border-radius:50%; transition:all 0.2s; }
        .modal-close-btn:hover { background:#f4efe6; color:#17241b; }
        .comments-list { display:flex; flex-direction:column; gap:16px; padding:10px 0; }
        .comment-item { animation:slideUp 0.3s ease-out; }
        .comment-bubble { background:#ffffff; padding:24px; border-radius:24px; border-bottom-left-radius:4px; border:1px solid rgba(197, 160, 89, 0.35); position:relative; box-shadow:0 8px 24px rgba(0,0,0,0.06); transition:0.3s; }
        .comment-bubble:hover { transform:scale(1.02); box-shadow:0 15px 35px rgba(0,0,0,0.1); border-color:#c5a059; }
        .comment-icon { position:absolute; top:-12px; left:20px; background:#faf7f2; width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.08); border:1px solid rgba(197, 160, 89, 0.4); }
        .comment-text { font-family:'Cormorant Garamond', Georgia, serif; font-size:22px; font-weight:700; margin-bottom:20px; font-style:italic; line-height:1.4; color:#26392d; letter-spacing:-0.01em; }
        .comment-meta { display:flex; justify-content:space-between; align-items:center; font-size:13px; color:#627265; font-weight:700; border-top:1px solid rgba(197, 160, 89, 0.25); padding-top:16px; flex-wrap:wrap; gap:8px; }
        .author-info { display:flex; align-items:center; gap:6px; }
        .author-label { color:#c5a059; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.5px; }
        .comment-author { color:#26392d; font-weight:800; background:rgba(197, 160, 89, 0.12); border:1px solid rgba(197, 160, 89, 0.3); padding:4px 10px; border-radius:8px; }
        .comment-date { font-size:11px; background:rgba(197, 160, 89, 0.15); color:#26392d; border:1px solid rgba(197, 160, 89, 0.3); padding:4px 10px; border-radius:8px; }
        .no-comments { text-align:center; padding:80px 20px; color:#627265; display:flex; flex-direction:column; align-items:center; background:#ffffff; border-radius:24px; border:2px dashed rgba(197, 160, 89, 0.35); }

        .tab-title { font-size:14px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
        .tab-title.sent { color:#ef4444; }
        .tab-title.sent::before { content:''; width:8px; height:8px; background:#ef4444; border-radius:50%; }
        .comment-bubble.sent-red { background:linear-gradient(135deg,#fff5f5,#fffcfc); border-color:#fecdd3; box-shadow:0 10px 25px rgba(239,68,68,0.05); }
        .sent-indicator { font-size:10px; font-weight:950; color:#ef4444; margin-bottom:8px; letter-spacing:0.5px; }
        .comment-date.red { background:#fef2f2; color:#ef4444; }
        .spacer-modal { height:48px; border-bottom:2px dashed #f1f5f9; margin-bottom:32px; }
        .no-comments.mini { padding:30px; font-size:13px; }

        @media (max-width:480px) {
          .comments-modal-box { padding:24px 16px; max-height:90vh; border-radius:20px; }
          .comment-text { font-size:16px; }
        }

        /* ── DESKTOP TAB NAV ───────────────────────────────────────────── */
        .desktop-tab-nav {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 32px;
          position: relative;
          z-index: 2;
        }
        .desktop-tab-nav button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #faf7f2;
          border: 1px solid rgba(197, 160, 89, 0.4);
          padding: 10px 24px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          color: #26392d;
          cursor: pointer;
          transition: 0.2s;
        }
        .desktop-tab-nav button:hover {
          background: #f4efe6;
          border-color: #c5a059;
        }
        .desktop-tab-nav button.active {
          background: #26392d;
          border-color: #c5a059;
          color: #faf7f2;
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        }
        .desktop-tab-nav button.active :global(svg) {
          color: #c5a059 !important;
        }
        .badge-icon-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .badge-count-bubble {
          position: absolute;
          top: -6px;
          right: -10px;
          background: #c5a059;
          color: #17241b;
          font-size: 9px;
          font-weight: 900;
          border-radius: 50%;
          min-width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #26392d;
          padding: 0 2px;
        }
        .mobile-nav-bar {
          display: none;
        }

        /* ── BOTTOM MOBILE NAV BAR ─────────────────────────────────────── */
        @media (max-width: 1024px) {
          .desktop-tab-nav {
            display: none;
          }
          .mobile-nav-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: rgba(23, 36, 27, 0.95);
            backdrop-filter: blur(12px);
            border-top: 1px solid rgba(197, 160, 89, 0.35);
            display: flex;
            align-items: center;
            justify-content: space-around;
            z-index: 500;
            padding-bottom: env(safe-area-inset-bottom);
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
          }
          .nav-bar-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            border: none;
            background: transparent;
            color: #a3b8aa;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            transition: 0.2s;
            flex: 1;
            height: 100%;
          }
          .nav-bar-item.active {
            color: #c5a059;
          }
          .pb-24 {
            padding-bottom: 96px !important;
          }
        }

        /* ── MOBILE RESPONSIVE CATALOG GRID & CARDS ─────────────────────── */
        @media (max-width: 640px) {
          .grid-container {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .participant-card {
            border-radius: 20px !important;
          }
          .card-image-wrapper {
            height: 180px !important;
          }
          .card-content {
            padding: 12px !important;
          }
          .card-name {
            font-size: 14px !important;
            font-weight: 800 !important;
            margin-bottom: 2px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .card-location {
            font-size: 10px !important;
            margin-bottom: 12px !important;
            gap: 3px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .card-stats-grid {
            display: none !important;
          }
          .card-passions-mini {
            display: none !important;
          }
          .commentary-box {
            display: none !important;
          }
          .card-actions {
            flex-direction: column !important;
            gap: 6px !important;
          }
          .btn-secondary, .btn-primary, .btn-danger {
            padding: 8px 6px !important;
            font-size: 11px !important;
            border-radius: 10px !important;
            width: 100% !important;
            justify-content: center !important;
          }
          .floating-badge {
            font-size: 10px !important;
            padding: 4px 8px !important;
            border-radius: 8px !important;
          }
          .id-badge {
            top: 8px !important;
            left: 8px !important;
          }
          .full-badge {
            top: 8px !important;
            right: 8px !important;
          }
          .label-badge {
            bottom: 8px !important;
            right: 8px !important;
          }
          .pulang-badge {
            top: 8px !important;
            right: 8px !important;
          }
        }

        /* ── CART / LOVE LETTER STYLE ─────────────────────────────────── */
        .cart-container {
          max-width: 600px;
          margin: 0 auto;
          animation: slideUp 0.3s ease-out;
        }
        .selection-info-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #faf7f2;
          color: #26392d;
          padding: 16px 20px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 15px;
          border: 1px solid rgba(197, 160, 89, 0.4);
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }
        .empty-cart-state {
          text-align: center;
          padding: 60px 20px;
          background: #faf7f2;
          border: 2px dashed rgba(197, 160, 89, 0.4);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
        }
        .empty-cart-icon {
          font-size: 48px;
          margin-bottom: 16px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.05));
        }
        .empty-cart-state h3 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          color: #26392d;
          margin: 0 0 8px 0;
        }
        .empty-cart-state p {
          font-size: 13px;
          color: #627265;
          margin: 0 0 20px 0;
          line-height: 1.5;
          max-width: 280px;
        }
        .goto-catalog-btn {
          background: #3d5a45;
          color: white;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 24px;
          border-radius: 999px;
          border: 1px solid #c5a059;
          cursor: pointer;
          transition: 0.2s;
        }
        .goto-catalog-btn:hover {
          background: #4d7057;
          transform: translateY(-2px);
        }
        .cart-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        .cart-item-card {
          background: #faf7f2;
          border: 1px solid rgba(197, 160, 89, 0.4);
          border-radius: 20px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: 0.2s;
        }
        .cart-item-card:hover {
          border-color: #c5a059;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        }
        .cart-item-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .cart-item-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(197, 160, 89, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(197, 160, 89, 0.4);
        }
        .cart-item-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 18px;
          font-weight: 700;
          color: #26392d;
          margin-bottom: 4px;
        }
        .status-badge-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
          text-transform: capitalize;
        }
        .status-badge-pill.menunggu {
          background: rgba(197, 160, 89, 0.15);
          color: #c5a059;
        }
        .status-badge-pill.diterima {
          background: #d1fae5;
          color: #065f46;
        }
        .status-badge-pill.selesai {
          background: rgba(61, 90, 69, 0.15);
          color: #3d5a45;
        }
        .cart-btn-danger {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .cart-btn-danger:hover {
          background: #fee2e2;
        }
        .cart-btn-disabled {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #ede8de;
          color: #8c9b90;
          border: 1px solid rgba(197, 160, 89, 0.25);
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: default;
        }

        .box-love-section-card {
          background: #faf7f2;
          border: 1px solid rgba(197, 160, 89, 0.4);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .box-love-section-header {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }
        .box-love-section-header .emoji {
          font-size: 32px;
          line-height: 1;
        }
        .box-love-section-header h4 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          color: #26392d;
          margin: 0 0 4px 0;
        }
        .box-love-section-header p {
          font-size: 12px;
          color: #627265;
          margin: 0;
          line-height: 1.5;
        }
        .box-love-section-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #3d5a45 0%, #26392d 100%);
          color: white;
          border: 1px solid #c5a059;
          padding: 12px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(38,57,45,0.3);
          transition: 0.2s;
        }
        .box-love-section-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(38,57,45,0.45);
          border-color: #e5cf9f;
        }

        /* ── PROFILE TAB STYLE ─────────────────────────────────────────── */
        .profile-tab-container {
          max-width: 600px;
          margin: 0 auto;
          animation: slideUp 0.3s ease-out;
        }
        .skeleton-profile {
          height: 400px;
          background: rgba(197, 160, 89, 0.15);
          border-radius: 24px;
          animation: pulse 1.5s infinite;
        }
        .profile-details-card {
          background: #faf7f2;
          border: 1px solid rgba(197, 160, 89, 0.4);
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }
        .profile-header-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 28px;
          text-align: center;
        }
        .profile-avatar-large {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          overflow: hidden;
          background: rgba(197, 160, 89, 0.2);
          color: #26392d;
          font-size: 32px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          border: 3px solid #c5a059;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }
        .profile-avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .profile-header-main h2 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 26px;
          font-weight: 700;
          color: #26392d;
          margin: 0 0 6px 0;
        }
        .profile-role-badge {
          background: #26392d;
          color: #faf7f2;
          border: 1px solid #c5a059;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 999px;
          letter-spacing: 0.5px;
        }
        .profile-info-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 28px;
        }
        .profile-info-section {
          background: #ffffff;
          border: 1px solid rgba(197, 160, 89, 0.3);
          border-radius: 16px;
          padding: 16px;
        }
        .profile-info-section h4 {
          font-size: 11px;
          font-weight: 800;
          color: #c5a059;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 12px 0;
          border-bottom: 1px dashed rgba(197, 160, 89, 0.35);
          padding-bottom: 6px;
        }
        .profile-info-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 8px 0;
          font-size: 13px;
        }
        .profile-info-row .label {
          color: #627265;
          font-weight: 600;
          flex-shrink: 0;
          max-width: 120px;
        }
        .profile-info-row .value {
          color: #1f2922;
          font-weight: 700;
          text-align: right;
          flex: 1;
          word-break: break-word;
          line-height: 1.5;
        }
        .profile-insta-link {
          color: #3d5a45;
          text-decoration: none;
          font-weight: 750;
        }
        .profile-insta-link:hover {
          color: #c5a059;
          text-decoration: underline;
        }
        .profile-actions-bottom {
          border-top: 1px solid rgba(197, 160, 89, 0.3);
          padding-top: 20px;
        }
        .profile-edit-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #3d5a45;
          color: white;
          border: 1px solid #c5a059;
          padding: 14px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
        }
        .profile-edit-btn:hover {
          background: #4d7057;
        }
        .profile-pulang-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
          padding: 14px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
        }
        .profile-pulang-btn:hover {
          background: #fee2e2;
        }
        .profile-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #ffffff;
          color: #26392d;
          border: 1px solid rgba(197, 160, 89, 0.4);
          padding: 14px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
        }
        .profile-logout-btn:hover {
          background: #f4efe6;
          border-color: #c5a059;
        }

        /* SweetAlert2 z-index override */
        :global(.swal2-container) { z-index:10000 !important; }
      `}</style>
    </div>
  );
}
