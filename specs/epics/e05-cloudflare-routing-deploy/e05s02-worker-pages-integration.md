# Story: e05s02 — Routing Single Domain Cloudflare Pages & Worker

## 1. Business Narrative
Sebagai engineer/DevOps, saya ingin domain utama melayani file statis dari Pages dan rute `/api/*` diteruskan ke Hono Worker secara transparan tanpa masalah CORS atau multi-domain.

## 2. Scope
- Menyesuaikan konfigurasi custom domain dan routes di Cloudflare dashboard / `wrangler.toml`.
- Memvalidasi pemanggilan `/api/health` dari frontend pada domain produksi.

## 3. Acceptance Criteria (Gherkin)
```gherkin
Feature: Single Domain Unified Routing

  Scenario: Browser requests static page and API
    When browser requests https://example.com/
    Then static HTML is served from Cloudflare Pages
    When browser requests https://example.com/api/health
    Then JSON response is served from Hono Worker
```
