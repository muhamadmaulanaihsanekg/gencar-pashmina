"use client";

import { useState, useEffect, useRef } from "react";

interface SearchableSelectOption {
  id: string | number;
  name: string;
}

export default function SearchableSelect({
  placeholder,
  options,
  value,
  onChange,
  disabled,
  onAddNew,
}: {
  placeholder: string;
  options: SearchableSelectOption[];
  value: string | number;
  onChange: (val: string) => void;
  disabled?: boolean;
  onAddNew?: (name: string) => Promise<{ id: string | number; name: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(opt =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => String(opt.id) === String(value));
  const showAddNew = onAddNew && search.trim() && !options.some(opt => opt.name.toLowerCase() === search.trim().toLowerCase());

  return (
    <div ref={wrapperRef} className="searchable-select-container" style={{ position: 'relative', width: '100%' }}>
      <div
        className="form-control"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#f1f5f9' : '#fff',
          opacity: disabled ? 0.7 : 1,
          minHeight: '44px',
          padding: '10px 12px',
          borderRadius: '12px',
          border: '1px solid #cbd5e1',
          fontSize: '14px',
          color: selectedOption ? '#0f172a' : '#64748b'
        }}
      >
        <span>{selectedOption ? selectedOption.name : placeholder}</span>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div
          className="dropdown-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            marginTop: '6px',
            maxHeight: '220px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <input
            type="text"
            className="form-control"
            placeholder="Cari..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Escape") {
                setIsOpen(false);
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered.length > 0) {
                  onChange(String(filtered[0].id));
                  setIsOpen(false);
                  setSearch("");
                } else if (showAddNew && onAddNew && !isAdding) {
                  setIsAdding(true);
                  try {
                    const newOpt = await onAddNew(search.trim());
                    onChange(String(newOpt.id));
                    setIsOpen(false);
                    setSearch("");
                  } catch (err) {
                    console.error("Failed to add new option on Enter:", err);
                  } finally {
                    setIsAdding(false);
                  }
                }
              }
            }}
            style={{
              margin: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: 'calc(100% - 16px)'
            }}
            autoFocus
          />
          <div style={{ overflowY: 'auto', flexGrow: 1 }}>
            {filtered.map(opt => (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(String(opt.id));
                  setIsOpen(false);
                  setSearch("");
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  backgroundColor: String(opt.id) === String(value) ? '#eff6ff' : 'transparent',
                  color: String(opt.id) === String(value) ? '#1d4ed8' : '#334155',
                  fontWeight: String(opt.id) === String(value) ? '600' : 'normal',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (String(opt.id) !== String(value)) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (String(opt.id) !== String(value)) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {opt.name}
              </div>
            ))}

            {filtered.length === 0 && !showAddNew && (
              <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Tidak ditemukan hasil
              </div>
            )}

            {showAddNew && (
              <div
                onClick={async () => {
                  if (isAdding) return;
                  setIsAdding(true);
                  try {
                    const newOpt = await onAddNew(search.trim());
                    onChange(String(newOpt.id));
                    setIsOpen(false);
                    setSearch("");
                  } catch (e) {
                    console.error("Failed to add new option:", e);
                  } finally {
                    setIsAdding(false);
                  }
                }}
                style={{
                  padding: '10px 12px',
                  fontSize: '13.5px',
                  cursor: isAdding ? 'not-allowed' : 'pointer',
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  fontWeight: '600',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isAdding ? 0.7 : 1
                }}
              >
                <span style={{ fontSize: '16px' }}>+</span> {isAdding ? "Menambahkan..." : `Tambah baru: "${search.trim()}"`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
