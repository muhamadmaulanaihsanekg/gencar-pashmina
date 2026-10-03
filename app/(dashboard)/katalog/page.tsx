"use client";




import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { GenerusItem } from "@/lib/types";
import Link from "next/link";
import {
  Sparkles, Search, User, MapPin, Phone, GraduationCap,
  Briefcase, Heart, Globe, Calendar, Lock, Star,
  Music, Utensils, ClipboardList, Download, EyeOff,
  ChevronDown, Settings2, Users, Instagram, X
} from "lucide-react";

export default function GenerusKatalogPage() {
  const [data, setData] = useState<GenerusItem[]>([]);
  const [myProfile, setMyProfile] = useState<GenerusItem | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [gender, setGender] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pendidikan, setPendidikan] = useState("all");
  const [pendidikanList, setPendidikanList] = useState<string[]>([]);
  const [regionList, setRegionList] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authorizedChecked, setAuthorizedChecked] = useState(false);
  const [latestActivity, setLatestActivity] = useState<any>(null);
  const [selections, setSelections] = useState<any[]>([]);
  const [publicStatus, setPublicStatus] = useState<string>("closed");
  const [kegiatanList, setKegiatanList] = useState<{ id: string; judul: string; kota: string }[]>([]);
  const [selectedKegiatanId, setSelectedKegiatanId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<GenerusItem | null>(null);

  const limit = 12;
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const isAdminRole = ["admin", "pengurus_daerah", "tim_pnkb", "admin_romantic_room", "kmm_daerah"].includes(myProfile?.role || "");

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search,
        jenisKelamin: gender,
        status: status,
        pendidikan: pendidikan,
        mandiriDesaId: selectedRegion,
        mandiriOnly: "true",
        ...(isAdminRole ? { all: "true" } : {}),
        ...(selectedKegiatanId ? { kegiatanId: selectedKegiatanId } : {}),
      });
      const res = await fetch(`/api/generus?${params}`, { cache: "no-store" });

      if (!res.ok) {
        throw new Error("Gagal mengambil data");
      }

      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);

      // Fetch selections
      const selRes = await fetch(`/api/mandiri/pilih`);
      if (selRes.ok) {
        const selJson = await selRes.json();
        setSelections(selJson);
      }
    } catch (e: any) {
      console.error("fetchData error:", e);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, search, page, gender, status, pendidikan, selectedRegion, myProfile, selectedKegiatanId]);

  useEffect(() => {
    async function init() {
      try {
        const profileRes = await fetch("/api/profile", { cache: "no-store" });
        if (!profileRes.ok) throw new Error("Gagal mengambil profil");
        const profileJson = await profileRes.json();
        setMyProfile(profileJson);
        setIsAuthorized(!!profileJson.isInPdkt || ["generus", "tim_pnkb", "admin", "kmm_daerah", "pengurus_daerah", "admin_romantic_room", "desa", "kelompok", "admin_keuangan", "admin_kegiatan"].includes(profileJson.role));

        if (profileJson.role !== "admin" && profileJson.jenisKelamin) {
          setGender(profileJson.jenisKelamin === "L" ? "P" : "L");
        }

        // Fetch activity info + kegiatan list
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

        // Fetch dynamic filters
        const filterRes = await fetch("/api/generus/filters", { cache: "no-store" });
        if (filterRes.ok) {
          const filterJson = await filterRes.json();
          setPendidikanList(filterJson.pendidikan || []);
          setRegionList(filterJson.regions || []);
        }
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setAuthorizedChecked(true);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDetail(null);
    };
    if (selectedDetail) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedDetail]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handlePilih = async (targetId: string) => {
    if (!myProfile?.id) {
      Swal.fire("Info", "Akun Anda tidak terhubung dengan profil Generus", "info");
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: "Pilih Peserta?",
      text: "Anda akan memilih peserta ini untuk melakukan pertemuan PDKT. Maksimal 3 pilihan.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Pilih",
      cancelButtonText: "Batal"
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/mandiri/pilih", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      await Swal.fire({
        title: "Berhasil!",
        text: "Peserta berhasil dipilih. Mari beralih ke Antrean Panggilan.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });

      router.push("/mandiri/panggilan");
    } catch (err: any) {
      Swal.fire("Gagal", err.message, "error");
    }
  };

  if (loading && !authorizedChecked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (authorizedChecked && !isAuthorized) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mb-6">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Akses Terbatas</h2>
        <p className="text-slate-500 mb-8 max-w-sm text-center">
          Halaman ini hanya dapat diakses oleh pengguna yang sudah terdaftar dalam <b>Daftar Peserta</b>.
        </p>
        <Link href="/dashboard" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="pdkt-admin-container">
      <div className="header-section">
        <div className="top-badge">
          <ChevronDown size={12} className="rotate-180" />
          <span>DATA PESERTA</span>
        </div>
        <h1>PESERTA <span>MANDIRI</span></h1>
        <p className="subtitle">{kegiatanList.find(k => k.id === selectedKegiatanId)?.judul || latestActivity?.judul || "PDKT 2.0 (Persiapan Nikah Ke Daerah)"}</p>

        {publicStatus === "closed" && (
          <div className="katalog-status-badge">
            <EyeOff size={14} />
            <span>Katalog: Hidden / Nonaktif</span>
          </div>
        )}
      </div>

      <div className="toolbar-section">
        <div className="search-group">
          <div className="search-input-wrapper">
            <Search size={18} className="icon-search" />
            <input
              type="text"
              placeholder="Cari nama, no. urut..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button 
            className={`btn-advanced-search ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Settings2 size={16} />
            <span>Filter</span>
          </button>
        </div>

        {showFilters && (
          <div className="filters-group">
            {(!myProfile || myProfile.role === "admin" || !myProfile.jenisKelamin) && (
              <div className="pill-group">
                <button className={gender === "all" ? "active" : ""} onClick={() => { setGender("all"); setPage(1); }}>Semua JK</button>
                <button className={gender === "L" ? "active" : ""} onClick={() => { setGender("L"); setPage(1); }}>Laki-Laki</button>
                <button className={gender === "P" ? "active" : ""} onClick={() => { setGender("P"); setPage(1); }}>Perempuan</button>
              </div>
            )}

            <div className="pill-group">
              <button className={status === "all" ? "active" : ""} onClick={() => { setStatus("all"); setPage(1); }}>Semua Status</button>
              <button className={status === "peserta" ? "active" : ""} onClick={() => { setStatus("peserta"); setPage(1); }}>Peserta</button>
              <button className={status === "unlinked" ? "active" : ""} onClick={() => { setStatus("unlinked"); setPage(1); }}>Belum Sinkron</button>
            </div>

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
            </div>

            <div className="select-box-wrapper">
              <select 
                className="dropdown-box"
                value={selectedRegion}
                onChange={(e) => { setSelectedRegion(e.target.value); setPage(1); }}
              >
                <option value="all">Semua Wilayah</option>
                {regionList.map(r => (
                  <option key={r.id} value={r.id}>{r.kota} - {r.nama}</option>
                ))}
              </select>
            </div>

            {kegiatanList.length > 1 && (
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
              </div>
            )}

            <div className="total-badge">
              <Users size={14} />
              <span>Total: <b>{total} Generus</b></span>
            </div>

            <button className="btn-export" onClick={() => window.print()}>
              <Download size={16} />
              <span>Export PDF</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid-section">
        {loading && data.length === 0 ? (
          [...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)
        ) : (
          data.filter(item => item.id !== myProfile?.generusId && item.id !== myProfile?.id).map((item) => (
            <div
              key={item.id}
              className={`participant-card gender-${item.jenisKelamin?.toLowerCase()}`}
              onClick={() => setSelectedDetail(item)}
              style={{ cursor: "pointer" }}
            >
              <div className="card-top">
                <div className="avatar-side">
                  {item.foto ? <img src={item.foto} alt={item.nama} /> : <div className="initials">{item.nama.charAt(0)}</div>}
                  <div className="role-tag">
                    {["admin", "tim_pnkb", "admin_romantic_room"].includes(item.role || "") ? "Panitia" : "PESERTA"}
                  </div>
                </div>
                <div className="info-side">
                  <div className="name-header">
                    <h3 className="name">{item.nama}</h3>
                    <span className="no-urut">#{item.nomorUrut || "-"}</span>
                  </div>
                  <div className="id-text">ID: {item.nomorUnik}</div>
                  <div className="region-info">
                    <span className="label">Asal Daerah:</span> {item.mandiriDesaNama || item.desaNama}
                  </div>
                  <div className="region-info">
                    <span className="label">Nama Desa:</span> {item.mandiriKelompokNama || item.kelompokNama}
                  </div>

                  <div className="floating-meta">
                    <div className="meta-item age">
                      <User size={12} />
                      <span>Umur: <b>{calculateAge(item.tanggalLahir ?? undefined)} Thn</b></span>
                    </div>
                    <div className="meta-item contact">
                      <Phone size={12} />
                      <span>Kontak: {item.noTelp || "-"}</span>
                    </div>
                    <div className="meta-item ig">
                      <Instagram size={12} />
                      {item.instagram ? (
                        <a 
                          href={`https://instagram.com/${item.instagram.replace('@', '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: 'inherit', textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          @{item.instagram.replace('@', '')}
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-divider"></div>

              <div className="card-details">
                <div className="detail-grid">
                  <div className="detail-col">
                    <div className="bit">
                      <Calendar size={12} />
                      <div className="bit-content">
                        <span className="bit-label">TTL</span>
                        <p>{item.tempatLahir || "-"}, {item.tanggalLahir || "-"}</p>
                      </div>
                    </div>
                    <div className="bit">
                      <Heart size={12} />
                      <div className="bit-content">
                        <span className="bit-label">STATUS</span>
                        <p>{item.statusNikah || "Belum Menikah"}</p>
                      </div>
                    </div>
                    <div className="bit">
                      <Phone size={12} />
                      <div className="bit-content">
                        <span className="bit-label">KONTAK</span>
                        <p>{item.noTelp || "-"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="detail-col">
                    <div className="bit">
                      <User size={12} />
                      <div className="bit-content">
                        <span className="bit-label">UMUR</span>
                        <p>{calculateAge(item.tanggalLahir ?? undefined)} Tahun</p>
                      </div>
                    </div>
                    <div className="bit">
                      <Globe size={12} />
                      <div className="bit-content">
                        <span className="bit-label">SUKU</span>
                        <p>{item.suku || "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="detail-full">
                  <div className="bit">
                    <GraduationCap size={12} />
                    <div className="bit-content">
                      <span className="bit-label">PENDIDIKAN</span>
                      <p>{item.pendidikan || "-"}</p>
                    </div>
                  </div>
                  <div className="bit">
                    <Briefcase size={12} />
                    <div className="bit-content">
                      <span className="bit-label">PEKERJAAN</span>
                      <p>{item.pekerjaan || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="card-passions">
                  <div className="passion-bit">
                    <Music size={12} />
                    <span><b>Hobi:</b> {item.hobi || "-"}</span>
                  </div>
                  <div className="passion-bit">
                    <Utensils size={12} />
                    <span><b>Makan/Minuman:</b> {item.makananMinumanFavorit || "-"}</span>
                  </div>
                </div>

                <div className="address-box">
                  <span className="bit-label">ALAMAT:</span>
                  <p>{item.alamat || "Alamat belum diisi"}</p>
                </div>
              </div>

              <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn-detail"
                  onClick={() => setSelectedDetail(item)}
                >
                  <ClipboardList size={14} />
                  <span>Detail</span>
                </button>
                {item.id !== myProfile?.generusId && (
                  <button
                    type="button"
                    className={`btn-pilih ${selections.some(s => s.penerimaId === item.id) ? 'selected' : ''}`}
                    onClick={() => handlePilih(item.id)}
                  >
                    <Heart size={14} fill={selections.some(s => s.penerimaId === item.id) ? "currentColor" : "none"} />
                    <span>Pilih</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedDetail && (
        <div className="modal-overlay" onClick={() => setSelectedDetail(null)}>
          <div className="modal-content profile-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="close-modal"
              onClick={() => setSelectedDetail(null)}
              aria-label="Tutup"
            >
              <X size={20} />
            </button>
            <div
              className="pd-header"
              style={{
                background:
                  selectedDetail.jenisKelamin === "P"
                    ? "linear-gradient(135deg, #422830, #613946)"
                    : "linear-gradient(135deg, #17241b, #26392d)",
              }}
            >
              <div className="pd-photo">
                {selectedDetail.foto ? (
                  <img src={selectedDetail.foto} alt={selectedDetail.nama} />
                ) : (
                  <div className="pd-initials">{selectedDetail.nama.charAt(0)}</div>
                )}
              </div>
              <div className="pd-header-info">
                <div className="pd-status-badge">
                  {["admin", "tim_pnkb", "admin_romantic_room"].includes(selectedDetail.role || "")
                    ? "Panitia"
                    : "Peserta"}{" "}
                  #{selectedDetail.nomorUrut || "-"}
                </div>
                <h2 className="pd-name">{selectedDetail.nama}</h2>
                <div className="pd-region">
                  <MapPin size={12} /> {selectedDetail.mandiriDesaKota || "-"} &bull;{" "}
                  {selectedDetail.mandiriDesaNama || selectedDetail.desaNama || "-"}
                </div>
              </div>
            </div>
            <div className="pd-body">
              <div className="pd-grid">
                <div className="pd-item">
                  <span className="pd-label">ID Peserta</span>
                  <span className="pd-value">{selectedDetail.nomorUnik || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Jenis Kelamin</span>
                  <span className="pd-value">
                    {selectedDetail.jenisKelamin === "L"
                      ? "Laki-laki"
                      : selectedDetail.jenisKelamin === "P"
                      ? "Perempuan"
                      : "-"}
                  </span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Usia</span>
                  <span className="pd-value">
                    {calculateAge(selectedDetail.tanggalLahir ?? undefined)} tahun
                  </span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">TTL</span>
                  <span className="pd-value">
                    {selectedDetail.tempatLahir || "-"}, {selectedDetail.tanggalLahir || "-"}
                  </span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Status Nikah</span>
                  <span className="pd-value">{selectedDetail.statusNikah || "Belum Menikah"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Suku Bangsa</span>
                  <span className="pd-value">{selectedDetail.suku || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Pendidikan</span>
                  <span className="pd-value">{selectedDetail.pendidikan || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Pekerjaan</span>
                  <span className="pd-value">{selectedDetail.pekerjaan || "-"}</span>
                </div>
                {selectedDetail.noTelp && (
                  <div className="pd-item">
                    <span className="pd-label">WhatsApp</span>
                    <a
                      href={`https://wa.me/${selectedDetail.noTelp.replace(/\D/g, "").replace(/^0/, "62")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pd-link pd-link-wa"
                    >
                      {selectedDetail.noTelp}
                    </a>
                  </div>
                )}
                {selectedDetail.instagram && (
                  <div className="pd-item">
                    <span className="pd-label">Instagram</span>
                    <a
                      href={`https://instagram.com/${selectedDetail.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pd-link pd-link-ig"
                    >
                      @{selectedDetail.instagram.replace("@", "")}
                    </a>
                  </div>
                )}
                {selectedDetail.hobi && (
                  <div className="pd-item pd-item-full">
                    <span className="pd-label">Hobi</span>
                    <span className="pd-value">{selectedDetail.hobi}</span>
                  </div>
                )}
                {selectedDetail.makananMinumanFavorit && (
                  <div className="pd-item pd-item-full">
                    <span className="pd-label">Makanan / Minuman Favorit</span>
                    <span className="pd-value">{selectedDetail.makananMinumanFavorit}</span>
                  </div>
                )}
                {selectedDetail.kriteriaPasangan && (
                  <div className="pd-item pd-item-full">
                    <span className="pd-label">Kriteria Pasangan</span>
                    <span className="pd-value">{selectedDetail.kriteriaPasangan}</span>
                  </div>
                )}
                {selectedDetail.alamat && (
                  <div className="pd-item pd-item-full">
                    <span className="pd-label">Alamat Domisili</span>
                    <span className="pd-value">{selectedDetail.alamat}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="pd-footer">
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setSelectedDetail(null)}
              >
                Tutup
              </button>
              {selectedDetail.id !== myProfile?.generusId && selectedDetail.id !== myProfile?.id && (
                <button
                  type="button"
                  className={`btn-modal-pilih ${
                    selections.some((s) => s.penerimaId === selectedDetail.id) ? "selected" : ""
                  }`}
                  onClick={() => handlePilih(selectedDetail.id)}
                >
                  <Heart
                    size={15}
                    fill={
                      selections.some((s) => s.penerimaId === selectedDetail.id)
                        ? "currentColor"
                        : "none"
                    }
                  />
                  <span>
                    {selections.some((s) => s.penerimaId === selectedDetail.id)
                      ? "Batalkan Pilihan"
                      : "Pilih Generus"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pdkt-admin-container {
          padding: 40px;
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', sans-serif;
        }

        .header-section {
          text-align: center;
          margin-bottom: 40px;
        }
        .top-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          color: #3b82f6;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .header-section h1 {
          font-size: 36px;
          font-weight: 900;
          color: #1e293b;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .header-section h1 span { color: #3b82f6; }
        .subtitle { color: #64748b; font-size: 14px; margin-top: 8px; font-weight: 600; }

        .katalog-status-badge {
           display: inline-flex;
           align-items: center;
           gap: 8px;
           margin-top: 20px;
           padding: 8px 16px;
           border: 1px solid #fee2e2;
           background: #fef2f2;
           color: #ef4444;
           border-radius: 12px;
           font-size: 12px;
           font-weight: 700;
        }

        .toolbar-section {
          background: white;
          padding: 16px;
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          border: 1px solid #f1f5f9;
          margin-bottom: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .search-group { display: flex; gap: 12px; width: 100%; }
        .search-input-wrapper {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px 20px;
          border-radius: 16px;
        }
        .search-input-wrapper input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          min-width: 0;
          font-size: 14px;
          font-weight: 500;
        }
        .icon-search { color: #94a3b8; }
        .btn-advanced-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 0 20px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
          color: #475569;
          flex-shrink: 0;
        }
        .btn-advanced-search:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .btn-advanced-search.active {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #1d4ed8;
        }

        .filters-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pill-group {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 14px;
          gap: 2px;
        }
        .pill-group button {
          border: none;
          background: transparent;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: 0.2s;
          white-space: nowrap;
        }
        .pill-group button.active {
          background: white;
          color: #3b82f6;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        .dropdown-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 10px 18px;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          appearance: none;
          outline: none;
          cursor: pointer;
        }

        .select-box-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .select-box-wrapper::after {
          content: '▼';
          font-size: 8px;
          position: absolute;
          right: 15px;
          pointer-events: none;
          color: #94a3b8;
        }

        .total-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }
        .total-badge b { color: #1e293b; }

        .btn-export {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #1e293b;
          color: white;
          padding: 10px 20px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: 0.2s;
        }

        .grid-section {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 24px;
        }

        .participant-card {
          background: white;
          border-radius: 32px;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
        }
        .participant-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          border-color: #3b82f633;
        }

        .card-top {
          padding: 24px;
          display: flex;
          gap: 20px;
        }
        .avatar-side {
          width: 100px;
          flex-shrink: 0;
          position: relative;
        }
        .avatar-side img {
          width: 100px;
          height: 100px;
          border-radius: 24px;
          object-fit: cover;
          box-shadow: 0 10px 20px rgba(0,0,0,0.05);
        }
        .initials {
          width: 100px;
          height: 100px;
          border-radius: 24px;
          background: #eff6ff;
          color: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 900;
        }
        .role-tag {
           position: absolute;
           bottom: -8px;
           left: 0;
           right: 0;
           background: white;
           padding: 2px 0;
           text-align: center;
           font-size: 8px;
           font-weight: 900;
           letter-spacing: 1px;
           box-shadow: 0 4px 8px rgba(0,0,0,0.05);
           border-radius: 8px;
           color: #64748b;
        }

        .info-side { flex: 1; min-width: 0; }
        .name-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
        .name { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .no-urut { color: #3b82f6; font-weight: 900; font-size: 16px; }
        .gender-p .no-urut { color: #ec4899; }
        .id-text { font-size: 11px; font-weight: 700; color: #94a3b8; font-family: monospace; list-style: none; margin-bottom: 10px; }
        .region-info { font-size: 12px; color: #64748b; margin-bottom: 2px; line-height: 1.4; font-weight: 500; }
        .region-info .label { font-weight: 700; color: #1e293b; opacity: 0.6; }

        .floating-meta {
           margin-top: 14px;
           display: flex;
           flex-wrap: wrap;
           gap: 6px;
        }
        .meta-item {
           display: flex;
           align-items: center;
           gap: 6px;
           padding: 6px 12px;
           border-radius: 10px;
           font-size: 11px;
           font-weight: 700;
        }
        .meta-item.age { background: #eff6ff; color: #1e40af; border: 1.5px solid #dbeafe; }
        .meta-item.contact { background: #f0fdf4; color: #15803d; border: 1.5px solid #dcfce7; }
        .meta-item.ig { background: #fdf2f8; color: #be185d; border: 1.5px solid #fce7f3; }

        .card-divider { height: 1px; background: #f1f5f9; margin: 0; }

        .card-details { padding: 24px; flex: 1; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .bit { display: flex; gap: 10px; align-items: flex-start; }
        .bit svg { color: #3b82f6; opacity: 0.7; margin-top: 2px; }
        .gender-p .bit svg { color: #ec4899; }
        .bit-content { flex: 1; }
        .bit-label { display: block; font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.5px; }
        .bit-content p { font-size: 13px; font-weight: 600; color: #334155; margin: 0; line-height: 1.3; }

        .detail-full { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }

        .card-passions {
           background: #f8fafc;
           padding: 14px;
           border-radius: 16px;
           display: flex;
           flex-direction: column;
           gap: 8px;
           margin-bottom: 20px;
        }
        .passion-bit { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #475569; }
        .passion-bit svg { color: #3b82f6; }
        .gender-p .passion-bit svg { color: #ec4899; }
        
        .address-box { margin-top: auto; border-top: 1px dashed #e2e8f0; padding-top: 14px; }
        .address-box p { font-size: 12px; color: #64748b; font-weight: 600; line-height: 1.4; margin-top: 4px; }

        .card-actions {
          padding: 20px 24px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          gap: 12px;
          background: #fcfdfe;
        }
        .btn-detail {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          color: #334155;
          padding: 12px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-detail:hover { background: #f8fafc; }

        .btn-pilih {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #fdf2f8;
          color: #db2777;
          border: 1px solid #fce7f3;
          padding: 12px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .gender-p .btn-pilih { background: #fff1f2; color: #e11d48; border-color: #ffe4e6; }
        .btn-pilih.selected { background: #db2777; color: white; }
        .gender-p .btn-pilih.selected { background: #e11d48; }

        .skeleton-card { height: 600px; background: white; border-radius: 32px; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

        /* Modal Overlay & Profile Detail */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-content {
          position: relative;
          max-width: 100%;
          max-height: 92vh;
          overflow-y: auto;
        }
        .profile-detail-modal {
          background: #ffffff;
          border-radius: 24px;
          width: 520px;
          max-width: 100%;
          overflow: hidden;
          padding: 0;
          border: 1px solid #e2e8f0;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
          animation: scaleUp 0.2s ease-out;
        }
        @keyframes scaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .close-modal {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          cursor: pointer;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          transition: 0.15s;
        }
        .close-modal:hover {
          background: rgba(255, 255, 255, 0.35);
          transform: scale(1.05);
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
          border-radius: 18px;
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.6);
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.1);
        }
        .pd-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pd-initials {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 32px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.2);
        }
        .pd-header-info {
          flex: 1;
          min-width: 0;
        }
        .pd-status-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.35);
          color: #ffffff;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
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
          opacity: 0.92;
        }
        .pd-body {
          padding: 22px 24px;
          max-height: 55vh;
          overflow-y: auto;
        }
        .pd-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .pd-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .pd-item-full {
          grid-column: 1 / -1;
        }
        .pd-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pd-value {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.4;
        }
        .pd-link {
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }
        .pd-link-wa {
          color: #16a34a;
        }
        .pd-link-wa:hover {
          text-decoration: underline;
        }
        .pd-link-ig {
          color: #e11d48;
        }
        .pd-link-ig:hover {
          text-decoration: underline;
        }
        .pd-footer {
          padding: 14px 24px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          border-top: 1px solid #f1f5f9;
          background: #f8fafc;
        }
        .btn-modal-close {
          padding: 10px 18px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: 0.15s;
        }
        .btn-modal-close:hover {
          background: #f1f5f9;
          color: #1e293b;
        }
        .btn-modal-pilih {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          background: #fdf2f8;
          border: 1px solid #fce7f3;
          color: #db2777;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: 0.15s;
        }
        .btn-modal-pilih:hover {
          background: #fce7f3;
        }
        .btn-modal-pilih.selected {
          background: #db2777;
          color: #ffffff;
          border-color: #db2777;
        }
        .btn-modal-pilih.selected:hover {
          background: #be185d;
        }

        @media (max-width: 1024px) {
           .pdkt-admin-container { padding: 20px; }
           .toolbar-section { border-radius: 16px; }
           .grid-section { grid-template-columns: 1fr; }
           .btn-export { width: 100%; justify-content: center; margin-top: 10px; }
           .btn-advanced-search span { display: none; }
           .btn-advanced-search { padding: 12px; }
           .filters-group { display: flex; flex-direction: column; gap: 10px; align-items: stretch; width: 100%; }
           .filters-group .pill-group { display: flex; width: 100%; }
           .filters-group .pill-group button { flex: 1; text-align: center; }
           .filters-group .select-box-wrapper { width: 100%; }
           .filters-group .dropdown-box { width: 100%; min-width: 0; }
           .filters-group .total-badge { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}

function calculateAge(birthdayStr?: string | null) {
  if (!birthdayStr) return "-";
  const birthDate = new Date(birthdayStr);
  if (isNaN(birthDate.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
