"use client";

import Topbar from "@/components/Topbar";
import { RefreshCw, Search, Download, Undo, Clock, MapPin } from "lucide-react";
import * as XLSX from 'xlsx';

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

interface KegiatanItem {
  id: string;
  judul: string;
  tanggal: string;
}

interface PulangItem {
  id: string;
  generusId: string;
  generusNama: string | null;
  generusNomorUnik: string | null;
  generusJenisKelamin: string | null;
  desaNama: string | null;
  desaKota: string | null;
  nomorPeserta: string;
  timestamp: string | null;
  alasanPulang: string | null;
  waktuPulang: string | null;
}

interface DesaItem {
  id: number;
  nama: string;
  kota: string;
}

function PulangContent() {
  const searchParams = useSearchParams();
  const [kegiatan, setKegiatan] = useState<KegiatanItem[]>([]);
  const [selectedKegiatan, setSelectedKegiatan] = useState<string>(searchParams.get("kegiatanId") || "");
  const [pulangList, setPulangList] = useState<PulangItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState("");
  
  const [allDesas, setAllDesas] = useState<DesaItem[]>([]);
  const [allKotas, setAllKotas] = useState<string[]>([]);
  const [filterKota, setFilterKota] = useState("");
  const [filterDesa, setFilterDesa] = useState("");

  // Load activities, active activity, and user profile on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [kegRes, profRes, activeRes, desaRes] = await Promise.all([
          fetch("/api/mandiri/kegiatan"),
          fetch("/api/profile"),
          fetch("/api/mandiri/settings?key=mandiri_active_kegiatan_id"),
          fetch("/api/mandiri/desa")
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

        if (desaRes.ok) {
          const d = await desaRes.json();
          if (Array.isArray(d)) {
            setAllDesas(d);
            const uniqueKotas = Array.from(new Set(d.map((item: any) => item.kota))).sort() as string[];
            setAllKotas(uniqueKotas);
          }
        }
      } catch (err) {
        console.error("Init fetch error:", err);
      }
    };
    init();
  }, []);

  // Fetch checked-out participants
  const fetchPulangList = useCallback(async () => {
    if (!selectedKegiatan) { setPulangList([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/mandiri/pulang?kegiatanId=${selectedKegiatan}`);
      if (!res.ok) throw new Error("Gagal mengambil data peserta pulang");
      const data = await res.json();
      setPulangList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch pulang list error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedKegiatan]);

  useEffect(() => { fetchPulangList(); }, [fetchPulangList]);

  // Restore participant back to present (hadir)
  const restoreParticipant = async (absensiId: string, name: string) => {
    const result = await Swal.fire({
      title: "Kembalikan Status Hadir?",
      html: `Apakah Anda yakin ingin membatalkan status pulang untuk <b>${name}</b>?<br/>Peserta akan diubah statusnya menjadi <b>Hadir</b> dan dapat mengikuti taaruf kembali.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Kembalikan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#64748b"
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: "Sedang memproses...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const res = await fetch("/api/mandiri/pulang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: absensiId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal memproses");
      }

      Swal.fire({
        title: "Berhasil!",
        text: `Status ${name} berhasil dikembalikan ke Hadir.`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });

      fetchPulangList();
    } catch (err: any) {
      console.error("Restore participant error:", err);
      Swal.fire("Gagal", err.message || "Gagal memproses data", "error");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (pulangList.length === 0) {
      Swal.fire("Informasi", "Tidak ada data untuk diekspor", "info");
      return;
    }

    const excelData = filteredList.map((item) => ({
      "No. Urut": item.nomorPeserta || "-",
      "Nama": item.generusNama || "-",
      "L/P": item.generusJenisKelamin || "-",
      "Desa": item.desaNama || "-",
      "Daerah/Kota": item.desaKota || "-",
      "Jam Pulang": item.waktuPulang ? new Date(item.waktuPulang).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-",
      "Alasan Pulang": item.alasanPulang || "-"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Pulang");
    
    // Auto-fit columns
    const maxLens = Object.keys(excelData[0] || {}).map(key => {
      return Math.max(
        key.length,
        ...excelData.map(row => String((row as any)[key] || "").length)
      );
    });
    worksheet["!cols"] = maxLens.map(len => ({ wch: len + 3 }));

    XLSX.writeFile(workbook, `Daftar_Peserta_Pulang_${selectedKegiatan}.xlsx`);
  };

  // Filtered List
  const filteredList = pulangList.filter((item) => {
    const nameMatch = (item.generusNama || "").toLowerCase().includes(searchQuery.toLowerCase());
    const numMatch = String(item.nomorPeserta || "").toLowerCase().includes(searchQuery.toLowerCase());
    const queryMatch = nameMatch || numMatch;

    const kotaMatch = !filterKota || item.desaKota === filterKota;
    const desaMatch = !filterDesa || item.desaNama === filterDesa;

    return queryMatch && kotaMatch && desaMatch;
  });

  // Filter villages by selected city
  const filteredDesas = allDesas.filter(d => !filterKota || d.kota === filterKota);

  return (
    <div>
      <Topbar title="Daftar Peserta Pulang" role={userRole} />
      
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Daftar Peserta Pulang</h2>
            <p>Daftar Peserta yang telah check-out (pulang) beserta alasan</p>
          </div>
        </div>

        {/* Filter & Kegiatan Selection */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span className="card-title">Filter & Kegiatan</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-secondary" onClick={fetchPulangList} disabled={loading} title="Refresh Data">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <button className="btn-primary" onClick={handleExportExcel} disabled={pulangList.length === 0}>
                <Download size={16} style={{ marginRight: 6 }} /> Export Excel
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="responsive-grid-4">
              <div className="form-group">
                <label className="form-label">Kegiatan</label>
                <select className="form-control" value={selectedKegiatan} onChange={(e) => setSelectedKegiatan(e.target.value)}>
                  <option value="">-- Pilih Kegiatan --</option>
                  {kegiatan.map((k) => (
                    <option key={k.id} value={k.id}>{k.judul} ({k.tanggal})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Pencarian</label>
                <div style={{ position: "relative" }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Cari Nama / No. Urut..." 
                    style={{ paddingRight: 32 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search size={16} className="text-muted" style={{ position: "absolute", right: 10, top: 12 }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Filter Kota/Daerah</label>
                <select className="form-control" value={filterKota} onChange={(e) => { setFilterKota(e.target.value); setFilterDesa(""); }}>
                  <option value="">Semua Kota/Daerah</option>
                  {allKotas.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Filter Desa</label>
                <select className="form-control" value={filterDesa} onChange={(e) => setFilterDesa(e.target.value)}>
                  <option value="">Semua Desa</option>
                  {filteredDesas.map((d) => (
                    <option key={d.id} value={d.nama}>{d.nama}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main List */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="card-title">Peserta Pulang ({filteredList.length})</span>
          </div>
          
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <div className="spinner" />
              </div>
            ) : filteredList.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }} className="text-muted">
                Tidak ada data peserta pulang yang ditemukan.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="table-responsive desktop-only-table">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: "80px" }}>No. Urut</th>
                        <th>Nama</th>
                        <th style={{ width: "60px" }}>L/P</th>
                        <th>Desa / Kota</th>
                        <th>Jam Pulang</th>
                        <th>Alasan Pulang</th>
                        <th style={{ width: "100px", textAlign: "center" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredList.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 700 }}>#{item.nomorPeserta || "-"}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.generusNama}</div>
                            <div className="text-xs text-muted" style={{ fontSize: "10px" }}>{item.generusNomorUnik}</div>
                          </td>
                          <td>{item.generusJenisKelamin || "-"}</td>
                          <td>
                            <div>{item.desaNama || "Umum"}</div>
                            <div className="text-xs text-muted" style={{ fontSize: "10px" }}>{item.desaKota || "-"}</div>
                          </td>
                          <td>
                            {item.waktuPulang ? new Date(item.waktuPulang).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-"}
                          </td>
                          <td>
                            <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>
                              {item.alasanPulang || "Tidak ada alasan"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="btn-secondary" 
                              style={{ padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "12px", border: "1px solid #dbeafe", background: "#eff6ff", color: "#2563eb" }}
                              title="Kembalikan Hadir"
                              onClick={() => restoreParticipant(item.id, item.generusNama || "Peserta")}
                            >
                              <Undo size={14} />
                              <span>Hadirkan</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="mobile-only-cards">
                  {filteredList.map((item) => (
                    <div key={item.id} className="pulang-mobile-card">
                      <div className="card-top">
                        <div className="top-badges">
                          <span className="badge-no-urut">#{item.nomorPeserta || "-"}</span>
                          <span className={`badge-gender ${item.generusJenisKelamin === 'P' ? 'gender-p' : 'gender-l'}`}>
                            {item.generusJenisKelamin === 'P' ? 'P' : 'L'}
                          </span>
                        </div>
                        <div className="badge-jam">
                          <Clock size={12} />
                          <span>
                            {item.waktuPulang ? new Date(item.waktuPulang).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) : "-"}
                          </span>
                        </div>
                      </div>

                      <div className="card-main">
                        <div className="nama-row">
                          <span className="nama-text">{item.generusNama}</span>
                          {item.generusNomorUnik && (
                            <span className="unik-tag">{item.generusNomorUnik}</span>
                          )}
                        </div>
                        <div className="lokasi-row">
                          <MapPin size={13} className="text-muted" />
                          <span>{item.desaNama || "Umum"}{item.desaKota ? ` • ${item.desaKota}` : ""}</span>
                        </div>
                      </div>

                      <div className="card-alasan">
                        <div className="alasan-label">Alasan Pulang</div>
                        <div className="alasan-text">
                          {item.alasanPulang || "Tidak ada alasan spesifik"}
                        </div>
                      </div>

                      <div className="card-footer-action">
                        <button
                          className="btn-hadirkan-mobile"
                          onClick={() => restoreParticipant(item.id, item.generusNama || "Peserta")}
                        >
                          <Undo size={14} />
                          <span>Kembalikan ke Hadir</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .desktop-only-table {
          display: block;
        }

        .mobile-only-cards {
          display: none;
        }

        @media (max-width: 768px) {
          .desktop-only-table {
            display: none;
          }

          .mobile-only-cards {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 12px;
          }

          .pulang-mobile-card {
            background: #ffffff;
            border: 1px solid #e6dfd3;
            border-radius: 14px;
            padding: 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f4efe6;
            padding-bottom: 8px;
          }

          .top-badges {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .badge-no-urut {
            background: #f4efe6;
            color: #26392d;
            font-weight: 700;
            font-size: 12.5px;
            padding: 3px 8px;
            border-radius: 6px;
          }

          .badge-gender {
            font-size: 11px;
            font-weight: 700;
            padding: 3px 7px;
            border-radius: 6px;
          }

          .gender-l {
            background: #eff6ff;
            color: #2563eb;
            border: 1px solid #bfdbfe;
          }

          .gender-p {
            background: #fdf2f8;
            color: #db2777;
            border: 1px solid #fbcfe8;
          }

          .badge-jam {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #64748b;
            background: #f8fafc;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            font-weight: 600;
          }

          .card-main {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .nama-row {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 8px;
            flex-wrap: wrap;
          }

          .nama-text {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            word-break: break-word;
          }

          .unik-tag {
            font-family: monospace;
            font-size: 11px;
            color: #64748b;
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
          }

          .lokasi-row {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12.5px;
            color: #64748b;
          }

          .card-alasan {
            background: #fdfaf6;
            border: 1px solid #f4efe6;
            border-radius: 8px;
            padding: 8px 10px;
          }

          .alasan-label {
            font-size: 10px;
            font-weight: 700;
            color: #8c7b6b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
          }

          .alasan-text {
            font-size: 13px;
            color: #334155;
            font-style: italic;
            word-break: break-word;
          }

          .card-footer-action {
            margin-top: 2px;
          }

          .btn-hadirkan-mobile {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 9px 14px;
            border-radius: 8px;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #2563eb;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-hadirkan-mobile:hover {
            background: #dbeafe;
          }
        }
      `}</style>
    </div>
  );
}

export default function MandiriPulangPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
      <PulangContent />
    </Suspense>
  );
}
