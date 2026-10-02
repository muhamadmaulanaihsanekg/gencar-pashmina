# Story: e03s03 — Porting Endpoint CRUD Master Data & Laporan

## 1. Business Narrative
Sebagai admin, saya ingin mengelola master data (generus, artikel, berita, organisasi, anggaran) dan mengunduh laporan melalui API Hono.

## 2. Scope
- Porting endpoint generus, desa, kelompok, artikel, berita, download, dan laporan ke Hono.
- Memastikan paginasi, search, dan filter query params bekerja persis seperti Next.js API sebelumnya.

## 3. Acceptance Criteria (Gherkin)
```gherkin
Feature: Master Data CRUD Endpoints

  Scenario: Fetching list of generus with search
    Given existing generus records in D1
    When GET /api/generus?search=Budi is requested
    Then matching records are returned in JSON format
```
