"use client";



import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Link from "next/link";
import { Calendar, Clock, MapPin, ExternalLink, Heart, Sparkles, ArrowLeft, HelpCircle } from "lucide-react";
import PhotoUpload from "@/components/mandiri/PhotoUpload";
import SearchableSelect from "@/components/mandiri/SearchableSelect";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { startDaftarTour, isDaftarTourDone } from "@/lib/tours/tourDaftar";

interface Desa { id: number; nama: string; kota: string; }
interface Kelompok { id: number; nama: string; }

export default function MandiriDaftarPage() {
  useEffect(() => {
    if (!isDaftarTourDone()) {
      const timer = setTimeout(() => {
        startDaftarTour();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const [form, setForm] = useState({
    nama: "",
    jenisKelamin: "L",
    tempatLahir: "",
    tanggalLahir: "",
    alamat: "",
    noTelp: "",
    pendidikan: "",
    pekerjaan: "",
    statusNikah: "Belum Menikah",
    hobi: "",
    makananMinumanFavorit: "",
    suku: "",
    anakKe: "",
    jumlahSaudara: "",
    tinggiBadan: "",
    foto: "",
    mandiriDesaId: "",
    mandiriKelompokId: "",
    instagram: "",
    kriteriaPasangan: "",
    dibayarkanSenilai: "",
    buktiPembayaran: "",
    targetMenikah: "",
  });

  const [daerahList, setDaerahList] = useState<Desa[]>([]);
  const [desaList, setDesaList] = useState<Kelompok[]>([]);
  const [filteredDaerahList, setFilteredDaerahList] = useState<Desa[]>([]);
  const [filteredDesaList, setFilteredDesaList] = useState<Kelompok[]>([]);
  const [kotaList, setKotaList] = useState<string[]>([]);
  const [selectedKota, setSelectedKota] = useState("");
  const [loading, setLoading] = useState(false);
  const [minAgeLaki, setMinAgeLaki] = useState(25);
  const [minAgePerempuan, setMinAgePerempuan] = useState(25);

  const maxDate = new Date();
  const maxDateString = maxDate.toISOString().split("T")[0];

  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [regStatus, setRegStatus] = useState("1");
  const [regTitle, setRegTitle] = useState("");
  const [regDesc, setRegDesc] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [regStatusPeserta, setRegStatusPeserta] = useState("Utusan Daerah");
  const [regGender, setRegGender] = useState("Semua");
  const [agreed, setAgreed] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [uploadingBukti, setUploadingBukti] = useState(false);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleLogoUpdate = () => {
        setSiteLogo((window as any).__SITE_LOGO__ || null);
      };
      handleLogoUpdate();
      window.addEventListener('site-logo-updated', handleLogoUpdate);
      return () => window.removeEventListener('site-logo-updated', handleLogoUpdate);
    }
  }, []);

  useEffect(() => {
    let currentPesertaType = "Utusan Daerah";

    // Determine Peserta Type from URL ONLY
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    if (statusParam && statusParam.toLowerCase() === 'person') {
      setRegStatusPeserta("Person");
      currentPesertaType = "Person";
    } else {
      setRegStatusPeserta("Utusan Daerah");
    }

    fetch("/api/public/mandiri/settings?key=mandiri_registration_status")
      .then((r) => r.json())
      .then((d) => {
        const val = d.value || "1";
        setRegStatus(val);
        const specificClosed =
          (val === "tutup_utusan" && currentPesertaType === "Utusan Daerah") ||
          (val === "tutup_person" && currentPesertaType === "Person");

        if (val === "0" || specificClosed) {
          setIsClosed(true);
        }
      });

    fetch("/api/public/mandiri/settings?key=mandiri_registration_gender")
      .then((r) => r.json())
      .then((d) => {
        if (d.value) {
          setRegGender(d.value);
          if (d.value === "Laki-laki") setForm(prev => ({ ...prev, jenisKelamin: "L" }));
          else if (d.value === "Perempuan") setForm(prev => ({ ...prev, jenisKelamin: "P" }));
        }
      });

    fetch("/api/public/mandiri/settings?key=mandiri_registration_title")
      .then(r => r.json())
      .then(d => {
        if (d.value) setRegTitle(d.value);
      });

    fetch("/api/public/mandiri/settings?key=mandiri_registration_description")
      .then(r => r.json())
      .then(d => {
        if (d.value) setRegDesc(d.value);
      });

    fetch("/api/public/mandiri/settings?key=mandiri_registration_location")
      .then(r => r.json())
      .then(d => {
        if (d.value) setRegLocation(d.value);
      });

    fetch("/api/public/mandiri/settings?key=mandiri_registration_min_age_laki")
      .then(r => r.json())
      .then(d => {
        if (d.value) setMinAgeLaki(parseInt(d.value) || 25);
      });

    fetch("/api/public/mandiri/settings?key=mandiri_registration_min_age_perempuan")
      .then(r => r.json())
      .then(d => {
        if (d.value) setMinAgePerempuan(parseInt(d.value) || 25);
      });

    Promise.all([
      fetch("/api/public/mandiri/desa").then((r) => r.json()),
      fetch("/api/public/mandiri/kelompok").then((r) => r.json()),
    ]).then(([daerahs, desas]) => {
      if (Array.isArray(daerahs)) {
        setDaerahList(daerahs);
        const cities = Array.from(new Set(daerahs.map((d: any) => d.kota))).sort() as string[];
        setKotaList(cities);
      }
      if (Array.isArray(desas)) setDesaList(desas);
    });
  }, []);


  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)", textDecoration: "underline", fontWeight: 600 }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const handleOpenGmaps = (rawInput: string, placeName?: string | null) => {
    if (!rawInput) return;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    const cleanInput = rawInput.trim();
    const isUrl = cleanInput.startsWith("http://") || cleanInput.startsWith("https://");

    if (isUrl) {
      const coordMatch =
        cleanInput.match(/@([-\d.]+),([-\d.]+)/) ||
        cleanInput.match(/[?&]ll=([-\d.]+),([-\d.]+)/) ||
        cleanInput.match(/[?&]q=([-\d.]+),([-\d.]+)/);

      if (coordMatch) {
        const lat = coordMatch[1];
        const lng = coordMatch[2];
        const label = encodeURIComponent(placeName || 'Lokasi Acara');

        if (isIOS) {
          window.location.href = `comgooglemaps://?q=${lat},${lng}&zoom=15`;
          setTimeout(() => {
            window.open(`https://maps.apple.com/?q=${lat},${lng}&ll=${lat},${lng}`, '_blank');
          }, 600);
        } else if (isAndroid) {
          window.location.href = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
        } else {
          window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank', 'noopener,noreferrer');
        }
      } else if (placeName) {
        const encodedPlace = encodeURIComponent(placeName);
        if (isIOS) {
          window.location.href = `comgooglemaps://?q=${encodedPlace}`;
        } else if (isAndroid) {
          window.location.href = `geo:0,0?q=${encodedPlace}`;
        } else {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodedPlace}`, '_blank', 'noopener,noreferrer');
        }
      } else {
        window.open(cleanInput, '_blank', 'noopener,noreferrer');
      }
    } else {
      const encodedPlace = encodeURIComponent(cleanInput);
      if (isIOS) {
        window.location.href = `comgooglemaps://?q=${encodedPlace}`;
      } else if (isAndroid) {
        window.location.href = `geo:0,0?q=${encodedPlace}`;
      } else {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedPlace}`, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const renderEnhancedDescription = (text: string) => {
    if (!text && !regLocation) return null;

    let rawGmapsLoc = regLocation;
    let gmapsMatch = (text || "").match(/Link Gmaps\s*:\s*([^\n]+)/i);
    if (gmapsMatch && gmapsMatch[1]) {
      if (!rawGmapsLoc) rawGmapsLoc = gmapsMatch[1].trim();
    }

    let cleanText = (text || "").replace(/Link Gmaps\s*:\s*[^\n]*/gi, "").trim();
    const urlMatch = cleanText.match(/(https?:\/\/[^\s]+)/);
    if (!rawGmapsLoc && urlMatch) {
      rawGmapsLoc = urlMatch[1];
    }

    const markers = ["Tanggal Acara :", "Waktu Acara :", "Tempat Acara :"];
    const hasMarkers = markers.some(m => cleanText.includes(m));

    if (!hasMarkers) {
      return (
        <div style={{ padding: "0 10px", textAlign: "center" }}>
          {cleanText && (
            <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.6", marginBottom: rawGmapsLoc ? "16px" : "0" }}>
              {renderTextWithLinks(cleanText)}
            </div>
          )}
          {rawGmapsLoc && (
            <button
              type="button"
              onClick={() => handleOpenGmaps(rawGmapsLoc)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--primary)',
                color: 'white',
                padding: '12px 18px',
                borderRadius: '999px',
                fontSize: '14px',
                fontWeight: '700',
                textDecoration: 'none',
                justifyContent: 'center',
                margin: '10px auto 0 auto',
                boxShadow: '0 4px 12px rgba(61, 90, 69, 0.25)',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                maxWidth: '360px'
              }}
            >
              <ExternalLink size={16} /> Lihat Lokasi di Google Maps
            </button>
          )}
        </div>
      );
    }

    let mainText = cleanText;
    let firstMarkerIndex = -1;
    markers.forEach(m => {
      const idx = cleanText.indexOf(m);
      if (idx !== -1 && (firstMarkerIndex === -1 || idx < firstMarkerIndex)) {
        firstMarkerIndex = idx;
      }
    });

    if (firstMarkerIndex !== -1) {
      mainText = cleanText.substring(0, firstMarkerIndex).trim();
    }

    const dateMatch = cleanText.match(/Tanggal Acara\s*:\s*(.*?)(?=\s*(?:Waktu Acara|Tempat Acara|https?:\/\/|$))/);
    const timeMatch = cleanText.match(/Waktu Acara\s*:\s*(.*?)(?=\s*(?:Tanggal Acara|Tempat Acara|https?:\/\/|$))/);
    const placeMatch = cleanText.match(/Tempat Acara\s*:\s*(.*?)(?=\s*(?:Tanggal Acara|Waktu Acara|https?:\/\/|$))/);

    const details = [];
    if (dateMatch) details.push({ icon: Calendar, label: "Tanggal", value: dateMatch[1].trim() });
    if (timeMatch) details.push({ icon: Clock, label: "Waktu", value: timeMatch[1].trim() });
    if (placeMatch) details.push({ icon: MapPin, label: "Tempat", value: placeMatch[1].trim() });

    const effectiveGmapsTarget = rawGmapsLoc || (urlMatch ? urlMatch[1] : null);

    return (
      <div style={{ textAlign: 'left' }}>
        {mainText && (
          <p style={{
            fontSize: "14px",
            color: "var(--text-muted)",
            lineHeight: "1.6",
            padding: "0 10px",
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            {mainText}
          </p>
        )}

        <div style={{
          background: '#faf7f2',
          borderRadius: '18px',
          padding: '20px',
          border: '1px solid var(--border-gold)',
          boxShadow: '0 8px 20px rgba(61, 90, 69, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          margin: '0 10px'
        }}>
          {details.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                background: 'var(--accent-soft)',
                padding: '10px',
                borderRadius: '12px',
                color: 'var(--primary)',
                border: '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
              }}>
                <item.icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginBottom: '2px',
                  marginTop: 0
                }}>
                  {item.label}
                </p>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--primary-dark)',
                  fontWeight: '600',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {item.value}
                </p>
              </div>
            </div>
          ))}

          {effectiveGmapsTarget && (
            <button
              type="button"
              onClick={() => handleOpenGmaps(effectiveGmapsTarget, placeMatch ? placeMatch[1].trim() : null)}
              style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--primary)',
                color: 'white',
                padding: '12px 16px',
                borderRadius: '999px',
                fontSize: '14px',
                fontWeight: '700',
                textDecoration: 'none',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(61, 90, 69, 0.25)',
                border: 'none',
                cursor: 'pointer',
                width: '100%'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary)'}
            >
              <ExternalLink size={16} /> Lihat Lokasi di Google Maps
            </button>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (selectedKota) {
      setFilteredDaerahList(daerahList.filter(d => d.kota === selectedKota));
    } else {
      setFilteredDaerahList([]);
    }
    setForm(prev => ({ ...prev, mandiriDesaId: "", mandiriKelompokId: "" }));
  }, [selectedKota, daerahList]);

  useEffect(() => {
    if (form.mandiriDesaId) {
      setFilteredDesaList(desaList.filter((d: any) => d.mandiriDesaId === Number(form.mandiriDesaId)));
    } else {
      setFilteredDesaList([]);
    }
  }, [form.mandiriDesaId, desaList]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDibayarkanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, dibayarkanSenilai: digitsOnly }));
  };

  const handleBuktiPembayaranChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExts = ["jpg", "jpeg", "png"];
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];

    if (!allowedExts.includes(fileExt) || !allowedMimes.includes(file.type)) {
      Swal.fire({ icon: "error", title: "Format Tidak Didukung", text: "Bukti pembayaran hanya boleh berformat JPEG, JPG, atau PNG." });
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "File Terlalu Besar", text: "Ukuran bukti pembayaran maksimal 10 MB." });
      e.target.value = "";
      return;
    }

    setUploadingBukti(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Gagal mengunggah bukti pembayaran");
      setForm((prev) => ({ ...prev, buktiPembayaran: json.url }));
      Swal.fire({ icon: "success", title: "Bukti Pembayaran Terunggah", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Upload Gagal", text: err.message || "Terjadi kesalahan saat mengunggah bukti pembayaran." });
    } finally {
      setUploadingBukti(false);
      e.target.value = "";
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const missingFields: string[] = [];
      if (!form.nama?.trim()) missingFields.push("Nama Lengkap");
      if (!form.tempatLahir?.trim()) missingFields.push("Kota Tempat Lahir");
      if (!form.tanggalLahir) missingFields.push("Tanggal Lahir");
      if (!form.jenisKelamin) missingFields.push("Jenis Kelamin");
      if (!form.anakKe) missingFields.push("Anak Ke");
      if (!form.jumlahSaudara) missingFields.push("Dari Saudara");
      if (!form.tinggiBadan) missingFields.push("Tinggi Badan");
      if (!form.noTelp?.trim()) missingFields.push("No. Telepon / WhatsApp");
      if (!selectedKota) missingFields.push("Daerah");
      if (!form.mandiriDesaId) missingFields.push("Desa");
      if (!form.mandiriKelompokId) missingFields.push("Kelompok");
      if (!form.pendidikan?.trim()) missingFields.push("Pendidikan Terakhir");
      if (!form.pekerjaan?.trim()) missingFields.push("Pekerjaan");

      if (missingFields.length > 0) {
        Swal.fire({
          icon: "warning",
          title: "Data Belum Lengkap",
          html: `<p style="margin-bottom: 8px;">Kolom wajib berikut belum terisi:</p><ul style="text-align: left; display: inline-block; margin: 0 auto; font-size: 13.5px; color: #dc2626; line-height: 1.6;">${missingFields.map(f => `<li>• <b>${f}</b></li>`).join("")}</ul>`,
        });
        setLoading(false);
        return;
      }

      const cleanNoTelp = form.noTelp.replace(/\D/g, "");
      if (cleanNoTelp.length < 10) {
        Swal.fire({ icon: "warning", title: "Nomor Telepon Tidak Valid", text: "Nomor telepon/WhatsApp minimal harus 10 angka." });
        setLoading(false);
        return;
      }

      if (!form.foto) {
        Swal.fire({ icon: "warning", title: "Foto Belum Ada", text: "Mohon ambil foto atau unggah foto Anda terlebih dahulu." });
        setLoading(false);
        return;
      }

      if (regStatusPeserta === "Person" && (!form.dibayarkanSenilai || !form.buktiPembayaran)) {
        Swal.fire({ icon: "warning", title: "Data Pembayaran Belum Lengkap", text: "Mohon isi nominal yang dibayarkan dan unggah bukti pembayaran." });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/public/mandiri/registrasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          statusPeserta: regStatusPeserta,
          dibayarkanSenilai: regStatusPeserta === "Person" ? Number(form.dibayarkanSenilai) : undefined,
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.status === "quota_full") {
        Swal.fire({
          icon: "warning",
          title: "Kuota Daerah Penuh",
          html: `<p>${data.error}</p><span style="font-size: 13px; color: #64748b;">Harap lapor kepada Tim PNKB/Ibu Gambuh untuk informasi lebih lanjut.</span>`,
          confirmButtonText: "Mengerti",
          confirmButtonColor: "#f59e0b"
        });
        setLoading(false);
        return;
      }

      if (data.isAlreadyRegistered) {
        setSuccess(true);
        setResult({ ...data, alreadyExists: true });
        return;
      }

      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");

      setSuccess(true);
      setResult(data);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <WaitingRoom result={result} />
    );
  }

  function WaitingRoom({ result }: { result: any }) {
    const [status, setStatus] = useState<string>("waiting");
    const [kegiatanJudul, setKegiatanJudul] = useState<string>("");
    const [qrDataUrl, setQrDataUrl] = useState<string>("");

    useEffect(() => {
      if (!result?.nomorUnik) return;
      QRCode.toDataURL(result.nomorUnik, { margin: 2, width: 400 })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error("Error generating QR code:", err));
    }, [result]);

    useEffect(() => {
      if (!result) return;

      const initSuccess = async () => {
        if (result.alreadyExists) {
          await Swal.fire({
            icon: "info",
            title: "Sudah Terdaftar",
            text: "Anda sudah terdaftar sebagai peserta sebelumnya.",
            confirmButtonColor: "#3d5a45",
            confirmButtonText: "Oke"
          });
        } else {
          await Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "Data Anda telah tercatat.",
            confirmButtonColor: "#3d5a45",
            confirmButtonText: "Oke"
          });
        }
        // Automatically download the PDF ticket on successful registration after OK is clicked
        handleDownload();
      };

      initSuccess();
    }, [result]);

    useEffect(() => {
      if (!result?.nomorUnik) return;

      const checkStatus = async () => {
        try {
          let deviceId = localStorage.getItem("mandiri_device_id");
          if (!deviceId) {
            deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem("mandiri_device_id", deviceId);
          }
          const res = await fetch(`/api/public/mandiri/katalog/check-status?nomorUnik=${result.nomorUnik}&deviceId=${deviceId}`);
          const data = await res.json();
          if (data.status === "attended") {
            setStatus("attended");
            setKegiatanJudul(data.kegiatanJudul);
            localStorage.setItem("attended_nomor_unik", data.nomorUnik || result.nomorUnik);
            localStorage.setItem("attended_session_token", data.sessionToken);
            Swal.fire({
              icon: "success",
              title: "Konfirmasi Berhasil!",
              text: `Kehadiran Anda di "${data.kegiatanJudul}" telah dicatat. Anda sekarang dapat mengakses katalog.`,
              confirmButtonText: "Buka Katalog",
              timer: 5000,
              timerProgressBar: true
            });
          }
        } catch (err) {
          console.error("Status check error:", err);
        }
      };

      // Execute once only (1 hit check)
      if (status !== "attended") {
        checkStatus();
      }
    }, [result]);

    const handleDownload = async () => {
      Swal.fire({
        title: "Membuat PDF...",
        text: "Menyiapkan Kartu Peserta Pashmina...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [90, 180]
        });

        const displayName = result?.nama || "Peserta Mandiri";
        const displayKegiatan = regTitle || "Pashmina 8.0";
        const displayNomorUrut = result?.nomorUrut || "";
        const displayNomorUnik = result?.nomorUnik || "";

        // Load logo
        let logoDataUrl: string | null = null;
        try {
          logoDataUrl = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              try {
                const c = document.createElement("canvas");
                c.width = img.width;
                c.height = img.height;
                const ctx = c.getContext("2d");
                ctx?.drawImage(img, 0, 0);
                resolve(c.toDataURL("image/png"));
              } catch {
                resolve(null);
              }
            };
            img.onerror = () => resolve(null);
            img.src = "/img/pashmina-logo.png?v=8";
          });
        } catch {
          logoDataUrl = null;
        }

        // 1. Base card background (Warm Ivory)
        doc.setFillColor(253, 251, 247);
        doc.rect(0, 0, 90, 180, "F");

        // 2. Elegant double gold border
        doc.setDrawColor(212, 185, 138); // Border gold
        doc.setLineWidth(0.6);
        doc.rect(2.5, 2.5, 85, 175, "D");

        doc.setDrawColor(235, 220, 190); // Inner hairline gold
        doc.setLineWidth(0.25);
        doc.rect(3.8, 3.8, 82.4, 172.4, "D");

        // 3. Header background (Deep Forest Pine)
        doc.setFillColor(31, 46, 36);
        doc.rect(2.5, 2.5, 85, 29, "F");

        // Gold divider strip below header
        doc.setFillColor(197, 160, 89);
        doc.rect(2.5, 31.5, 85, 0.8, "F");

        // Header text & branding
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, "PNG", 5.5, 7.5, 18, 18);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.5);
          doc.setTextColor(212, 185, 138);
          doc.text("PROGRAM RESMI USIA MANDIRI", 55, 9, { align: "center" });

          doc.setFont("times", "bold");
          doc.setFontSize(13);
          doc.setTextColor(255, 255, 255);
          doc.text("PASHMINA 8.0", 55, 15, { align: "center" });

          doc.setFont("times", "italic");
          doc.setFontSize(6.5);
          doc.setTextColor(235, 220, 190);
          doc.text("Pertemuan Dua Hati Teriring Ridho Ilahi", 55, 19.5, { align: "center" });

          doc.setFont("helvetica", "bold");
          doc.setFontSize(6);
          doc.setTextColor(180, 205, 190);
          const kegStr = (displayKegiatan || "Pashmina 8.0").toUpperCase();
          doc.text(kegStr.length > 32 ? kegStr.substring(0, 32) + "..." : kegStr, 55, 25, { align: "center" });
        } else {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6);
          doc.setTextColor(212, 185, 138);
          doc.text("PROGRAM RESMI USIA MANDIRI", 45, 9, { align: "center" });

          doc.setFont("times", "bold");
          doc.setFontSize(14);
          doc.setTextColor(255, 255, 255);
          doc.text("PASHMINA 8.0", 45, 15.5, { align: "center" });

          doc.setFont("times", "italic");
          doc.setFontSize(7.5);
          doc.setTextColor(235, 220, 190);
          doc.text("Pertemuan Dua Hati Teriring Ridho Ilahi", 45, 20.5, { align: "center" });

          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(180, 205, 190);
          const kegStr = (displayKegiatan || "Pashmina 8.0").toUpperCase();
          doc.text(kegStr.length > 38 ? kegStr.substring(0, 38) + "..." : kegStr, 45, 26, { align: "center" });
        }

        // 4. Participant Box (White Card with Gold Border)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(218, 198, 160);
        doc.setLineWidth(0.3);
        doc.roundedRect(6, 35, 78, 43, 3, 3, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(160, 130, 75);
        doc.text("NOMOR URUT PESERTA", 45, 41, { align: "center" });

        doc.setFont("times", "bold");
        doc.setFontSize(22);
        doc.setTextColor(45, 75, 55);
        doc.text(`#${displayNomorUrut}`, 45, 49, { align: "center" });

        doc.setFont("times", "bold");
        doc.setFontSize(11);
        doc.setTextColor(23, 36, 27);
        const splitName = doc.splitTextToSize(displayName.toUpperCase(), 72);
        doc.text(splitName, 45, 55, { align: "center" });

        // ID Login Pill
        doc.setFillColor(243, 247, 244);
        doc.setDrawColor(197, 160, 89);
        doc.setLineWidth(0.35);
        doc.roundedRect(16, 64, 58, 9.5, 4.5, 4.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(38, 57, 45);
        doc.text(`ID LOGIN: ${displayNomorUnik}`, 45, 70.5, { align: "center" });

        // 5. Dashed Separator
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.setDrawColor(212, 185, 138);
        doc.line(10, 81.5, 80, 81.5);
        doc.setLineDashPattern([], 0);

        // 6. QR Code Container
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(218, 198, 160);
        doc.setLineWidth(0.3);
        doc.roundedRect(26, 84, 38, 38, 3, 3, "FD");

        const qrBase64 = await QRCode.toDataURL(displayNomorUnik, { margin: 2, width: 400 });
        doc.addImage(qrBase64, "PNG", 28, 86, 34, 34);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(115, 125, 118);
        doc.text("Tunjukkan Barcode / QR saat absensi di meja panitia", 45, 125.5, { align: "center" });

        // 7. Barcode CODE128
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, displayNomorUnik, {
          format: "CODE128",
          width: 2,
          height: 38,
          displayValue: true,
          fontSize: 10,
          textMargin: 2
        });
        const barcodeDataUrl = canvas.toDataURL("image/png");
        doc.addImage(barcodeDataUrl, "PNG", 16, 128, 58, 15);

        // 8. Bottom Information Box
        {
          // Standard Footer
          doc.setFillColor(245, 242, 235);
          doc.setDrawColor(212, 185, 138);
          doc.setLineWidth(0.3);
          doc.roundedRect(6, 146, 78, 28, 2.5, 2.5, "FD");

          doc.setFont("times", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(38, 57, 45);
          doc.text("PORTAL KATALOG PESERTA MANDIRI", 45, 152.5, { align: "center" });

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(150, 110, 40);
          doc.text("https://gencar.my.id/mandiri/katalog", 45, 157.5, { align: "center" });

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6);
          doc.setTextColor(100, 105, 100);
          doc.text("Petunjuk Akses Katalog:", 45, 163, { align: "center" });
          doc.text("1. Selesaikan absensi di meja panitia pelaksana", 45, 166.5, { align: "center" });
          doc.text("2. Buka link di atas & masuk dengan ID Login Anda", 45, 170, { align: "center" });
        }

        // Save PDF
        doc.save(`KARTU_PASHMINA_${displayNomorUrut || displayNomorUnik}.pdf`);
        Swal.close();
      } catch (error) {
        console.error("PDF download error:", error);
        Swal.fire({
          icon: "error",
          title: "Gagal Mengunduh PDF",
          text: "Terjadi kesalahan saat memproses data PDF."
        });
      }
    };

    return (
      <div className="portal-root daftar-page-root">
        <div className="arabesque-bg-layer" aria-hidden="true" />
        <div className="ambient-glow-layer" aria-hidden="true" />
        <main className="daftar-main-container">
          <div className="daftar-top-nav" style={{ maxWidth: "540px" }}>
            <Link href="/" className="daftar-back-btn">
              <ArrowLeft size={14} />
              <span className="btn-text-full">Kembali ke Beranda</span>
              <span className="btn-text-short">Beranda</span>
            </Link>
          </div>
          <div className="daftar-card" style={{ maxWidth: "540px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🤲</div>
            <h2 className="daftar-title" style={{ marginBottom: "10px" }}>Pendaftaran Sukses!</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
              Alhamdulillah, pendaftaran berhasil tercatat! Silakan simpan <b>Barcode</b> atau <b>ID Login</b> ini untuk konfirmasi kehadiran (absensi) di meja panitia.
            </p>

            <div className="ticket-box-sacred">
              <p style={{ fontSize: "11px", color: "var(--accent)", margin: "0 0 4px 0", textTransform: "uppercase", fontWeight: "700", letterSpacing: "1.5px" }}>Nomor Urut Peserta</p>
              <h3 className="ticket-participant-no">#{result?.nomorUrut}</h3>
              <p style={{ fontSize: "18px", fontWeight: "700", color: "var(--primary-dark)", margin: "4px 0 10px 0", textTransform: "capitalize" }}>{result?.nama}</p>
              <div className="ticket-id-pill">ID Login: {result?.nomorUnik}</div>

              {/* QR Code Section */}
              <div style={{
                background: "#fdfbf7",
                padding: "20px",
                borderRadius: "20px",
                border: "1px solid var(--border-gold)",
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: "0 10px 24px rgba(61, 90, 69, 0.06)"
              }}>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code Peserta"
                    style={{ width: "220px", height: "220px", borderRadius: "12px", border: "4px solid white" }}
                  />
                ) : (
                  <div style={{ width: "220px", height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    Memuat QR Code...
                  </div>
                )}
              </div>

              {/* Big download PDF button */}
              <button
                onClick={handleDownload}
                className="btn-pdf-ticket"
              >
                📥 Simpan PDF Tiket Peserta
              </button>
            </div>

            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", background: "#faf7f2", padding: "16px", borderRadius: "14px", lineHeight: "1.6", border: "1px solid var(--border-gold)" }}>
              Setelah menyelesaikan proses absensi di meja registrasi, Anda dapat login menggunakan <b>ID Login</b> di atas untuk mulai menelusuri katalog peserta.
            </p>

            <Link href="/mandiri/katalog" className="btn-katalog-open">
              <Heart size={16} fill="currentColor" />
              <span>Buka Katalog Peserta Mandiri</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="portal-root daftar-page-root">
        <div className="arabesque-bg-layer" aria-hidden="true" />
        <div className="ambient-glow-layer" aria-hidden="true" />
        <main className="daftar-main-container">
          <div className="daftar-top-nav" style={{ maxWidth: "520px" }}>
            <Link href="/" className="daftar-back-btn">
              <ArrowLeft size={14} />
              <span className="btn-text-full">Kembali ke Beranda</span>
              <span className="btn-text-short">Beranda</span>
            </Link>
          </div>
          <div className="daftar-card" style={{ maxWidth: "520px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>⌛</div>
            <h2 className="daftar-title" style={{ marginBottom: "10px" }}>Pendaftaran Ditutup</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14.5px", lineHeight: "1.6", marginBottom: "20px" }}>
              Mohon maaf, pendaftaran peserta untuk sesi ini telah ditutup oleh panitia pelaksana.
            </p>
            <div style={{ background: "#faf7f2", border: "1px solid var(--border-gold)", borderRadius: "14px", padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "13.5px", color: "var(--text-main)", margin: 0, lineHeight: "1.6" }}>
                <strong>{regTitle || "Pashmina 8.0"}</strong><br />
                Pendaftaran telah mencapai batas kuota atau melewati tenggat waktu yang ditentukan.<br />
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Silakan pantau pengumuman resmi dari Tim Gambuh daerah Anda.</span>
              </p>
            </div>

            <Link href="/" className="btn-katalog-open" style={{ marginTop: "24px" }}>
              Kembali ke Beranda Utama
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="portal-root daftar-page-root">
      <div className="arabesque-bg-layer" aria-hidden="true" />
      <div className="ambient-glow-layer" aria-hidden="true" />

      <main className="daftar-main-container">
        <div className="daftar-top-nav">
          <Link href="/" className="daftar-back-btn">
            <ArrowLeft size={14} />
            <span className="btn-text-full">Kembali ke Beranda</span>
            <span className="btn-text-short">Beranda</span>
          </Link>
          <button
            type="button"
            className="daftar-login-btn"
            onClick={() => startDaftarTour({ force: true })}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fef3c7", color: "#92400e", borderColor: "#fde68a", cursor: "pointer", marginRight: "8px" }}
            title="Buka panduan cara pengisian formulir pendaftaran"
          >
            <HelpCircle size={14} />
            <span>Panduan Daftar</span>
          </button>
          <Link href="/mandiri/katalog/login" className="daftar-login-btn">
            <span className="btn-text-full">Sudah punya ID? <strong>Masuk Katalog &rarr;</strong></span>
            <span className="btn-text-short"><strong>Masuk Katalog &rarr;</strong></span>
          </Link>
        </div>

        <div className="daftar-card">
          <div className="daftar-header-block">
            <div className="daftar-badge-top">
              <img
                src="/img/pashmina-logo.png?v=8"
                alt="Pashmina 8.0"
                style={{ height: "24px", width: "auto" }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span className="daftar-badge-text">Program Resmi Usia Mandiri &middot; Pashmina 8.0</span>
            </div>

            <h1 className="daftar-title">
              {regTitle || "Pendaftaran Peserta Mandiri"}
            </h1>

            {regDesc ? (
              renderEnhancedDescription(regDesc)
            ) : (
              <p className="daftar-subheading">
                Lengkapi formulir biodata dengan cermat dan jujur sebagai ikhtiar mulia menuju separuh agama.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div id="tour-daftar-foto" className="form-group" style={{ textAlign: "center" }}>
                <PhotoUpload
                  value={form.foto}
                  onChange={(url) => setForm(prev => ({ ...prev, foto: url }))}
                  helperText="Kirim foto yang terbaik & terbaru, foto bebas, dan muka tampak jelas (tidak tertutup masker)"
                  maxSizeMb={10}
                />
              </div>

              {/* --- SEKSI 1: INFORMASI PRIBADI --- */}
              <h3 id="tour-daftar-identitas" className="daftar-section-header" style={{ marginTop: "10px", marginBottom: "16px" }}>Informasi Pribadi</h3>

            <div className="form-group">
              <label className="form-label">Nama Lengkap <span className="required">*</span></label>
              <input name="nama" className="form-control" value={form.nama} onChange={handleChange} required placeholder="Masukkan nama lengkap" />
              <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Contoh Format Penulisan: Raka Gladhi Pratama (Tanpa disingkat dan huruf kapital pada setiap awal kata)
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Kota Tempat Lahir <span className="required">*</span></label>
                <input name="tempatLahir" className="form-control" value={form.tempatLahir} onChange={handleChange} required placeholder="Kota kelahiran" />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Lahir <span className="required">*</span></label>
                <input
                  name="tanggalLahir"
                  type="date"
                  className="form-control"
                  value={form.tanggalLahir}
                  onChange={handleChange}
                  onFocus={(e) => {
                    if (!form.tanggalLahir) {
                      setForm(prev => ({ ...prev, tanggalLahir: maxDateString }));
                    }
                  }}
                  onClick={(e) => {
                    if (!form.tanggalLahir) {
                      setForm(prev => ({ ...prev, tanggalLahir: maxDateString }));
                    }
                  }}
                  required
                  max={maxDateString}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Jenis Kelamin <span className="required">*</span></label>
                <select name="jenisKelamin" className="form-control" value={form.jenisKelamin} onChange={handleChange} required>
                  {regGender !== "Perempuan" && <option value="L">Laki-laki</option>}
                  {regGender !== "Laki-laki" && <option value="P">Perempuan</option>}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Suku (Opsional)</label>
                <input name="suku" className="form-control" value={form.suku} onChange={handleChange} placeholder="Betawi / Jawa / dll" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Anak Ke <span className="required">*</span></label>
                <input type="number" name="anakKe" className="form-control" value={form.anakKe} onChange={handleChange} required placeholder="Contoh: 1" min={1} />
              </div>
              <div className="form-group">
                <label className="form-label">Dari Saudara <span className="required">*</span></label>
                <input type="number" name="jumlahSaudara" className="form-control" value={form.jumlahSaudara} onChange={handleChange} required placeholder="Contoh: 3" min={1} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tinggi Badan (cm) <span className="required">*</span></label>
              <input type="number" name="tinggiBadan" className="form-control" value={form.tinggiBadan} onChange={handleChange} required placeholder="Contoh: 165" min={100} max={250} />
            </div>

            {/* --- SEKSI 2: KONTAK & DOMISILI --- */}
            <h3 className="daftar-section-header" style={{ marginTop: "24px", marginBottom: "16px" }}>Kontak & Domisili</h3>

            <div className="form-group">
              <label className="form-label">No. Telepon / WhatsApp <span className="required">*</span></label>
              <input type="tel" name="noTelp" className="form-control" value={form.noTelp} onChange={handleChange} required minLength={10} placeholder="08xx-xxxx-xxxx" pattern="[0-9]*" inputMode="numeric" />
              <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.3" }}>
                Minimal 10 angka. Nomor ini tidak akan disebarluaskan, hanya untuk keperluan komunikasi antara peserta dengan panitia.
              </p>
            </div>

            <div id="tour-daftar-wilayah" className="form-row">
              <div className="form-group">
                <label className="form-label">Daerah <span className="required">*</span></label>
                <SearchableSelect
                  placeholder="Pilih Daerah..."
                  options={kotaList.map(k => ({ id: k, name: k }))}
                  value={selectedKota}
                  onChange={(val) => setSelectedKota(val)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Desa <span className="required">*</span></label>
                <SearchableSelect
                  placeholder="Pilih Desa..."
                  options={filteredDaerahList.map(d => ({ id: d.id, name: d.nama }))}
                  value={form.mandiriDesaId}
                  onChange={(val) => {
                    setForm(prev => ({ ...prev, mandiriDesaId: val, mandiriKelompokId: "" }));
                  }}
                  disabled={!selectedKota}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Kelompok <span className="required">*</span></label>
              <SearchableSelect
                placeholder="Pilih Kelompok..."
                options={filteredDesaList.map(k => ({ id: k.id, name: k.nama }))}
                value={form.mandiriKelompokId}
                onChange={(val) => {
                  setForm(prev => ({ ...prev, mandiriKelompokId: val }));
                }}
                disabled={!form.mandiriDesaId}
              />
            </div>


            {/* --- SEKSI 3: LATAR BELAKANG --- */}
            <h3 className="daftar-section-header" style={{ marginTop: "24px", marginBottom: "16px" }}>Latar Belakang & Minat</h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pendidikan Terakhir <span className="required">*</span></label>
                <input name="pendidikan" className="form-control" value={form.pendidikan} onChange={handleChange} required placeholder="S1/SMA/dll" />
                <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Contoh Penulisan: S1 - Psikologi atau SMA - IPA
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Pekerjaan <span className="required">*</span></label>
                <input name="pekerjaan" className="form-control" value={form.pekerjaan} onChange={handleChange} required placeholder="Pekerjaan saat ini" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Hobi (Opsional)</label>
                <input name="hobi" className="form-control" value={form.hobi} onChange={handleChange} placeholder="Hobi anda" />
              </div>
              <div className="form-group">
                <label className="form-label">Favorit Makanan/Minuman (Opsional)</label>
                <input name="makananMinumanFavorit" className="form-control" value={form.makananMinumanFavorit} onChange={handleChange} placeholder="Sate / Jus / dll" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Akun Instagram (Opsional)</label>
              <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", color: "var(--text-muted)" }}>@</span>
                <input
                  name="instagram"
                  className="form-control"
                  value={form.instagram}
                  onChange={handleChange}
                  placeholder="username_kamu"
                  style={{ paddingLeft: "32px" }}
                />
              </div>
              <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Gunakan username Instagram tanpa simbol @.
              </p>
            </div>

            <div id="tour-daftar-kriteria" className="form-group">
              <label className="form-label">Kriteria Pasangan (Opsional)</label>
              <textarea
                name="kriteriaPasangan"
                className="form-control"
                value={form.kriteriaPasangan}
                onChange={handleChange}
                placeholder="Kriteria pasangan yang diinginkan (contoh: mandiri, sholeh/sholehah, suka membaca, dll.)"
                rows={3}
              />
            </div>
            
            {(() => {
              let isUnderage = false;
              if (form.tanggalLahir) {
                const lahir = new Date(form.tanggalLahir);
                const sekarang = new Date();
                let umurTahun = sekarang.getFullYear() - lahir.getFullYear();
                const belumUlangTahun = sekarang.getMonth() < lahir.getMonth() || (sekarang.getMonth() === lahir.getMonth() && sekarang.getDate() < lahir.getDate());
                if (belumUlangTahun) umurTahun--;

                if (form.jenisKelamin === "L") {
                  isUnderage = umurTahun < minAgeLaki;
                } else if (form.jenisKelamin === "P") {
                  isUnderage = umurTahun < minAgePerempuan;
                }
              }
              
              return (
                 <div className="form-group">
                   <label className="form-label">
                     Target Menikah {isUnderage ? <span className="required">* (Wajib karena belum cukup umur)</span> : "(Opsional)"}
                   </label>
                   <select
                     name="targetMenikah"
                     className="form-control"
                     value={form.targetMenikah}
                     onChange={handleChange}
                     required={isUnderage}
                   >
                     <option value="">-- Pilih Target Menikah --</option>
                     {Array.from({ length: 15 }, (_, i) => 2026 + i).map(year => (
                       <option key={year} value={String(year)}>{year}</option>
                     ))}
                   </select>
                 </div>
              );
            })()}

            {regStatusPeserta === "Person" && (
              <div className="form-group" style={{ padding: "15px", background: "#fffbeb", borderRadius: "10px", border: "1px solid #fde68a" }}>
                <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#92400e" }}>Informasi Pembayaran</h4>

                <div style={{ marginBottom: "16px", padding: "12px", background: "#fef3c7", borderRadius: "8px", fontSize: "13px", color: "#92400e", lineHeight: "1.5", border: "1px dashed #fbbf24" }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>Silakan transfer ke rekening berikut:</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "6px 0" }}>
                    <p style={{ margin: 0, fontSize: "16px", fontWeight: 800, letterSpacing: "1px", color: "#b45309" }}>379601007016501</p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("379601007016501");
                        Swal.fire({ icon: "success", title: "Tersalin", text: "Nomor rekening berhasil disalin!", timer: 1500, showConfirmButton: false, width: "300px" });
                      }}
                      style={{ padding: "4px 10px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.2s ease" }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#d97706"}
                      onMouseOut={(e) => e.currentTarget.style.background = "#f59e0b"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      Salin
                    </button>
                  </div>
                  <p style={{ margin: 0 }}>Bank BRI<br />a.n. Aos Burhanudin</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Dibayarkan Senilai <span className="required">*</span></label>
                  <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", color: "var(--text-muted)", fontWeight: 600 }}>Rp</span>
                    <input
                      name="dibayarkanSenilai"
                      className="form-control"
                      inputMode="numeric"
                      value={form.dibayarkanSenilai ? Number(form.dibayarkanSenilai).toLocaleString("id-ID") : ""}
                      onChange={handleDibayarkanChange}
                      required={regStatusPeserta === "Person"}
                      placeholder="0"
                      style={{ paddingLeft: "34px" }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Bukti Pembayaran <span className="required">*</span></label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleBuktiPembayaranChange}
                    disabled={uploadingBukti}
                    required={regStatusPeserta === "Person" && !form.buktiPembayaran}
                  />
                  <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Format JPEG, JPG, atau PNG. Ukuran maksimal 10 MB.
                  </p>
                  {uploadingBukti && (
                    <p style={{ fontSize: "12px", color: "#3b82f6", marginTop: "6px" }}>Mengunggah...</p>
                  )}
                  {form.buktiPembayaran && !uploadingBukti && (
                    <div style={{ marginTop: "10px" }}>
                      <img src={form.buktiPembayaran} alt="Bukti Pembayaran" style={{ maxWidth: "160px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group" style={{ padding: "16px 18px", background: "#faf7f2", borderRadius: "14px", border: "1px solid var(--border-gold)" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  id="agree-check"
                  style={{ transform: "scale(1.2)", marginTop: "3px", accentColor: "var(--primary)" }}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  required
                />
                <label htmlFor="agree-check" style={{ fontSize: "13px", cursor: "pointer", fontWeight: "700", color: "var(--primary-dark)" }}>
                  Saya menyatakan Setuju & Sanggup:
                </label>
              </div>
              <ol style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "10px", paddingLeft: "35px", marginBottom: 0, lineHeight: "1.6" }}>
                <li>Sanggup mengikuti seluruh rangkaian acara dan menaati tata tertib syar&apos;i yang ditentukan.</li>
                <li>Menyetujui penyebarluasan data diri kepada Tim PNKB dan Peserta {regTitle || "Kegiatan"} untuk keperluan acara.</li>
              </ol>
            </div>

            <button id="tour-daftar-submit" type="submit" className="btn-submit-pashmina" disabled={loading || !agreed}>
              <Heart size={18} fill="#17241b" />
              <span>{loading ? "Menyimpan Pendaftaran..." : "Kirim Formulir Pendaftaran Peserta"}</span>
            </button>

            <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "-6px" }}>
              Dengan mengeklik tombol di atas, Anda menyatakan bahwa data yang diberikan adalah benar dan amanah.
            </p>
          </div>
        </form>
      </div>
    </main>
  </div>
  );
}

