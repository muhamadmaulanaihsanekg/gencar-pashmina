# Story: e04s01 — Endpoint Presigned URL R2 di Hono

## 1. Business Narrative
Sebagai backend, saya ingin memberikan otorisasi upload langsung ke Cloudflare R2 kepada client agar worker tidak perlu menampung stream file biner yang membebani memori dan batas CPU.

## 2. Scope
- Menambahkan binding Cloudflare R2 bucket di `wrangler.toml`.
- Membuat endpoint `/api/upload/sign` di Hono yang mengembalikan PUT URL / token otorisasi R2.

## 3. Acceptance Criteria (Gherkin)
```gherkin
Feature: R2 Presigned Upload Authorization

  Scenario: Authenticated client requests upload URL
    Given an authenticated session
    When POST /api/upload/sign is requested with filename and contentType
    Then Hono returns a signed upload URL and target key in R2
```
