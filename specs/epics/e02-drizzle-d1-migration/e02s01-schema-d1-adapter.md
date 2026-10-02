# Story: e02s01 — Adaptasi Skema Drizzle untuk Cloudflare D1

## 1. Business Narrative
Sebagai backend engineer, saya ingin skema Drizzle ORM kompatibel 100% dengan Cloudflare D1 (SQLite) sehingga operasi query database berjalan lancar di dalam Hono Worker.

## 2. Scope
- Menyesuaikan `shared/schema.ts` atau `lib/schema.ts` untuk D1.
- Mengonfigurasi `drizzle-kit` dengan dialect `sqlite` dan driver `d1-http` untuk push skema lokal maupun remote.
- Memastikan tipe data (integer, text, timestamp) sesuai standar D1 SQLite.

## 3. Acceptance Criteria (Gherkin)
```gherkin
Feature: Drizzle D1 Schema Compatibility

  Scenario: Drizzle schema compiles for D1
    Given Drizzle schema definition in shared/schema.ts
    When drizzle-kit generate or db:push is executed
    Then SQL migration statements are generated without unsupported dialect errors
```
