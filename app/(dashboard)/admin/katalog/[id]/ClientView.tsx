"use client";



import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GenerusItem } from "@/lib/types";
import QRCode from "qrcode";
import {
  ArrowLeft, MapPin, Calendar, Heart, Globe, Phone,
  GraduationCap, Briefcase, Music, UtilityPole as Utensils,
  Clock, User, Star, ShieldCheck, Share2, Sparkles, Download
} from "lucide-react";
import GlobalLoading from "@/app/loading";

export default function AdminKatalogDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [data, setData] = useState<GenerusItem | null>(null);
  const [myProfile, setMyProfile] = useState<GenerusItem | null>(null);
  const [loading, setLoading] = useState(true);
  const idCardCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (data && idCardCanvasRef.current) {
      QRCode.toCanvas(idCardCanvasRef.current, data.nomorUnik, {
        width: 100,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [data]);

  useEffect(() => {
    const fetchProfile = async () => {
        try {
            const res = await fetch("/api/profile", { cache: "no-store" });
            if (res.ok) {
                const json = await res.json();
                setMyProfile(json);
            }
        } catch (e) {
            console.error("fetchProfile error:", e);
        }
    };
    fetchProfile();

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/generus/${id}`, { cache: "no-store" });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Gagal mengambil data: ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        console.error("Admin Detail fetchData error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <GlobalLoading />;
  if (!data) return (
    <div className="error-state">
      <h2>Data tidak ditemukan</h2>
      <Link href="/admin/katalog" className="btn-back">Kembali ke Katalog PDKT</Link>
    </div>
  );

  return (
    <div className="detail-pdkt-wrapper">
      <div className="detail-bg no-print">
        <div className="detail-blob blob-blue"></div>
        <div className="detail-blob blob-pink"></div>
      </div>

      <div className="detail-container">
        <div className="detail-nav no-print">
          <Link href="/admin/katalog" className="nav-back-btn">
            <ArrowLeft size={18} />
            <span>Kembali ke Katalog PDKT Admin</span>
          </Link>

          <button className="export-btn-admin" onClick={() => window.print()}>
            <Download size={18} />
            <span>Ekspor ID Card (PDF)</span>
          </button>
        </div>

        <div className={`detail-card-main gender-${data.jenisKelamin?.toLowerCase()}`}>
          <div className="detail-header">
            <div className="profile-hero">
              <div className="profile-photo-frame">
                {data.foto ? (
                  <img src={data.foto} alt={data.nama} />
                ) : (
                  <div className="initials-hero">{data.nama.charAt(0)}</div>
                )}
                 <div className="category-tag-hero">
                  {["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(data.role || "") ? "Panitia" : data.kategoriUsia}
                </div>
              </div>

              <div className="profile-basic-info">
                <div className="verified-badge">
                  <ShieldCheck size={14} />
                  <span>Personal Verified PDKT 2026</span>
                </div>
                <h1 className="profile-name-hero">{data.nama}</h1>
                <div className="profile-id-hero">Nomor Unik: <b>{data.nomorUnik}</b></div>
                <div className="profile-loc-hero">
                  <MapPin size={16} />
                  <span>Desa {data.desaNama} &bull; Kelompok {data.kelompokNama}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-body-grid">
            <div className="detail-section">
              <div className="section-title">
                <User size={18} />
                <span>Informasi Pribadi</span>
              </div>
              <div className="info-cards-grid">
                <div className="info-card-item">
                  <Calendar className="icon-detail" />
                  <div>
                    <label>TTL</label>
                    <p>{data.tempatLahir || "-"}, {data.tanggalLahir || "-"}</p>
                  </div>
                </div>
                <div className="info-card-item">
                  <User className="icon-detail" />
                  <div>
                    <label>Umur</label>
                    <p>
                      {(() => {
                        if (!data.tanggalLahir) return "-";
                        const birthDate = new Date(data.tanggalLahir);
                        if (isNaN(birthDate.getTime())) return "-";
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const m = today.getMonth() - birthDate.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
                        return age + " Tahun";
                      })()}
                    </p>
                  </div>
                </div>
                <div className="info-card-item">
                  <Globe className="icon-detail" />
                  <div>
                    <label>Suku Bangsa</label>
                    <p>{data.suku || "-"}</p>
                  </div>
                </div>
                <div className="info-card-item">
                  <Heart className="icon-detail text-pink-500" />
                  <div>
                    <label>Status Pernikahan</label>
                    <p>{data.statusNikah || "Belum Menikah"}</p>
                  </div>
                </div>

              </div>
            </div>

            <div className="detail-section">
              <div className="section-title">
                <GraduationCap size={18} />
                <span>Pendidikan & Karir</span>
              </div>
              <div className="info-cards-grid">
                <div className="info-card-item full-width">
                  <GraduationCap className="icon-detail" />
                  <div>
                    <label>Pendidikan Terakhir</label>
                    <p>{data.pendidikan || "Belum diisi oleh generus."}</p>
                  </div>
                </div>
                <div className="info-card-item full-width">
                  <Briefcase className="icon-detail" />
                  <div>
                    <label>Pekerjaan Saat Ini</label>
                    <p>{data.pekerjaan || "Belum diisi oleh generus."}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-section passion">
              <div className="section-title">
                <Star size={18} />
                <span>Hobi & Preferensi</span>
              </div>
              <div className="passion-layout">
                <div className="passion-card-item">
                  <div className="passion-icon">
                    <Music size={24} />
                  </div>
                  <div className="passion-content">
                    <label>Hobi Favorit</label>
                    <p>{data.hobi || "Belum ada hobi yang ditampilkan."}</p>
                  </div>
                </div>
                <div className="passion-card-item">
                  <div className="passion-icon icon-utensils">
                    <Utensils size={24} />
                  </div>
                  <div className="passion-content">
                    <label>Makanan/Minuman Favorit</label>
                    <p>{data.makananMinumanFavorit || "Belum ada preferensi yang ditampilkan."}</p>
                  </div>
                </div>
                <div className="passion-card-item">
                  <div className="passion-icon icon-heart" style={{ background: '#fdf2f8', color: '#db2777' }}>
                    <Heart size={24} />
                  </div>
                  <div className="passion-content">
                    <label>Kriteria Pasangan</label>
                    <p>{data.kriteriaPasangan || "Belum ada kriteria pasangan yang dicantumkan."}</p>
                  </div>
                </div>
              </div>
            </div>

            {["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "pengurus_daerah"].includes(myProfile?.role || "") && (
              <div className="detail-section address-full">
                <div className="section-title">
                  <MapPin size={18} />
                  <span>Domisili / Alamat Lengkap</span>
                </div>
                <div className="address-container-hero">
                  <p className="address-text-hero">
                    {data.alamat || "Generus belum mencantumkan alamat lengkap pada profil mereka."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="detail-footer">
            <div className="footer-meta">
              <div className="meta-item">
                <Clock size={12} />
                <span>Terdaftar sejak: {data.createdAt ? new Date(data.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}</span>
              </div>
            </div>
            <div className="footer-copyright">
              &copy; 2026 GENCAR - Personal Branding Analytics
            </div>
          </div>
        </div>
      </div>

      <div className="pdkt-id-card-print">
        <div className={`id-card-comprehensive role-${
          ["pengurus_daerah", "desa", "kelompok"].includes(data.role || "") ? "pengurus" : 
          ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(data.role || "") ? "panitia" : 
          "peserta"
        }`}>
          <div className="id-watermark-container">
            <div className="id-watermark wm-1">
              {["pengurus_daerah", "desa", "kelompok"].includes(data.role || "") ? "PENGURUS" : 
               ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(data.role || "") ? "PANITIA" : 
               "PESERTA"}
            </div>
            <div className="id-watermark wm-2">
              {["pengurus_daerah", "desa", "kelompok"].includes(data.role || "") ? "PENGURUS" : 
               ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(data.role || "") ? "PANITIA" : 
               "PESERTA"}
            </div>
            <div className="id-watermark wm-3">
              {["pengurus_daerah", "desa", "kelompok"].includes(data.role || "") ? "PENGURUS" : 
               ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(data.role || "") ? "PANITIA" : 
               "PESERTA"}
            </div>
          </div>
          <div className="id-card-header">
            <div className="id-logo-box">
              <Sparkles size={18} fill="white" />
              <span>{["pengurus_daerah", "desa", "kelompok"].includes(data.role || "") ? "PENGURUS" : 
                    ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(data.role || "") ? "PANITIA" : 
                    "PESERTA"}</span>
            </div>
            <div className="id-org-name" style={{ textTransform: "uppercase" }}>
              {data.kota || "Jakarta Barat 2"} &bull; {data.mandiriDesaNama || data.desaNama || "Cengkareng"}
            </div>
          </div>

          <div className="id-card-main-content">
            <div className="id-photo-section">
              <div className="id-photo-frame">
                {data.foto ? <img src={data.foto} alt={data.nama} /> : <div className="id-initials">{data.nama.charAt(0)}</div>}
                 <div className="id-kategori-sticker">
                  {["pengurus_daerah", "desa", "kelompok"].includes(data.role || "") ? "Pengurus" : 
                   ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(data.role || "") ? "Panitia" : 
                   "Peserta"}
                </div>
              </div>
            </div>

            <div className="id-info-section">
              <h1 className="id-full-name">{data.nama}</h1>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "center", justifyContent: "center", marginTop: "5px" }}>
                <div className="id-member-code" style={{ fontSize: "16px", fontWeight: "900" }}>ID: {data.nomorUnik}</div>
                {data.nomorUrut && (
                  <div className="id-member-code" style={{ opacity: 1, color: "var(--primary)", background: "rgba(0,0,0,0.03)", padding: "4px 15px", borderRadius: "8px", border: "1.5px solid rgba(0,0,0,0.1)", fontSize: "18px", fontWeight: "950" }}>
                    NO. URUT: {data.nomorUrut}
                  </div>
                )}
              </div>
              <div className="id-qr-box" style={{ padding: "10px", borderRadius: "14px", marginTop: "12px", background: "white", width: "120px", margin: "12px auto" }}>
                <canvas ref={idCardCanvasRef} style={{ width: '100px', height: '100px' }} />
                <div className="id-qr-label" style={{ fontSize: "9px", marginTop: "6px", fontWeight: "900", color: "#1e3a8a", textTransform: "uppercase" }}>Verified Digital ID</div>
              </div>
            </div>

            <div className="id-footer-section">
              <div className="id-address-section">
                <label>Identifier Verification</label>
                <p>Digital Membership Identity - PDKT Version 2026</p>
              </div>
            </div>
          </div>

          <div className="id-card-footer">
            <div className="id-loc-pill">
              <MapPin size={14} />
              <span>{data.desaNama} &bull; {data.kelompokNama}</span>
            </div>
            <div className="id-footer-right">
              GENCAR &copy; 2026
            </div>
          </div>
          <div className="id-card-seal" />
        </div>
      </div>

      <style jsx>{`
        .detail-pdkt-wrapper {
          min-height: 100vh;
          background: #f8fafc;
          position: relative;
          overflow: hidden;
          padding: 40px 20px;
        }

        .detail-bg { position: absolute; inset: 0; z-index: 0; }
        .detail-blob { position: absolute; filter: blur(120px); opacity: 0.15; border-radius: 50%; }
        .blob-blue { width: 600px; height: 600px; background: #3b82f6; top: -100px; right: -100px; }
        .blob-pink { width: 500px; height: 500px; background: #ec4899; bottom: -100px; left: -100px; }

        .detail-container { max-width: 1000px; margin: 0 auto; position: relative; z-index: 10; }
        .detail-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .nav-back-btn {
          display: inline-flex; align-items: center; gap: 10px; color: #64748b;
          text-decoration: none; font-weight: 600; font-size: 14px; transition: color 0.2s;
        }
        .nav-back-btn:hover { color: #2563eb; }

        .export-btn-admin {
          display: flex; align-items: center; gap: 8px; background: #1e293b;
          color: white; padding: 10px 20px; border-radius: 14px;
          font-size: 13px; font-weight: 700; cursor: pointer; border: none;
          transition: all 0.3s;
        }
        .export-btn-admin:hover { background: #111827; transform: translateY(-2px); }

        .detail-card-main {
          background: white; border-radius: 48px; overflow: hidden;
          box-shadow: 0 50px 100px -20px rgba(0,0,0,0.08); 
          border: 1px solid #f1f5f9;
        }

        .detail-header {
          padding: 60px 60px 40px;
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          position: relative;
          color: white;
        }
        .gender-p .detail-header {
          background: linear-gradient(135deg, #be185d, #ec4899);
        }

        .profile-hero { display: flex; gap: 40px; align-items: center; position: relative; z-index: 5; }
        
        .profile-photo-frame {
          width: 180px; height: 180px; border-radius: 56px; overflow: hidden;
          background: #f1f5f9; position: relative; flex-shrink: 0;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 6px solid rgba(255,255,255,0.3);
        }
        .profile-photo-frame img { width: 100%; height: 100%; object-fit: cover; }
        .initials-hero {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          background: #3b82f6; color: white;
          font-size: 80px; font-weight: 900;
        }
        .gender-p .initials-hero { background: #ec4899; }

        .category-tag-hero {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: rgba(255,255,255,0.9); padding: 6px 0; text-align: center;
          font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b;
        }

        .verified-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.2); color: white; padding: 6px 14px;
          border-radius: 20px; font-size: 10px; font-weight: 800;
          text-transform: uppercase; margin-bottom: 16px;
          backdrop-filter: blur(10px);
        }

        .profile-name-hero { font-size: 40px; font-weight: 900; color: white; margin-bottom: 5px; line-height: 1.1; letter-spacing: -1px; }
        .profile-id-hero { font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 15px; font-family: monospace; }
        .profile-loc-hero { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500; }
        .profile-loc-hero svg { opacity: 0.8; }

        .detail-body-grid { padding: 40px 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .detail-section { display: flex; flex-direction: column; gap: 20px; }
        .section-title { display: flex; align-items: center; gap: 10px; color: #1e293b; font-weight: 800; font-size: 18px; }
        .section-title svg { color: #3b82f6; }
        .gender-p .section-title svg { color: #ec4899; }

        .info-cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-card-item {
          background: #f8fafc; padding: 20px; border-radius: 20px;
          display: flex; gap: 15px; align-items: flex-start; border: 1px solid #f1f5f9;
        }
        .full-width { grid-column: span 2; }
        .icon-detail { width: 20px; height: 20px; color: #3b82f6; opacity: 0.6; margin-top: 2px; }
        .gender-p .icon-detail { color: #ec4899; }
        .info-card-item label { display: block; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
        .info-card-item p { font-size: 15px; font-weight: 700; color: #334155; line-height: 1.4; }

        .passion-layout { display: flex; flex-direction: column; gap: 15px; }
        .passion-card-item {
          background: linear-gradient(135deg, #3b82f60d, #60a5fa0d);
          padding: 24px; border-radius: 24px; display: flex; gap: 20px; align-items: center;
          border: 1px solid #3b82f61a;
        }
        .gender-p .passion-card-item { background: linear-gradient(135deg, #f472b60d, #fb923c0d); border-color: #ec48991a; }
        .passion-icon {
          width: 50px; height: 50px; border-radius: 16px; background: white;
          display: flex; align-items: center; justify-content: center; color: #3b82f6;
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.1);
        }
        .gender-p .passion-icon { color: #ec4899; box-shadow: 0 10px 20px rgba(236, 72, 153, 0.1); }
        .passion-content label { display: block; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
        .passion-content p { font-size: 18px; font-weight: 800; color: #1e293b; }

        .address-container-hero {
          background: #f8fafc; padding: 30px; border-radius: 28px; border: 2px dashed #e2e8f0;
        }
        .address-text-hero { font-size: 18px; color: #475569; line-height: 1.6; font-style: italic; font-weight: 500; }

        .detail-footer {
          padding: 40px 60px; background: #fcfdfe; border-top: 1px solid #f8fafc;
          display: flex; justify-content: space-between; align-items: center;
        }

        .id-card-comprehensive {
          width: 10.5cm; height: 17cm; background: #2563eb; border: 1px solid #1e40af;
          border-radius: 12mm; position: relative; overflow: hidden; display: flex; flex-direction: column;
          margin: 0 auto; color: white;
        }

        .id-card-comprehensive.role-peserta {
          background: linear-gradient(180deg, #fce4ec 0%, #f48fb1 100%);
          border: 1px solid #f06292;
          color: #880e4f;
        }
        .id-card-comprehensive.role-pengurus {
          background: linear-gradient(180deg, #e8f5e9 0%, #81c784 100%);
          border: 1px solid #4caf50;
          color: #1b5e20;
        }
        .id-card-comprehensive.role-panitia {
          background: linear-gradient(180deg, #e8f5e9 0%, #16a34a 100%);
          border: 1px solid #15803d;
          color: #064e3b;
        }

        .id-watermark-container {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          align-items: center;
          pointer-events: none;
          z-index: 1;
        }

        .id-watermark {
          font-size: 80px;
          font-weight: 950;
          opacity: 0.08;
          transform: rotate(-30deg);
          white-space: nowrap;
          letter-spacing: 10px;
          text-transform: uppercase;
        }
        .wm-1 { margin-top: 100px; margin-left: -50px; }
        .wm-2 { margin-left: 50px; }
        .wm-3 { margin-bottom: 100px; margin-left: -50px; }

        .role-panitia .id-watermark { opacity: 0.12; color: #0d47a1; }
        .role-peserta .id-watermark { color: #880e4f; }
        .role-pengurus .id-watermark { color: #1b5e20; }

        .id-card-header {
           height: 2.5cm; padding: 0 30px; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px;
           background: rgba(0,0,0,0.1);
           position: relative;
           z-index: 5;
        }
        .role-peserta .id-card-header { background: linear-gradient(135deg, #be185d, #ec4899); }
        .role-pengurus .id-card-header { background: linear-gradient(135deg, #2e7d32, #4caf50); }
        .role-panitia .id-card-header { background: linear-gradient(135deg, #0d47a1, #2196f3); }

        .id-logo-box { display: flex; align-items: center; gap: 10px; }
        .id-logo-box span { font-weight: 950; font-size: 20px; letter-spacing: 2px; }
        .id-org-name { font-size: 11px; font-weight: 700; opacity: 0.9; text-transform: uppercase; }

        .id-card-main-content { flex: 1; display: flex; flex-direction: column; padding: 30px; align-items: center; gap: 20px; position: relative; z-index: 5; }
        .id-photo-section { display: flex; justify-content: center; margin-top: 10px; }
        .id-photo-frame {
          width: 4.5cm; height: 6cm; background: #f1f5f9; border-radius: 10mm;
          overflow: hidden; border: 4px solid white; box-shadow: 0 10px 20px rgba(0,0,0,0.1); position: relative;
        }
        .id-photo-frame img { width: 100%; height: 100%; object-fit: cover; }
        .id-initials { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #64748b; font-size: 60px; font-weight: 950; }
        .id-kategori-sticker { 
          position: absolute; bottom: 0; left: 0; right: 0; 
          background: rgba(255,255,255,0.95); padding: 10px 5px; 
          text-align: center; font-size: 16px; font-weight: 950; 
          color: #1e40af; text-transform: uppercase;
          letter-spacing: 1px;
        }
        .role-peserta .id-kategori-sticker { color: #be185d; }
        .role-pengurus .id-kategori-sticker { color: #2e7d32; }
        .role-panitia .id-kategori-sticker { color: #0d47a1; }

        .id-info-section { flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 15px; }
        .id-full-name { font-size: 24px; font-weight: 950; line-height: 1.1; margin-bottom: 5px; }
        .role-peserta .id-full-name { color: #1e3a8a; }
        .role-pengurus .id-full-name { color: #1b5e20; }
        .role-panitia .id-full-name { color: #0d47a1; }

        .id-member-code { font-size: 14px; font-weight: 800; opacity: 0.7; font-family: monospace; }
        .role-panitia .id-member-code { color: #bbdefb; }

        .id-qr-box { display: flex; flex-direction: column; align-items: center; gap: 8px; background: white; padding: 10px; border-radius: 15px; margin: 10px 0; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .id-qr-label { font-size: 9px; font-weight: 800; color: #1e40af; text-transform: uppercase; }

        .id-footer-section { width: 100%; margin-top: auto; }
        .id-address-section { padding: 15px 0; border-top: 2px dashed rgba(0,0,0,0.1); }
        .role-panitia .id-address-section { border-top-color: rgba(255,255,255,0.2); }

        .id-address-section label { display: block; font-size: 10px; font-weight: 800; opacity: 0.6; text-transform: uppercase; margin-bottom: 4px; }
        .id-address-section p { font-size: 13px; line-height: 1.5; font-weight: 600; }

        .id-card-footer {
          height: 2.2cm; padding: 0 30px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(0,0,0,0.05);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
          position: relative; z-index: 5;
        }
        .role-peserta .id-card-footer { background: #1e3a8a; }
        .role-pengurus .id-card-footer { background: #1b5e20; }
        .role-panitia .id-card-footer { background: #0d47a1; }

        .id-loc-pill {
           display: flex; align-items: center; gap: 8px; color: white; padding: 8px 18px; border-radius: 30px; font-size: 13px; font-weight: 800;
           background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
        }
        .id-footer-right { font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; }
        .id-card-seal { position: absolute; bottom: -40px; right: -40px; width: 150px; height: 150px; background: #cbd5e1; opacity: 0.1; border-radius: 50%; }

        @media print {
          @page { size: landscape; margin: 15mm; }
          .no-print { display: none !important; }
          .detail-pdkt-wrapper { background: white !important; padding: 0 !important; }
          .detail-bg, .detail-container, .detail-footer { display: none !important; }
          .pdkt-id-card-print {
            display: flex !important; opacity: 1 !important; position: static !important;
            justify-content: center !important; align-items: center !important; height: 100vh !important;
          }
          .id-card-comprehensive { break-inside: avoid; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .footer-meta { display: flex; gap: 20px; }
        .meta-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #cbd5e1; font-weight: 600; }
        .footer-copyright { font-size: 12px; color: #cbd5e1; font-weight: 600; }

        .error-state { text-align: center; padding: 100px 20px; }
        .btn-back { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; border-radius: 10px; text-decoration: none; }

        @media (max-width: 850px) {
          .detail-body-grid { grid-template-columns: 1fr; padding: 30px; gap: 20px; }
          .profile-hero { flex-direction: column; text-align: center; gap: 20px; }
          .detail-header { padding: 40px 30px; }
          .profile-name-hero { font-size: 30px; }
          .detail-footer { flex-direction: column; gap: 20px; text-align: center; padding: 30px; }
        }

        @media (max-width: 600px) {
          .detail-header { padding: 30px 20px; }
          .profile-photo-frame { width: 140px; height: 140px; border-radius: 40px; }
          .profile-name-hero { font-size: 26px; }
          .detail-body-grid { padding: 25px 15px; }
          .info-cards-grid { grid-template-columns: 1fr; gap: 12px; }
          .full-width { grid-column: span 1; }
          .passion-card-item { padding: 18px; gap: 15px; }
          .passion-icon { width: 40px; height: 40px; font-size: 16px; }
          .passion-content p { font-size: 15px; }
          .address-container-hero { padding: 20px; }
          .address-text-hero { font-size: 15px; }
        }
      `}</style>
    </div>
  );
}
