# Deploy Cloudflare — Opsi 2 (SPA statis + Hono Worker)

Arsitektur: frontend diekspor statis (`out/`) dan dilayani Worker lewat binding
`ASSETS`; seluruh API hidup di `server/api/**` yang **dibundel Worker** (bukan
ditulis ulang) memakai shim `next/server` + `next/headers`.

```
Browser → Worker (gencar-api)
            ├─ requestGuard   → blokir scanner, rate-limit login, RBAC
            ├─ /api/realtime/ws → RealtimeHub (Durable Object, WebSocket)
            ├─ /api/*         → server/api/**  (via server/api-router.ts)
            └─ sisanya        → ASSETS (out/)  → SPA fallback otomatis
```

Media disimpan di **Cloudflare R2** (binding `BUCKET`); realtime memakai
**Durable Object** (binding `REALTIME`) — keduanya tanpa env tambahan.

## 1. Sekali saja — buat resource Cloudflare

```bash
npx wrangler login
npx wrangler d1 create pashmina-db          # salin database_id ke wrangler.toml
npx wrangler r2 bucket create gencar-media
```

Isi `database_id` di `wrangler.toml` dengan hasil perintah D1 di atas.

## 2. Sekali saja — secrets produksi

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put APP_ENCRYPTION_KEY
```

Opsional (bila pakai WhatsApp Meta): `WHATSAPP_API_KEY`, `WHATSAPP_PHONE_NUMBER_ID`.

Realtime (Durable Object) dan upload (R2) **tidak butuh secret** — cukup binding
di `wrangler.toml`. Cloudinary, Pusher, dan Firebase sudah tidak dipakai.

Untuk dev lokal, salin `.env.local` ke `.dev.vars` (sudah di-gitignore):

```bash
node -e "const fs=require('fs');const l=fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(x=>/^[A-Z_]+=/.test(x));fs.writeFileSync('.dev.vars',l.join('\n')+'\n')"
```

## 3. Migrasi skema ke D1

Skema kanonik ada di `scripts/sql/schema-from-localdb.sql` (dump lengkap dari
`local.db`, termasuk tabel yang belum ada di folder `drizzle/`).

```bash
# lokal
npx wrangler d1 execute pashmina-db --local  --file=scripts/sql/schema-from-localdb.sql

# produksi
npx wrangler d1 execute pashmina-db --remote --file=scripts/sql/schema-from-localdb.sql
```

Migrasi data dari Turso: lihat `scripts/migrate-jb2id-to-d1.ts`.

Tabel `fcm_tokens` dibiarkan ada di DB (tidak lagi dipakai) — aman, tidak ada
kode yang membacanya. Bisa di-drop kapan saja bila mau bersih.

## 4. Deploy

```bash
npm run deploy        # generate manifest → next build → wrangler deploy
```

Perintah lain:

```bash
npm run dev           # dev lokal: Next (3012) + Worker (8787), /api di-proxy otomatis
npm run build         # hanya frontend statis → out/
npm run build:worker  # cek bundling Worker tanpa upload
npm run deploy:dry    # build + bundling, tanpa upload
```

## 5. Domain

Set custom domain Worker di dashboard Cloudflare (Workers → gencar-api →
Settings → Domains & Routes). Satu domain melayani halaman dan `/api/*` —
tidak perlu CORS atau domain terpisah.

Untuk media R2, ada dua pilihan:

1. **Custom domain bucket** (disarankan) — set `R2_PUBLIC_URL` di `[vars]`,
   mis. `https://media.gencar.my.id`. Upload mengembalikan URL langsung ke R2.
2. **Tanpa domain** — biarkan `R2_PUBLIC_URL` kosong; file dilayani Worker
   lewat `/api/files/<key>`.

## Realtime (Durable Object)

WebSocket di `/api/realtime/ws?channel=<nama>`. Klien (`lib/pusher-client.ts`)
mempertahankan API ala pusher-js (`subscribe`/`bind`/`unbind`), jadi halaman
pemakai tidak berubah. Pengiriman sisi server tetap `pusherServer.trigger(channel, event, data)`
(`lib/pusher.ts`) — 23 pemanggil di `server/api` tidak diubah.

DO memakai WebSocket Hibernation sehingga biaya ~0 saat tidak ada trafik.
Binding: `REALTIME` (lihat `[durable_objects]` + `[[migrations]]` di `wrangler.toml`).

## Catatan penting

- **Tambah/hapus route API** → jalankan `node scripts/gen-api-manifest.mjs`
  (sudah otomatis di `npm run build`/`deploy`). Worker tidak punya glob import,
  jadi daftar route harus statis.
- **Jangan hapus** `server/shims/*` selama `server/api/**` masih memakai API
  Next.js. Alias-nya diatur di `[alias]` pada `wrangler.toml`.
- `run_worker_first = true` wajib: guard RBAC/rate-limit harus jalan sebelum
  aset statis dilayani.
- **Realtime** hanya bisa diakses setelah login (guard menolak 401). Channel
  berisi data peserta, jadi jangan dibuka publik.
- **Upload** divalidasi MIME/ekstensi + maks 5 MB sebelum masuk R2. Ubah
  `ALLOWED_MIME_TYPES` / `MAX_FILE_SIZE` di `server/api/upload/route.ts` bila perlu.
- Upload lama yang tersimpan sebagai `/uploads/...` di DB tetap dilayani dari
  `out/uploads/` (aset statis). File baru memakai R2.
- Rate-limit login dan revokasi token memakai cache in-memory **per-isolate**.
  Cukup untuk meredam brute-force; pakai Durable Object/KV bila butuh konsisten
  antar-isolate (lihat catatan di `lib/cache.ts`).
- `public/_redirects` hanya relevan bila `out/` di-deploy langsung ke Cloudflare
  Pages; jalur Worker tidak memakainya.
