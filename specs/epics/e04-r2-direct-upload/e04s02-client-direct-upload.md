# Story: e04s02 — Integrasi Client-Side Direct Upload ke R2

## 1. Business Narrative
Sebagai user, saya ingin dapat mengunggah foto profil, gambar artikel, dan dokumen langsung dari peramban ke storage R2 dengan indikator progres yang jelas.

## 2. Scope
- Memperbarui komponen upload di frontend (`components/ImageUpload.tsx` atau serupa) untuk memanggil `/api/upload/sign` lalu melakukan `fetch(signedUrl, { method: 'PUT', body: file })`.
- Menyimpan URL file R2 hasil upload ke form data.

## 3. Acceptance Criteria (Gherkin)
```gherkin
Feature: Direct Client Upload to R2

  Scenario: User selects an image file to upload
    Given an image file selected in browser
    When upload process starts
    Then client uploads directly to R2 bucket
    And the public CDN URL of the uploaded image is displayed
```
