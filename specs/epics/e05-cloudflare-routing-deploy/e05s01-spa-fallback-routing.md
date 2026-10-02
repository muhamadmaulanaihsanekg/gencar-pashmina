# Story: e05s01 — Konfigurasi SPA Fallback & Cloudflare Pages Static

## 1. Business Narrative
Sebagai user, saya ingin dapat me-refresh halaman dinamis apa pun (misal: `/artikel/42` atau `/absensi`) tanpa mengalami error 404 dari web server statis.

## 2. Scope
- Menambahkan file `public/404.html` atau rule redirect Cloudflare Pages `_redirects` (`/* /index.html 200`).
- Memastikan asset statis (.js, .css, images) tidak terpengaruh rewrite fallback.

## 3. Acceptance Criteria (Gherkin)
```gherkin
Feature: SPA Fallback Routing

  Scenario: Deep link reload in browser
    Given a user navigates to /mandiri/absensi
    When the page is hard refreshed (F5)
    Then Cloudflare Pages returns index.html with 200 OK
    And React router mounts the correct view on client
```
