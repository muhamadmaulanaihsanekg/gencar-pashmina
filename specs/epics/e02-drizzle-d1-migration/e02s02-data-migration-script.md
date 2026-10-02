# Story: e02s02 — Eksekusi Migrasi Data Turso ke D1

## 1. Business Narrative
Sebagai administrator sistem, saya ingin data dari database lama (Turso/dump) dipindahkan secara akurat ke Cloudflare D1 agar tidak ada kehilangan data pengguna, absensi, atau kegiatan.

## 2. Scope
- Menjalankan skrip validasi dan migrasi di `scripts/migrate-jb2id-to-d1.ts`.
- Memvalidasi konsistensi baris data pada tabel utama: `users`, `generus`, `kegiatan`, `absensi`, `desa`, `kelompok`.

## 3. Acceptance Criteria (Gherkin)
```gherkin
Feature: Data Migration to Cloudflare D1

  Scenario: Data dump import verification
    Given a valid sqlite database dump
    When migration script is executed against D1 database
    Then core tables have matching row counts
    And foreign keys and timestamps are valid
```
