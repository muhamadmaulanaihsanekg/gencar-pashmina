# Story: e01s01 — Konversi 7 Server Components ke Client-Side Fetch

## 1. Business Narrative
Sebagai user, saya ingin semua halaman aplikasi dimuat tanpa bergantung pada proses komputasi render server, sehingga aplikasi dapat berjalan sebagai SPA murni yang cepat.

## 2. Scope
- Mengubah 7 file page yang belum memiliki `"use client"`:
  - `app/page.tsx` (landing page)
  - `app/(dashboard)/dashboard/page.tsx`
  - `app/agenda/page.tsx`
  - `app/anggota/page.tsx`
  - `app/organisasi/page.tsx`
  - `app/artikel/[id]/page.tsx`
  - `app/(dashboard)/berita/[id]/page.tsx`
- Menghapus direct import `@/lib/db` dari komponen halaman dan menggantinya dengan panggilan `fetch('/api/...')` via React `useEffect` / `swr`.

## 3. Acceptance Criteria (Gherkin)
```gherkin
Feature: Client-side fetching on previously server-rendered pages

  Scenario: User opens landing page
    Given landing page is loaded in browser
    When the page mounts
    Then it fetches site settings and featured articles via client fetch
    And no server database connection is invoked during render

  Scenario: Dynamic route fallback
    Given a user navigates directly to /artikel/123
    When the page loads on client
    Then it extracts route params using useParams()
    And displays loading skeleton followed by fetched article content
```
