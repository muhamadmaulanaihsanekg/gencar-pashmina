"use client";

import { useState, useEffect } from "react";
import { MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";

export default function SaranRomanticRoom() {
    const [saranList, setSaranList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterKepada, setFilterKepada] = useState<string>("Semua");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/mandiri/saran");
            if (res.ok) {
                const json = await res.json();
                setSaranList(Array.isArray(json) ? json : []);
            }
        } catch (error) {
            console.error("Error fetching saran:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: 'Hapus Saran?',
            text: "Saran yang dihapus tidak dapat dikembalikan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Ya, Hapus!'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/mandiri/saran?id=${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    Swal.fire('Terhapus!', 'Saran telah dihapus.', 'success');
                    fetchData();
                } else {
                    Swal.fire('Gagal', 'Gagal menghapus saran', 'error');
                }
            } catch (err) {
                Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
            }
        }
    };

    const filteredSaran = saranList.filter(s => {
        if (filterKepada === "Semua") return true;
        const standardOptions = ["Tim Acara", "Tim Panggilan Ta'aruf", "Tim PNKB dan Ibu Gambuh"];
        if (filterKepada === "Lainnya") return s.kepada && !standardOptions.includes(s.kepada);
        return s.kepada === filterKepada;
    });

    return (
        <div className="saran-layout">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Link href="/mandiri/panggilan" className="back-button">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1>Saran & Masukan</h1>
                        <p>Kumpulan saran dan masukan dari peserta sesi Ta&apos;aruf</p>
                    </div>
                </div>
            </header>

            <div className="content-container">
                <div className="admin-card history-box">
                    <div className="card-header">
                        <div className="header-title">
                            <MessageSquare size={18} color="#3b82f6" />
                            <h3>Saran & Masukan Sesi Ta&apos;aruf</h3>
                        </div>
                        <span className="queue-badge" style={{ margin: 0 }}>
                            {filteredSaran.length} Masukan
                        </span>
                    </div>
                    
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Filter Kepada:</span>
                        <select
                            value={filterKepada}
                            onChange={(e) => setFilterKepada(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', background: 'white', color: '#1e293b', minWidth: '200px' }}
                        >
                            <option value="Semua">Semua</option>
                            <option value="Tim Acara">Tim Acara</option>
                            <option value="Tim Panggilan Ta'aruf">Tim Panggilan Ta&apos;aruf</option>
                            <option value="Tim PNKB dan Ibu Gambuh">Tim PNKB dan Ibu Gambuh</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>

                    <div className="card-body">
                        {loading ? (
                            <div className="empty-state">
                                <p>Memuat data...</p>
                            </div>
                        ) : filteredSaran.length === 0 ? (
                            <div className="empty-state">
                                <MessageSquare size={32} />
                                <p>Tidak ada saran/masukan yang sesuai dengan filter.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', padding: '20px' }}>
                                {filteredSaran.map((saran, idx) => (
                                    <div key={idx} style={{ 
                                        background: '#fff', 
                                        padding: '20px', 
                                        borderRadius: '16px', 
                                        border: '1px solid #e2e8f0', 
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '12px',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ 
                                                        width: '32px', height: '32px', borderRadius: '50%', 
                                                        background: saran.isAnonim ? '#f1f5f9' : '#e0f2fe',
                                                        color: saran.isAnonim ? '#94a3b8' : '#0369a1',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 'bold', fontSize: '14px'
                                                    }}>
                                                        {saran.isAnonim ? '?' : (saran.nama ? saran.nama.charAt(0).toUpperCase() : '?')}
                                                    </div>
                                                    <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '15px' }}>
                                                        {saran.isAnonim ? "Anonim" : (saran.nama || "Anonim")}
                                                    </span>
                                                </div>
                                                {saran.kepada && (
                                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'flex', gap: '4px', alignItems: 'center', marginLeft: '42px' }}>
                                                        <span style={{ color: '#94a3b8' }}>Kepada:</span>
                                                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>{saran.kepada}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, background: '#f8fafc', padding: '4px 10px', borderRadius: '20px' }}>
                                                    {new Date(saran.createdAt.replace(' ', 'T') + (!saran.createdAt.endsWith('Z') ? 'Z' : '')).toLocaleString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                                                </span>
                                                <button 
                                                    onClick={() => handleDelete(saran.id)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px', transition: '0.2s' }}
                                                    title="Hapus Saran"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                            "{saran.saran}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .saran-layout { width: 100%; max-width: 1400px; padding: 20px; margin: 0 auto; min-height: 100vh; box-sizing: border-box; }
                .page-header { margin-bottom: 25px; }
                .page-header h1 { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 5px 0; }
                .page-header p { color: #64748b; margin: 0; font-size: 14px; }
                
                .back-button {
                    display: flex; align-items: center; justify-content: center;
                    width: 40px; height: 40px;
                    background: white; border: 1px solid #e2e8f0; border-radius: 12px;
                    color: #64748b; transition: all 0.2s;
                }
                .back-button:hover { background: #f8fafc; color: #1e293b; border-color: #cbd5e1; }

                .content-container { width: 100%; }
                
                .admin-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03); width: 100%; }
                .card-header { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fff; }
                .header-title { display: flex; align-items: center; gap: 12px; color: #1e293b; }
                .header-title h3 { font-size: 16px; font-weight: 800; margin: 0; }
                .queue-badge { background: #fef2f2; color: #f43f5e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; }
                
                .empty-state { text-align: center; color: #94a3b8; padding: 60px 20px; font-style: italic; font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 15px; }
            `}</style>
        </div>
    );
}
