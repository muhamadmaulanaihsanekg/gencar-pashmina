# Story: e03s01 — Porting Auth & Session Middleware ke Hono

## 1. Business Narrative
Sebagai user, saya ingin dapat login via password maupun magic token dan session saya dikenali secara konsisten oleh backend Hono melalui JWT cookie.

## 2. Scope
- Memindahkan auth routes (`/api/auth/login`, `/api/auth/logout`, `/api/auth/magic/generate`, `/api/auth/magic/verify`, `/api/profile`) ke Hono.
- Menerapkan JWT verification middleware di Hono untuk memproteksi endpoint privat.

## 3. Acceptance Criteria (Gherkin)
```gherkin
Feature: Hono Authentication Endpoints

  Scenario: User logs in with valid credentials
    Given registered user credentials
    When POST /api/auth/login is sent to Hono
    Then Hono responds with 200 OK and sets auth cookie
    And subsequent requests with the cookie return user profile
```
