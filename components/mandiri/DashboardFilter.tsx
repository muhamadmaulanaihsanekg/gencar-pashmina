"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";

interface DashboardFilterProps {
  cities: string[];
  villages: { id: number; nama: string; kota: string }[];
  groups?: { id: number; nama: string; desa: string; kota: string }[];
}

export default function DashboardFilter({ cities, villages, groups = [] }: DashboardFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [city, setCity] = useState(searchParams.get("city") || "");
  const [village, setVillage] = useState(searchParams.get("village") || "");
  const [group, setGroup] = useState(searchParams.get("group") || "");
  const [gender, setGender] = useState(searchParams.get("gender") || "");

  const filteredVillages = city
    ? villages.filter((v) => v.kota === city)
    : [];

  const filteredGroups = village
    ? groups.filter((g) => g.desa === village)
    : [];

  const handleFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (city) params.set("city", city);
    else params.delete("city");
    
    if (village) params.set("village", village);
    else params.delete("village");
    
    if (group) params.set("group", group);
    else params.delete("group");
    
    if (gender) params.set("gender", gender);
    else params.delete("gender");
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    setCity("");
    setVillage("");
    setGroup("");
    setGender("");
    router.push(pathname);
  };

  return (
    <div className="dashboard-filter-container">
      <div className="filter-header">
        <Filter size={18} />
        <span>Filter Data Kehadiran</span>
      </div>
      <div className="filter-grid">
        <div className="filter-item">
          <label>Kota/Daerah</label>
          <select value={city} onChange={(e) => { setCity(e.target.value); setVillage(""); setGroup(""); }}>
            <option value="">Semua Kota</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>Desa</label>
          <select value={village} onChange={(e) => { setVillage(e.target.value); setGroup(""); }}>
            <option value="">Semua Desa</option>
            {filteredVillages.map((v) => (
              <option key={v.id} value={v.nama}>{v.nama}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>Kelompok</label>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">Semua Kelompok</option>
            {filteredGroups.map((g) => (
              <option key={g.id} value={g.nama}>{g.nama}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>Jenis Kelamin</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Semua</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div className="filter-actions">
          <button className="btn-filter-apply" onClick={handleFilter}>Terapkan Filter</button>
          <button className="btn-filter-reset" onClick={handleReset}>
            <X size={14} /> Reset
          </button>
        </div>
      </div>

      <style jsx>{`
        .dashboard-filter-container {
          background: #ffffff;
          padding: 1.5rem;
          border-radius: 1rem;
          border: 1px solid #e6dfd3;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 16px rgba(38, 57, 45, 0.04);
        }
        .filter-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: #26392d;
          margin-bottom: 1.25rem;
          font-size: 1rem;
          font-family: 'Cormorant Garamond', Georgia, serif;
          letter-spacing: 0.02em;
        }
        .filter-header span {
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .filter-header :global(svg) {
          color: #c5a059;
        }
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem;
          align-items: flex-end;
        }
        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .filter-item label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #5e6d62;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .filter-item select {
          padding: 0.625rem;
          border-radius: 0.5rem;
          border: 1px solid #e6dfd3;
          font-size: 0.9rem;
          outline: none;
          background-color: #faf7f2;
          color: #1f2b23;
          transition: all 0.2s;
        }
        .filter-item select:focus {
          border-color: #3d5a45;
          box-shadow: 0 0 0 3px rgba(61, 90, 69, 0.15);
          background-color: #ffffff;
        }
        .filter-actions {
          display: flex;
          gap: 0.75rem;
        }
        .btn-filter-apply {
          background: linear-gradient(135deg, #3d5a45 0%, #26392d 100%);
          color: #faf7f2;
          border: 1px solid rgba(197, 160, 89, 0.4);
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
        }
        .btn-filter-apply:hover {
          background: linear-gradient(135deg, #2e4434 0%, #1a271f 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(38, 57, 45, 0.25);
        }
        .btn-filter-reset {
          background: #f5f0e6;
          color: #5e6d62;
          border: 1px solid #e6dfd3;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: all 0.2s;
        }
        .btn-filter-reset:hover {
          background: #eae2d3;
          color: #1f2b23;
        }
        @media (max-width: 640px) {
          .filter-grid {
            grid-template-columns: 1fr;
          }
          .filter-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
