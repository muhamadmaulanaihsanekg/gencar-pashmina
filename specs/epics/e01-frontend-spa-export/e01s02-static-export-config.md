# Story: e01s02 — Konfigurasi output export & Verifikasi Build Statis

## 1. Business Narrative
Sebagai engineer/DevOps, saya ingin proses build Next.js menghasilkan artefak HTML/JS/CSS statis murni di direktori `out/`, sehingga deployment ke Cloudflare Pages tidak memerlukan worker runtime untuk server frontend.

## 2. Scope
- Menambahkan `output: 'export'` dan `images: { unoptimized: true }` pada `next.config.mjs`.
- Menghapus konfigurasi OpenNext / edge-runtime server middleware yang tidak lagi dibutuhkan untuk frontend statis.
- Menjalankan `npm run build` dan memverifikasi keberadaan direktori `out/`.

## 3. Acceptance Criteria (Gherkin)
```gherkin
Feature: Static Export Build Generation

  Scenario: Build process generates static assets
    Given next.config.mjs has output set to 'export'
    When running `npm run build`
    Then the build succeeds without SSR compilation errors
    And the folder `out/index.html` is generated
    And all routes exist as static HTML/JS bundles
```
