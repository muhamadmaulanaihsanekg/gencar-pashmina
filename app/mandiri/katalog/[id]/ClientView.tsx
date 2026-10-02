"use client";




import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Calendar, Heart, Globe, GraduationCap, Briefcase, Music, UtilityPole as Utensils, Star, ShieldCheck, Sparkles, Lock } from "lucide-react";
import Link from "next/link";

export default function PublicKatalogDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [hasAttended, setHasAttended] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Check attendance first
        const storedUnik = localStorage.getItem("attended_nomor_unik");
        if (!storedUnik) {
            setVerifying(false);
            return;
        }

        const storedToken = localStorage.getItem("attended_session_token") || "";
        const authRes = await fetch(`/api/public/mandiri/katalog/check-status?nomorUnik=${encodeURIComponent(storedUnik)}&sessionToken=${encodeURIComponent(storedToken)}`);
        const authData = await authRes.json();
        if (authData.status !== "attended") {
            setVerifying(false);
            return;
        }
        setHasAttended(true);
        setVerifying(false);

        const res = await fetch(`/api/public/mandiri/katalog/${id}`);
        if (res.status === 403) {
          setIsLocked(true);
          return;
        }

        if (!res.ok) throw new Error("Gagal mengambil data");
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        console.error("fetchData error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLocked) {
    return (
      <div className="locked-container">
        <div className="locked-card">
          <Lock size={48} className="lock-icon" />
          <h1>Katalog Ditutup</h1>
          <p>Maaf, katalog peserta saat ini tidak dibuka untuk publik.</p>
          <Link href="/" className="home-btn">Kembali ke Beranda</Link>
        </div>
        <style jsx>{`
          .locked-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; padding: 20px; }
          .locked-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 400px; border: 1px solid #e2e8f0; }
          .lock-icon { color: #ef4444; margin-bottom: 20px; }
          h1 { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
          p { color: #64748b; margin-bottom: 24px; line-height: 1.6; }
          .home-btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 700; text-decoration: none; transition: 0.2s; }
          .home-btn:hover { background: #2563eb; transform: translateY(-2px); }
        `}</style>
      </div>
    );
  }

  if (verifying || (loading && !data)) {
    return (
        <div className="loading-screen">
            <div className="spinner-large"></div>
            <style jsx>{`
              .loading-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; flex-direction: column; }
              .spinner-large { width: 50px; height: 50px; border: 5px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
      );
  }

  if (!hasAttended) {
    return (
      <div className="login-backdrop">
        <LoginModal onVerified={() => setHasAttended(true)} />
        <style jsx>{`
          .login-backdrop {
            min-height: 100vh;
            background: #f1f5f9;
            background-image: 
              radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.1) 0px, transparent 50%),
              radial-gradient(at 100% 0%, rgba(236, 72, 153, 0.1) 0px, transparent 50%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
        `}</style>
      </div>
    );
  }

  function LoginModal({ onVerified }: { onVerified: () => void }) {
    const [unik, setUnik] = useState("");
    const [status, setStatus] = useState<"idle" | "verifying" | "error" | "waiting">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const verify = async () => {
      if (!unik) return;
      setStatus("verifying");
      let deviceId = localStorage.getItem("mandiri_device_id");
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("mandiri_device_id", deviceId);
      }

      try {
        const res = await fetch(`/api/public/mandiri/katalog/check-status?nomorUnik=${encodeURIComponent(unik)}&deviceId=${encodeURIComponent(deviceId)}`);
        const resData = await res.json();
        if (resData.status === "attended") {
          localStorage.setItem("attended_nomor_unik", resData.nomorUnik || unik);
          localStorage.setItem("attended_session_token", resData.sessionToken);
          onVerified();
        } else if (resData.status === "waiting") {
          setStatus("waiting");
          setErrorMsg("Silakan lakukan absensi terlebih dahulu di meja panitia.");
        } else if (resData.status === "multi_login") {
            setErrorMsg("Nomor Peserta ini sudah digunakan di perangkat lain (Single Session).");
            setStatus("error");
        } else if (resData.status === "not_found") {
          setErrorMsg("Nomor Peserta tidak ditemukan. Pastikan Anda sudah terdaftar.");
          setStatus("error");
        } else {
          setErrorMsg(resData.error || "Terjadi kesalahan saat verifikasi.");
          setStatus("error");
        }
      } catch (e) {
        setErrorMsg("Gagal terhubung ke server.");
        setStatus("error");
      }
    };

    return (
        <div className="modal-box">
          <div className="modal-header">
            <div className="icon-badge">🔐</div>
            <h2>Akses Terbatas</h2>
            <p>Silakan login untuk melihat profil lengkap</p>
          </div>

          <div className="modal-body">
            <div className="input-group">
                <input 
                    type="number" 
                    placeholder="Masukkan Nomor Peserta" 
                    value={unik}
                    onChange={(e) => setUnik(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && verify()}
                />
            </div>
            
            <button className="login-btn" onClick={verify} disabled={status === "verifying" || !unik}>
                {status === "verifying" ? "Memeriksa..." : "Buka Profil"}
            </button>

            {status === "waiting" && <div className="warning-alert">{errorMsg}</div>}
            {status === "error" && <div className="error-alert">{errorMsg}</div>}
          </div>

          <div className="modal-footer">
              <Link href="/mandiri/katalog">Kembali ke Katalog</Link>
          </div>

          <style jsx>{`
            .modal-box {
                background: white;
                width: 100%;
                max-width: 400px;
                padding: 40px;
                border-radius: 32px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                text-align: center;
                border: 1px solid #e2e8f0;
                animation: fadeIn 0.4s ease-out;
            }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            
            .modal-header { margin-bottom: 30px; }
            .icon-badge { font-size: 48px; margin-bottom: 20px; }
            h2 { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
            p { color: #64748b; font-size: 14px; }

            .modal-body { display: flex; flex-direction: column; gap: 16px; }
            input {
                width: 100%;
                border: 2px solid #e2e8f0;
                padding: 16px;
                border-radius: 16px;
                font-size: 16px;
                font-weight: 600;
                text-align: center;
                transition: 0.2s;
            }
            input:focus { border-color: #3b82f6; outline: none; background: #f8fafc; }
            
            .login-btn {
                width: 100%;
                background: #3b82f6;
                color: white;
                border: none;
                padding: 16px;
                border-radius: 16px;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                transition: 0.2s;
            }
            .login-btn:hover { background: #2563eb; transform: translateY(-2px); }
            .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

            .error-alert { padding: 12px; background: #fef2f2; color: #b91c1c; border-radius: 12px; font-size: 13px; font-weight: 600; }
            .warning-alert { padding: 12px; background: #fffbeb; color: #92400e; border-radius: 12px; font-size: 13px; font-weight: 600; }

            .modal-footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
            .modal-footer a { color: #3b82f6; text-decoration: none; font-weight: 700; font-size: 14px; }
          `}</style>
        </div>
    );
}

  return (
    <div className="detail-wrapper">
      <div className="detail-bg">
        <div className="detail-blob blob-blue"></div>
        <div className="detail-blob blob-pink"></div>
      </div>

      <div className="detail-container">
        <div className="detail-nav">
          <Link href="/mandiri/katalog" className="back-btn">
            <ArrowLeft size={18} />
            <span>Kembali ke Katalog</span>
          </Link>
        </div>

        <div className={`detail-card gender-${data?.jenisKelamin?.toLowerCase()}`}>
          <div className="detail-header">
            <div className="profile-hero">
              <div className="photo-frame">
                {data.foto ? (
                  <img src={data.foto} alt={data.nama} />
                ) : (
                  <div className="initials-hero">{data.nama.charAt(0)}</div>
                )}
                <div className="tag-hero">{data.kategoriUsia}</div>
              </div>

              <div className="profile-basic">
                <div className="verified-badge">
                  <ShieldCheck size={14} />
                  <span>Public Katalog Mandiri</span>
                </div>
                <h1 className="name-hero">{data.nama}</h1>
                <div className="id-hero">
                    ID: <b>{data.nomorUnik}</b>
                    {data.nomorUrut && <span className="no-urut">No. Urut: {data.nomorUrut}</span>}
                </div>
                <div className="loc-hero">
                  <MapPin size={16} />
                  <span>{data.mandiriDesaKota || "-"} • {data.mandiriDesaNama || data.desaNama || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-body">
            <div className="section">
              <div className="section-title"><Calendar size={18} /><span>Informasi Pribadi</span></div>
              <div className="info-grid">
                <div className="info-item">
                  <label>TTL</label>
                  <p>{data.tempatLahir || "-"}, {data.tanggalLahir || "-"}</p>
                </div>
                <div className="info-item">
                  <label>Suku Bangsa</label>
                  <p>{data.suku || "-"}</p>
                </div>
                <div className="info-item">
                  <label>Status Pernikahan</label>
                  <p>{data.statusNikah || "Belum Menikah"}</p>
                </div>
                <div className="info-item">
                    <label>Pendidikan</label>
                    <p>{data.pendidikan || "-"}</p>
                </div>
                <div className="info-item">
                    <label>Pekerjaan</label>
                    <p>{data.pekerjaan || "-"}</p>
                </div>
                <div className="info-item full">
                    <label>Alamat Lengkap</label>
                    <p>{data.alamat || "-"}</p>
                </div>
              </div>
            </div>

            <div className="section">
                <div className="section-title"><Star size={18} /><span>Hobi & Preferensi</span></div>
                <div className="passion-grid">
                    <div className="passion-item">
                        <div className="passion-icon"><Music size={24} /></div>
                        <div className="passion-info">
                            <label>Hobi Favorit</label>
                            <p>{data.hobi || "-"}</p>
                        </div>
                    </div>
                    <div className="passion-item">
                        <div className="passion-icon"><Utensils size={24} /></div>
                        <div className="passion-info">
                            <label>Makanan Favorit</label>
                            <p>{data.makananMinumanFavorit || "-"}</p>
                        </div>
                    </div>
                    <div className="passion-item">
                        <div className="passion-icon"><Heart size={24} /></div>
                        <div className="passion-info">
                            <label>Kriteria Pasangan</label>
                            <p>{data.kriteriaPasangan || "-"}</p>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .detail-wrapper { min-height: 100vh; background: #f8fafc; position: relative; overflow: hidden; padding: 40px 20px; font-family: 'Inter', sans-serif; }
        .detail-bg { position: absolute; inset: 0; z-index: 0; }
        .detail-blob { position: absolute; filter: blur(120px); opacity: 0.15; border-radius: 50%; }
        .blob-blue { width: 500px; height: 500px; background: #3b82f6; top: -100px; right: -100px; }
        .blob-pink { width: 400px; height: 400px; background: #ec4899; bottom: -100px; left: -100px; }
        
        .detail-container { max-width: 800px; margin: 0 auto; position: relative; z-index: 10; }
        .detail-nav { margin-bottom: 24px; }
        .back-btn { display: inline-flex; align-items: center; gap: 10px; color: #64748b; text-decoration: none; font-weight: 600; transition: 0.2s; }
        .back-btn:hover { color: #3b82f6; }

        .detail-card { background: white; border-radius: 40px; overflow: hidden; box-shadow: 0 40px 80px -20px rgba(0,0,0,0.08); border: 1px solid #f1f5f9; }
        .detail-header { padding: 50px; background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; }
        .gender-p .detail-header { background: linear-gradient(135deg, #be185d, #ec4899); }
        
        .profile-hero { display: flex; gap: 30px; align-items: center; }
        .photo-frame { width: 140px; height: 140px; border-radius: 40px; overflow: hidden; background: #f1f5f9; position: relative; border: 4px solid rgba(255,255,255,0.3); }
        .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
        .initials-hero { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #3b82f6; font-size: 60px; font-weight: 900; }
        .gender-p .initials-hero { background: #ec4899; }
        .tag-hero { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.9); padding: 4px 0; text-align: center; font-size: 10px; font-weight: 800; color: #64748b; }

        .verified-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 12px; }
        .name-hero { font-size: 32px; font-weight: 900; margin-bottom: 4px; }
        .id-hero { font-size: 13px; opacity: 0.8; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
        .no-urut { background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px; }
        .loc-hero { display: flex; align-items: center; gap: 8px; font-size: 15px; }

        .detail-body { padding: 40px; }
        .section { margin-bottom: 30px; }
        .section-title { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; color: #1e293b; margin-bottom: 20px; }
        .section-title span { color: #1e293b; }
        .section-title :global(svg) { color: #3b82f6; }
        .gender-p .section-title :global(svg) { color: #ec4899; }

        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { background: #f8fafc; padding: 15px; border-radius: 16px; border: 1px solid #f1f5f9; }
        .info-item.full { grid-column: span 2; }
        .info-item label { display: block; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
        .info-item p { font-size: 14px; font-weight: 700; color: #334155; }

        .passion-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .passion-item { background: #f8fafc; padding: 20px; border-radius: 20px; display: flex; gap: 15px; align-items: center; border: 1px solid #f1f5f9; }
        .passion-icon { width: 44px; height: 44px; border-radius: 12px; background: white; display: flex; align-items: center; justify-content: center; color: #3b82f6; box-shadow: 0 4px 6px rgba(0,0,0,0.03); }
        .gender-p .passion-icon { color: #ec4899; }
        .passion-info label { display: block; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
        .passion-info p { font-size: 15px; font-weight: 800; color: #1e293b; }

        .loading, .error { text-align: center; padding: 100px; font-size: 18px; color: #64748b; }

        @media (max-width: 640px) {
          .profile-hero { flex-direction: column; text-align: center; }
          .photo-frame { margin: 0 auto; }
          .info-grid, .passion-grid { grid-template-columns: 1fr; }
          .info-item.full { grid-column: span 1; }
          .detail-header, .detail-body { padding: 30px 20px; }
          .name-hero { font-size: 24px; }
        }
      `}</style>
    </div>
  );
}
