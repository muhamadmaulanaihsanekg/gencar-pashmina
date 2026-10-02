# Story: e03s02 — Porting Endpoint Absensi, Scanner, & Kegiatan

## 1. Business Narrative
Sebagai panitia/peserta kegiatan, saya ingin melakukan absensi QR dan validasi lokasi GPS secara instan tanpa kegagalan koneksi atau latensi tinggi.

## 2. Scope
- Porting endpoint scan QR wilayah, validasi GPS Haversine, dan pencatatan absensi ke Hono.
- Porting endpoint manajemen kegiatan (CRUD kegiatan, filter wilayah desa/kelompok).

## 3. Acceptance Criteria (Gherkin)
```gherkin
Feature: QR Attendance and Event Management

  Scenario: QR Attendance scan success
    Given an active event and valid QR token
    When POST /api/absensi/scan is submitted with valid coordinates
    Then the attendance record is inserted into D1
    And response status is 200 with attendance summary
```
