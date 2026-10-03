"use client";

import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { Plus, Trash2, ChevronDown, ChevronRight, MapPin, Map, Users, Info, ToggleLeft, ToggleRight, Link2 } from "lucide-react";

interface MandiriDaerahItem { id: number; nama: string; isActive?: number; }
interface MandiriDesaItem { id: number; nama: string; mandiriDaerahId: number; daerahNama: string | null; kota: string | null; }
interface MandiriKelompokItem { id: number; nama: string; mandiriDesaId: number; desaNama: string | null; }
interface KegiatanItem { id: string; judul: string; tanggal: string; }

export default function MandiriDesaTreePage() {
  const [daerahList, setDaerahList] = useState<MandiriDaerahItem[]>([]);
  const [desaList, setDesaList] = useState<MandiriDesaItem[]>([]);
  const [kelompokList, setKelompokList] = useState<MandiriKelompokItem[]>([]);
  const [kegiatanList, setKegiatanList] = useState<KegiatanItem[]>([]);
  const [selectedKegiatan, setSelectedKegiatan] = useState("");
  const [activeKegiatanId, setActiveKegiatanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [newDaerahName, setNewDaerahName] = useState("");
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [daftarWilayahStatus, setDaftarWilayahStatus] = useState("open");
  const [selectedFilterDaerah, setSelectedFilterDaerah] = useState("all");
  const [searchDaerahQuery, setSearchDaerahQuery] = useState("");
  
  // Collapse/Expand state
  const [collapsedDaerahs, setCollapsedDaerahs] = useState<Record<number, boolean>>({});
  const [collapsedDesas, setCollapsedDesas] = useState<Record<number, boolean>>({});

  const fetchAll = useCallback(async (kegId?: string) => {
    setLoading(true);
    try {
      const targetKegId = kegId !== undefined ? kegId : selectedKegiatan;
      const daerahUrl = targetKegId ? `/api/mandiri/daerah?kegiatanId=${targetKegId}` : "/api/mandiri/daerah";
      const [da, de, ke] = await Promise.all([
        fetch(daerahUrl, { cache: 'no-store' }).then((r) => r.json()),
        fetch("/api/mandiri/desa", { cache: 'no-store' }).then((r) => r.json()),
        fetch("/api/mandiri/kelompok", { cache: 'no-store' }).then((r) => r.json()),
      ]);
      setDaerahList(Array.isArray(da) ? da : []);
      setDesaList(Array.isArray(de) ? de : []);
      setKelompokList(Array.isArray(ke) ? ke : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedKegiatan]);

  useEffect(() => { 
    async function init() {
      try {
        const [kegRes, activeRes, statusRes] = await Promise.all([
          fetch("/api/mandiri/kegiatan", { cache: 'no-store' }),
          fetch("/api/public/mandiri/settings?key=mandiri_active_kegiatan_id", { cache: 'no-store' }),
          fetch("/api/public/mandiri/settings?key=mandiri_daftar_wilayah_status", { cache: 'no-store' })
        ]);
        
        const kegs = await kegRes.json();
        setKegiatanList(Array.isArray(kegs) ? kegs : []);

        const activeJson = await activeRes.json();
        const activeId = activeJson.value || (kegs.length > 0 ? kegs[0].id : "");
        setActiveKegiatanId(activeId);
        setSelectedKegiatan(activeId);
        
        const statusJson = await statusRes.json();
        setDaftarWilayahStatus(statusJson.value || "open");

        // Fetch data for initial active kegiatan
        const daerahUrl = activeId ? `/api/mandiri/daerah?kegiatanId=${activeId}` : "/api/mandiri/daerah";
        const [da, de, ke] = await Promise.all([
          fetch(daerahUrl, { cache: 'no-store' }).then((r) => r.json()),
          fetch("/api/mandiri/desa", { cache: 'no-store' }).then((r) => r.json()),
          fetch("/api/mandiri/kelompok", { cache: 'no-store' }).then((r) => r.json()),
        ]);
        setDaerahList(Array.isArray(da) ? da : []);
        setDesaList(Array.isArray(de) ? de : []);
        setKelompokList(Array.isArray(ke) ? ke : []);
      } catch (err) {
        console.error("Init error in MandiriDesaPage:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
    fetch("/api/profile", { cache: 'no-store' }).then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, []);

  useEffect(() => {
    if (selectedKegiatan) {
      fetchAll(selectedKegiatan);
    }
  }, [selectedKegiatan]);

  const handleToggleDaftarWilayah = async () => {
    const newStatus = daftarWilayahStatus === "open" ? "closed" : "open";
    try {
      const res = await fetch("/api/mandiri/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "mandiri_daftar_wilayah_status", value: newStatus }),
      });
      if(res.ok) {
         setDaftarWilayahStatus(newStatus);
         Swal.fire({ 
           icon: 'success', 
           title: 'Berhasil', 
           text: `Pendaftaran wilayah sekarang ${newStatus === "open" ? 'dibuka' : 'ditutup'}.`, 
           toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 
         });
      } else {
         const err = await res.json();
         Swal.fire({ icon: 'error', title: 'Gagal', text: err.error || "Gagal mengubah status pendaftaran wilayah" });
      }
    } catch(err) {
      Swal.fire({ icon: 'error', title: 'Error', text: "Terjadi kesalahan koneksi" });
    }
  };

  const handleSetSystemActiveKegiatan = async (kegId: string) => {
    try {
      const res = await fetch("/api/mandiri/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "mandiri_active_kegiatan_id", value: kegId }),
      });
      if (res.ok) {
        setActiveKegiatanId(kegId);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Kegiatan ini berhasil dijadikan Kegiatan Aktif Utama!',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: "Gagal mengubah kegiatan aktif utama" });
    }
  };

  const handleToggleDaerahActive = async (daerahId: number, currentActive: boolean) => {
    if (!selectedKegiatan) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Silakan pilih kegiatan terlebih dahulu' });
      return;
    }
    try {
      const res = await fetch("/api/mandiri/daerah", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: daerahId,
          kegiatanId: selectedKegiatan,
          isActive: !currentActive
        })
      });
      if (res.ok) {
        setDaerahList(prev => prev.map(d => d.id === daerahId ? { ...d, isActive: !currentActive ? 1 : 0 } : d));
        Swal.fire({
          icon: 'success',
          title: 'Status Diperbarui',
          text: `Daerah berhasil di-${!currentActive ? 'aktifkan' : 'nonaktifkan'} untuk kegiatan ini.`,
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      } else {
        const err = await res.json();
        Swal.fire({ icon: 'error', title: 'Gagal', text: err.error || "Gagal mengubah status aktif daerah" });
      }
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error', text: "Terjadi kesalahan sistem" });
    }
  };

  const handleToggleAllDaerahActive = async (targetActive: boolean) => {
    if (!selectedKegiatan) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Silakan pilih kegiatan terlebih dahulu' });
      return;
    }
    try {
      setLoading(true);
      await Promise.all(
        daerahList.map(d =>
          fetch("/api/mandiri/daerah", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: d.id,
              kegiatanId: selectedKegiatan,
              isActive: targetActive
            })
          })
        )
      );
      setDaerahList(prev => prev.map(d => ({ ...d, isActive: targetActive ? 1 : 0 })));
      Swal.fire({
        icon: 'success',
        title: 'Status Diperbarui',
        text: `Semua daerah berhasil di-${targetActive ? 'aktifkan' : 'nonaktifkan'} untuk kegiatan ini.`,
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error', text: "Terjadi kesalahan sistem saat memperbarui semua daerah" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDaerah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDaerahName.trim()) return;
    setError("");
    const res = await fetch("/api/mandiri/daerah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: newDaerahName, kegiatanId: selectedKegiatan }),
    });
    if (!res.ok) { 
      const d = await res.json(); 
      Swal.fire({ icon: 'error', title: 'Gagal', text: d.error });
      setError(d.error); 
      return; 
    }
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Daerah baru berhasil ditambahkan', timer: 1500, showConfirmButton: false });
    setNewDaerahName("");
    fetchAll();
  };

  const handleAddDesa = async (daerahId: number, daerahNama: string) => {
    const { value: desaNama } = await Swal.fire({
      title: 'Tambah Desa Baru',
      text: `Masukkan nama desa untuk daerah: ${daerahNama}`,
      input: 'text',
      inputPlaceholder: 'Nama desa...',
      showCancelButton: true,
      confirmButtonText: 'Tambah',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) {
          return 'Nama desa tidak boleh kosong!';
        }
      }
    });

    if (desaNama) {
      const res = await fetch("/api/mandiri/desa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: desaNama.trim(), mandiriDaerahId: daerahId }),
      });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Desa berhasil ditambahkan', timer: 1500, showConfirmButton: false });
        fetchAll();
      } else {
        const d = await res.json();
        Swal.fire({ icon: 'error', title: 'Gagal', text: d.error || 'Gagal menambahkan desa' });
      }
    }
  };

  const handleAddKelompok = async (desaId: number, desaNama: string) => {
    const { value: kelompokNama } = await Swal.fire({
      title: 'Tambah Kelompok Baru',
      text: `Masukkan nama kelompok untuk desa: ${desaNama}`,
      input: 'text',
      inputPlaceholder: 'Nama kelompok...',
      showCancelButton: true,
      confirmButtonText: 'Tambah',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) {
          return 'Nama kelompok tidak boleh kosong!';
        }
      }
    });

    if (kelompokNama) {
      const res = await fetch("/api/mandiri/kelompok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: kelompokNama.trim(), mandiriDesaId: desaId }),
      });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Kelompok berhasil ditambahkan', timer: 1500, showConfirmButton: false });
        fetchAll();
      } else {
        const d = await res.json();
        Swal.fire({ icon: 'error', title: 'Gagal', text: d.error || 'Gagal menambahkan kelompok' });
      }
    }
  };

  const handleDeleteDaerah = async (id: number, name: string) => {
    const res = await Swal.fire({
      title: 'Hapus Daerah?',
      text: `Seluruh data desa dan kelompok di bawah "${name}" akan ikut terhapus permanen!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/mandiri/daerah?id=${id}`, { method: "DELETE" });
      Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Daerah berhasil dihapus.', timer: 1500, showConfirmButton: false });
      fetchAll();
    }
  };

  const handleDeleteDesa = async (id: number, name: string) => {
    const res = await Swal.fire({
      title: 'Hapus Desa?',
      text: `Seluruh data kelompok di bawah "${name}" akan ikut terhapus!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/mandiri/desa?id=${id}`, { method: "DELETE" });
      Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Desa berhasil dihapus.', timer: 1500, showConfirmButton: false });
      fetchAll();
    }
  };

  const handleDeleteKelompok = async (id: number, name: string) => {
    const res = await Swal.fire({
      title: 'Hapus Kelompok?',
      text: `Data kelompok "${name}" akan terhapus permanen!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/mandiri/kelompok?id=${id}`, { method: "DELETE" });
      Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Kelompok berhasil dihapus.', timer: 1500, showConfirmButton: false });
      fetchAll();
    }
  };

  const handleShowAllLinks = () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/mandiri/daftar-wilayah`;
    Swal.fire({
      title: '<span style="font-size:17px;font-weight:800">🔗 Link Pendaftaran</span>',
      html: `
        <div style="text-align:left">
          <div style="display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:14px">
            <span style="font-size:12px;color:#1e293b;word-break:break-all;flex:1;font-family:monospace">${url}</span>
            <button id="swal-copy-umum" onclick="navigator.clipboard.writeText('${url}').then(()=>{var b=document.getElementById('swal-copy-umum');b.textContent='✓ Tersalin';b.style.background='#dcfce7';b.style.color='#16a34a';setTimeout(()=>{b.textContent='Salin';b.style.background='#eff6ff';b.style.color='#2563eb';},2000)})" style="border:none;background:#eff6ff;color:#2563eb;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap;flex-shrink:0">Salin</button>
          </div>
          <div style="display:flex;justify-content:center;margin-bottom:8px">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}" alt="QR Code" style="border-radius:8px;border:1px solid #e2e8f0" onerror="this.style.display='none'" />
          </div>
          <p style="text-align:center;font-size:11px;color:#94a3b8;margin:0">Bagikan link atau scan QR code ini ke peserta</p>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      width: 420,
    });
  };

  // Toggle collapse handlers
  const toggleDaerahCollapse = (id: number) => {
    setCollapsedDaerahs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDesaCollapse = (id: number) => {
    setCollapsedDesas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Build the hierarchical tree data
  const treeData = daerahList.map(daerah => {
    const desas = desaList
      .filter(desa => desa.mandiriDaerahId === daerah.id)
      .map(desa => {
        const kelompoks = kelompokList.filter(kel => kel.mandiriDesaId === desa.id);
        return { ...desa, kelompoks };
      });
    return { ...daerah, desas };
  });

  return (
    <div>
      <Topbar title="Usia Mandiri/Nikah - Kelola Wilayah" role={userRole} />
      <div className="desa-page-content">
        
        {/* Header Title & Actions */}
        <div className="desa-page-header">
          <div className="page-header-left">
            <h2 className="desa-title">Kelola Wilayah & Kelompok (Tree View)</h2>
            <p className="desa-subtitle">Kelola daerah rujukan, desa, dan kelompok peserta dalam satu peta hirarki struktur</p>
          </div>
          <div className="desa-header-actions">
            <div className="desa-kegiatan-filter">
              <span className="desa-kegiatan-label">Filter Kegiatan:</span>
              <select
                value={selectedKegiatan}
                onChange={(e) => setSelectedKegiatan(e.target.value)}
                className="desa-kegiatan-select"
              >
                <option value="">Pilih Kegiatan</option>
                {kegiatanList.map(k => (
                  <option key={k.id} value={k.id}>{k.judul}</option>
                ))}
              </select>
              {selectedKegiatan && (
                selectedKegiatan === activeKegiatanId ? (
                  <span className="badge-kegiatan-aktif">
                    ✓ Kegiatan Utama Aktif
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetSystemActiveKegiatan(selectedKegiatan)}
                    className="btn-jadikan-aktif"
                    title="Klik untuk menjadikan kegiatan yang dipilih ini sebagai kegiatan aktif utama di sistem"
                  >
                    ⭐ Jadikan Aktif Utama
                  </button>
                )
              )}
            </div>

            <button
              onClick={handleShowAllLinks}
              className="btn-link-pendaftaran"
            >
              <Link2 size={15} /> Link Pendaftaran
            </button>

            <div className={`status-pendaftaran-box ${daftarWilayahStatus === "open" ? "status-open" : "status-closed"}`}>
              <span className="status-text">
                Status: {daftarWilayahStatus === "open" ? "BUKA" : "TUTUP"}
              </span>
              <button
                onClick={handleToggleDaftarWilayah}
                className={`btn-toggle-status ${daftarWilayahStatus === "open" ? "btn-close-daftar" : "btn-open-daftar"}`}
                title={`Klik untuk ${daftarWilayahStatus === "open" ? "menutup" : "membuka"} pendaftaran`}
              >
                {daftarWilayahStatus === "open" ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                {daftarWilayahStatus === "open" ? "Ubah ke Tutup" : "Ubah ke Buka"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error desa-alert-error">
            <Info size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="desa-main-grid">
          
          {/* Left Panel: Form Tambah Daerah */}
          <div className="card desa-card-left">
            <div className="card-left-header">
              <div className="icon-wrap-map">
                <MapPin size={20} />
              </div>
              <h3 className="card-left-title">Tambah Daerah Rujukan</h3>
            </div>
            
            <form onSubmit={handleAddDaerah}>
              <div className="form-group-wrap">
                <div>
                  <label className="form-label-daerah">Nama Daerah</label>
                  <input
                    className="form-control form-input-daerah"
                    placeholder="Nama daerah rujukan baru (misal: Cengkareng)..."
                    value={newDaerahName}
                    onChange={(e) => setNewDaerahName(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-submit-daerah">
                  <Plus size={16} /> Tambah Daerah
                </button>
              </div>
            </form>
          </div>

          {/* Right Panel: Tree View Map */}
          <div className="card desa-card-right">
            {(() => {
              const activeDaerahs = daerahList.filter(d => d.isActive !== 0);
              const visibleDaerahIds = new Set(daerahList.map(d => d.id));
              const activeDaerahIds = new Set(activeDaerahs.map(d => d.id));
              
              const visibleDesas = desaList.filter(d => visibleDaerahIds.has(d.mandiriDaerahId));
              const activeDesas = visibleDesas.filter(d => activeDaerahIds.has(d.mandiriDaerahId));
              
              const visibleDesaIds = new Set(visibleDesas.map(d => d.id));
              const activeDesaIds = new Set(activeDesas.map(d => d.id));
              
              const visibleKelompoks = kelompokList.filter(k => visibleDesaIds.has(k.mandiriDesaId));
              const activeKelompoks = visibleKelompoks.filter(k => activeDesaIds.has(k.mandiriDesaId));

              const filteredTreeData = treeData.filter(daerah => {
                if (selectedFilterDaerah === "active" && daerah.isActive === 0) return false;
                if (selectedFilterDaerah !== "all" && selectedFilterDaerah !== "active" && String(daerah.id) !== selectedFilterDaerah) {
                  return false;
                }
                if (searchDaerahQuery.trim()) {
                  const q = searchDaerahQuery.toLowerCase().trim();
                  const matchDaerah = daerah.nama.toLowerCase().includes(q);
                  const matchDesa = daerah.desas.some(d => d.nama.toLowerCase().includes(q) || d.kelompoks.some(k => k.nama.toLowerCase().includes(q)));
                  if (!matchDaerah && !matchDesa) return false;
                }
                return true;
              });

              return (
                <>
                  <div className="tree-top-section">
                    <div className="tree-header-top">
                      <div>
                        <h3 className="tree-title">Peta Hirarki Wilayah</h3>
                        {selectedKegiatan && (
                          <p className="tree-subtitle">
                            Status Keaktifan Wilayah untuk Kegiatan: <b>{kegiatanList.find(k => k.id === selectedKegiatan)?.judul || selectedKegiatan}</b>
                          </p>
                        )}
                      </div>

                      <div className="tree-stats-actions">
                        <div className="tree-stats-counts">
                          <span>Daerah: <b>{daerahList.length}</b> <span className="stat-aktif">({activeDaerahs.length} Aktif)</span></span>
                          <span>Desa: <b>{visibleDesas.length}</b> <span className="stat-aktif">({activeDesas.length} Aktif)</span></span>
                          <span>Kelompok: <b>{visibleKelompoks.length}</b> <span className="stat-aktif">({activeKelompoks.length} Aktif)</span></span>
                        </div>

                        <div className="tree-stats-buttons">
                          <button
                            onClick={() => handleToggleAllDaerahActive(true)}
                            className="btn-toggle-all btn-all-active"
                            title="Aktifkan semua daerah untuk kegiatan ini"
                          >
                            ✓ Aktifkan Semua
                          </button>
                          <button
                            onClick={() => handleToggleAllDaerahActive(false)}
                            className="btn-toggle-all btn-all-inactive"
                            title="Non-aktifkan semua daerah untuk kegiatan ini"
                          >
                            ✕ Non-Aktifkan Semua
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Filter Daerah Bar */}
                    <div className="tree-filter-bar">
                      <div className="filter-select-group">
                        <span className="filter-label">Filter Daerah:</span>
                        <select
                          value={selectedFilterDaerah}
                          onChange={(e) => setSelectedFilterDaerah(e.target.value)}
                          className="filter-select"
                        >
                          <option value="all">Semua Daerah ({daerahList.length})</option>
                          <option value="active">Hanya Daerah Aktif ({activeDaerahs.length})</option>
                          <optgroup label="Pilih Daerah Spesifik">
                            {daerahList.map(d => (
                              <option key={d.id} value={String(d.id)}>
                                {d.nama} {d.isActive !== 0 ? "✓ (Aktif)" : "(Non-Aktif)"}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      <div className="filter-search-group">
                        <input
                          type="text"
                          placeholder="Cari nama daerah, desa, atau kelompok..."
                          value={searchDaerahQuery}
                          onChange={(e) => setSearchDaerahQuery(e.target.value)}
                          className="filter-search-input"
                        />
                      </div>

                      {(selectedFilterDaerah !== "all" || searchDaerahQuery) && (
                        <button
                          onClick={() => {
                            setSelectedFilterDaerah("all");
                            setSearchDaerahQuery("");
                          }}
                          className="btn-reset-filter"
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>
                  </div>

                  {loading ? (
                    <div className="tree-loading-box">
                      <div className="spinner" />
                    </div>
                  ) : filteredTreeData.length === 0 ? (
                    <div className="tree-empty-box">
                      <Info size={36} className="tree-empty-icon" />
                      <span className="tree-empty-text">
                        {selectedFilterDaerah !== "all" || searchDaerahQuery
                          ? "Tidak ada daerah yang cocok dengan filter."
                          : "Belum ada data struktur wilayah."}
                      </span>
                    </div>
                  ) : (
                    <div className="tree-list-container">
                      {filteredTreeData.map(daerah => {
                        const isDaerahCollapsed = !!collapsedDaerahs[daerah.id];
                        const isDaerahActive = daerah.isActive !== 0;
                        
                        return (
                          <div 
                            key={daerah.id} 
                            className={`daerah-tree-card ${isDaerahActive ? "is-active" : "is-inactive"}`}
                          >
                            {/* Daerah Node */}
                            <div className="tree-node-header daerah-node-header">
                              <div 
                                onClick={() => toggleDaerahCollapse(daerah.id)}
                                className="node-title-group"
                              >
                                {isDaerahCollapsed ? <ChevronRight size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                                <MapPin size={16} className="text-blue-500" />
                                <span className="node-name-daerah">{daerah.nama}</span>
                                <span className="node-pill">
                                  {daerah.desas.length} Desa
                                </span>
                              </div>
                              
                              <div className="node-actions-group">
                                {/* Toggle Active Button */}
                                <button
                                  onClick={() => handleToggleDaerahActive(daerah.id, daerah.isActive !== 0)}
                                  className={`btn-node-toggle ${daerah.isActive !== 0 ? "active" : "inactive"}`}
                                  title="Toggle keaktifan daerah untuk kegiatan ini"
                                >
                                  {daerah.isActive !== 0 ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                  <span>{daerah.isActive !== 0 ? "Aktif" : "Non-Aktif"}</span>
                                </button>

                                {/* Add Desa Button */}
                                <button
                                  onClick={() => handleAddDesa(daerah.id, daerah.nama)}
                                  className="btn-add-child btn-add-desa"
                                >
                                  <Plus size={12} /> <span>Desa</span>
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() => handleDeleteDaerah(daerah.id, daerah.nama)}
                                  className="btn-delete-node"
                                  title="Hapus Daerah"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>

                            {/* Desas List (Child of Daerah) */}
                            {!isDaerahCollapsed && (
                              <div className="daerah-children-container">
                                {daerah.desas.length === 0 ? (
                                  <div className="empty-child-text">Belum ada data desa di daerah ini.</div>
                                ) : (
                                  daerah.desas.map(desa => {
                                    const isDesaCollapsed = !!collapsedDesas[desa.id];
                                    
                                    return (
                                      <div 
                                        key={desa.id} 
                                        className="desa-tree-card"
                                      >
                                        {/* Desa Node */}
                                        <div className="tree-node-header desa-node-header">
                                          <div 
                                            onClick={() => toggleDesaCollapse(desa.id)}
                                            className="node-title-group"
                                          >
                                            {isDesaCollapsed ? <ChevronRight size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                                            <Map size={14} className="text-purple-500" />
                                            <span className="node-name-desa">{desa.nama}</span>
                                            <span className="node-pill">
                                              {desa.kelompoks.length} Kelompok
                                            </span>
                                          </div>

                                          <div className="node-actions-group">
                                            {/* Add Kelompok Button */}
                                            <button
                                              onClick={() => handleAddKelompok(desa.id, desa.nama)}
                                              className="btn-add-child btn-add-kelompok"
                                            >
                                              <Plus size={10} /> <span>Kelompok</span>
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                              onClick={() => handleDeleteDesa(desa.id, desa.nama)}
                                              className="btn-delete-node"
                                              title="Hapus Desa"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Kelompoks List (Child of Desa) */}
                                        {!isDesaCollapsed && (
                                          <div className="desa-children-container">
                                            {desa.kelompoks.length === 0 ? (
                                              <div className="empty-child-text">Belum ada data kelompok di desa ini.</div>
                                            ) : (
                                              desa.kelompoks.map(kelompok => (
                                                <div 
                                                  key={kelompok.id} 
                                                  className="kelompok-node-item"
                                                >
                                                  <div className="kelompok-name-group">
                                                    <Users size={12} className="text-green-500" />
                                                    <span className="node-name-kelompok">{kelompok.nama}</span>
                                                  </div>

                                                  <button
                                                    onClick={() => handleDeleteKelompok(kelompok.id, kelompok.nama)}
                                                    className="btn-delete-node btn-delete-kelompok"
                                                    title="Hapus Kelompok"
                                                  >
                                                    <Trash2 size={13} />
                                                  </button>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

        </div>
      </div>

      <style jsx>{`
        .desa-page-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px 32px 60px;
          color: #26392d;
        }

        .desa-page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .desa-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px 0;
          letter-spacing: -0.01em;
        }

        .desa-subtitle {
          color: #64748b;
          font-size: 14px;
          margin: 0;
        }

        .desa-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .desa-kegiatan-filter {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          padding: 8px 14px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }

        .desa-kegiatan-label {
          font-size: 14px;
          font-weight: 600;
          color: #475569;
        }

        .desa-kegiatan-select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          background-color: #fff;
          outline: none;
          min-width: 200px;
          cursor: pointer;
        }

        .badge-kegiatan-aktif {
          font-size: 12px;
          font-weight: 700;
          color: #166534;
          background: #dcfce7;
          border: 1px solid #bbf7d0;
          padding: 5px 10px;
          border-radius: 8px;
          white-space: nowrap;
        }

        .btn-jadikan-aktif {
          font-size: 12px;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 5px 10px;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .btn-jadikan-aktif:hover {
          background: #dbeafe;
        }

        .btn-link-pendaftaran {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }

        .btn-link-pendaftaran:hover {
          background: #f8fafc;
          border-color: #6366f1;
          color: #6366f1;
        }

        .status-pendaftaran-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 12px;
        }

        .status-pendaftaran-box.status-open {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        .status-pendaftaran-box.status-closed {
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .status-text {
          font-size: 12.5px;
          font-weight: 700;
        }

        .status-open .status-text {
          color: #166534;
        }

        .status-closed .status-text {
          color: #991b1b;
        }

        .btn-toggle-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 8px;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-close-daftar {
          background: #dc2626;
        }

        .btn-close-daftar:hover {
          background: #b91c1c;
        }

        .btn-open-daftar {
          background: #16a34a;
        }

        .btn-open-daftar:hover {
          background: #15803d;
        }

        .desa-alert-error {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 12px 16px;
          border-radius: 10px;
        }

        /* Main Grid */
        .desa-main-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 24px;
          align-items: start;
        }

        .desa-card-left,
        .desa-card-right {
          padding: 24px;
          border-radius: 16px;
          border: 1px solid #e6dfd3;
          background: #fff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .desa-card-right {
          min-height: 500px;
        }

        /* Left Card Content */
        .card-left-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .icon-wrap-map {
          background: #eff6ff;
          color: #2563eb;
          padding: 10px;
          border-radius: 10px;
          display: inline-flex;
        }

        .card-left-title {
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .form-group-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-label-daerah {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
          display: block;
        }

        .form-input-daerah {
          border-radius: 8px;
          padding: 10px 12px;
          width: 100%;
          border: 1px solid #cbd5e1;
          outline: none;
        }

        .form-input-daerah:focus {
          border-color: #2563eb;
        }

        .btn-submit-daerah {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
        }

        /* Right Card / Tree Header */
        .tree-top-section {
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 20px;
        }

        .tree-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 12px;
        }

        .tree-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .tree-subtitle {
          font-size: 12px;
          color: #64748b;
          margin: 2px 0 0 0;
        }

        .tree-stats-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .tree-stats-counts {
          display: flex;
          gap: 12px;
          font-size: 12.5px;
          color: #64748b;
          flex-wrap: wrap;
        }

        .stat-aktif {
          color: #16a34a;
          font-weight: 700;
        }

        .tree-stats-buttons {
          display: flex;
          gap: 6px;
        }

        .btn-toggle-all {
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-all-active {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }

        .btn-all-active:hover {
          background: #dcfce7;
        }

        .btn-all-inactive {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #991b1b;
        }

        .btn-all-inactive:hover {
          background: #fee2e2;
        }

        /* Tree Filter Bar */
        .tree-filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .filter-select-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          white-space: nowrap;
        }

        .filter-select {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          background-color: #fff;
          outline: none;
          cursor: pointer;
        }

        .filter-search-group {
          flex: 1;
          min-width: 200px;
        }

        .filter-search-input {
          width: 100%;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          background-color: #fff;
          outline: none;
        }

        .filter-search-input:focus {
          border-color: #2563eb;
        }

        .btn-reset-filter {
          font-size: 12px;
          color: #64748b;
          background: #e2e8f0;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .btn-reset-filter:hover {
          background: #cbd5e1;
          color: #1e293b;
        }

        .tree-loading-box,
        .tree-empty-box {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
        }

        .tree-empty-box {
          flex-direction: column;
          color: #94a3b8;
        }

        .tree-empty-icon {
          margin-bottom: 12px;
          color: #cbd5e1;
        }

        .tree-empty-text {
          font-size: 14px;
          text-align: center;
        }

        .tree-list-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Tree Nodes */
        .daerah-tree-card {
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .daerah-tree-card.is-active {
          border: 1px solid #e2e8f0;
          background: #fafafa;
          opacity: 1;
        }

        .daerah-tree-card.is-inactive {
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          opacity: 0.85;
        }

        .tree-node-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .daerah-node-header {
          padding: 12px 16px;
          background: #fff;
        }

        .daerah-tree-card.is-inactive .daerah-node-header {
          background: #f1f5f9;
        }

        .node-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
          min-width: 0;
          flex: 1;
        }

        .node-name-daerah {
          font-weight: 700;
          color: #1e293b;
          font-size: 15px;
          word-break: break-word;
        }

        .node-pill {
          font-size: 11px;
          color: #94a3b8;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 10px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .node-actions-group {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .btn-node-toggle {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-node-toggle.active {
          background-color: #dcfce7;
          color: #166534;
        }

        .btn-node-toggle.inactive {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .btn-add-child {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-add-desa {
          background: #eff6ff;
          color: #2563eb;
        }

        .btn-add-desa:hover {
          background: #dbeafe;
        }

        .btn-add-kelompok {
          padding: 3px 6px;
          font-size: 11px;
          background: #faf5ff;
          color: #7e22ce;
        }

        .btn-add-kelompok:hover {
          background: #f3e8ff;
        }

        .btn-delete-node {
          padding: 6px;
          background: transparent;
          color: #ef4444;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .btn-delete-node:hover {
          background: #fef2f2;
        }

        /* Desas List Container */
        .daerah-children-container {
          padding: 8px 16px 12px 28px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .desa-tree-card {
          background: #fff;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          overflow: hidden;
        }

        .desa-node-header {
          padding: 10px 14px;
        }

        .node-name-desa {
          font-weight: 600;
          color: #334155;
          font-size: 14px;
          word-break: break-word;
        }

        /* Kelompoks List Container */
        .desa-children-container {
          padding: 8px 12px 10px 24px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: #fafafa;
          border-bottom-left-radius: 10px;
          border-bottom-right-radius: 10px;
        }

        .kelompok-node-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          background: #fff;
          border-radius: 6px;
          border: 1px solid #f1f5f9;
        }

        .kelompok-name-group {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          flex: 1;
        }

        .node-name-kelompok {
          font-size: 13px;
          color: #475569;
          font-weight: 500;
          word-break: break-word;
        }

        .btn-delete-kelompok {
          padding: 4px;
        }

        .empty-child-text {
          font-size: 12.5px;
          color: #94a3b8;
          padding: 4px 8px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 960px) {
          .desa-main-grid {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .desa-page-content {
            padding: 16px 12px 40px;
          }

          .desa-page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            margin-bottom: 18px;
          }

          .desa-title {
            font-size: 20px;
          }

          .desa-subtitle {
            font-size: 13px;
          }

          .desa-header-actions {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
          }

          .desa-kegiatan-filter {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
          }

          .desa-kegiatan-select {
            width: 100%;
            min-width: 0;
          }

          .badge-kegiatan-aktif,
          .btn-jadikan-aktif {
            text-align: center;
            justify-content: center;
          }

          .btn-link-pendaftaran {
            width: 100%;
            justify-content: center;
          }

          .status-pendaftaran-box {
            width: 100%;
            justify-content: space-between;
          }

          .desa-card-left,
          .desa-card-right {
            padding: 16px 14px;
            border-radius: 14px;
          }

          .tree-header-top {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .tree-stats-actions {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
            gap: 10px;
          }

          .tree-stats-counts {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            text-align: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 6px;
            border-radius: 10px;
            font-size: 11px;
            gap: 4px;
          }

          .tree-stats-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            width: 100%;
          }

          .btn-toggle-all {
            text-align: center;
            justify-content: center;
            padding: 8px;
          }

          .tree-filter-bar {
            flex-direction: column;
            align-items: stretch;
            padding: 12px;
            gap: 10px;
          }

          .filter-select-group {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
            gap: 4px;
          }

          .filter-select {
            width: 100%;
          }

          .filter-search-group {
            width: 100%;
            min-width: 0;
          }

          .btn-reset-filter {
            width: 100%;
            text-align: center;
            padding: 8px;
          }

          .daerah-node-header {
            flex-wrap: wrap;
            padding: 10px 12px;
            gap: 8px;
          }

          .daerah-children-container {
            padding: 8px 6px 10px 10px;
          }

          .desa-children-container {
            padding: 6px 6px 8px 8px;
          }

          .desa-node-header {
            padding: 8px 10px;
          }
        }

        @media (max-width: 480px) {
          .node-actions-group {
            gap: 4px;
          }

          .btn-node-toggle span,
          .btn-add-child span {
            display: none;
          }

          .btn-node-toggle,
          .btn-add-child {
            padding: 4px 6px;
          }
        }
      `}</style>
    </div>
  );
}
