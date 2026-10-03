import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../shared/schema";
import { authMiddleware, JWTPayload } from "./middleware/auth";
import { requestGuard } from "./middleware/request-guard";
import { apiRouter } from "../server/api-router";

export { RealtimeHub } from "./realtime-hub";

type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  KV?: KVNamespace;
  ASSETS?: Fetcher;
  REALTIME?: DurableObjectNamespace;
  JWT_SECRET: string;
  DAERAH_NAMA?: string;
  R2_PUBLIC_URL?: string;
} & Record<string, unknown>;

const app = new Hono<{ Bindings: Env; Variables: { user?: JWTPayload } }>();

app.use("/*", cors({ origin: (o) => o || "*", credentials: true, allowHeaders: ["Content-Type", "Authorization"] }));

// Guard dipasang paling awal: blokir scanner, rate-limit login, RBAC halaman & API.
// (Port dari middleware.ts Next.js yang tidak ikut static export.)
app.use("/*", requestGuard);

// Endpoint yang belum ada padanannya di server/api (magic-link auth).
app.get("/api/health", (c) => c.json({ ok: true, daerah: c.env.DAERAH_NAMA || "Cengkareng" }));

app.use("/api/*", authMiddleware);

function db(c: any) {
  return drizzle(c.env.DB, { schema });
}

app.post("/api/auth/magic/generate", async (c) => {
  const { generusId } = await c.req.json().catch(() => ({}));
  if (!generusId) return c.json({ error: "generusId wajib" }, 400);
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const hash = await sha256(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const d = db(c);
  await d.insert(schema.magicTokens).values({
    id: crypto.randomUUID(),
    generusId,
    email: generusId,
    tokenHash: hash,
    expiresAt,
  });
  return c.json({ token, expiresAt });
});

app.get("/api/auth/magic/verify", async (c) => {
  const token = c.req.query("token") || "";
  if (!token) return c.json({ error: "token wajib" }, 400);
  const hash = await sha256(token);
  const found = await c.env.DB.prepare("SELECT * FROM magic_tokens WHERE token_hash = ?").bind(hash).first<any>();
  if (!found) return c.json({ error: "Token tidak valid" }, 401);
  if (found.consumed_at) return c.json({ error: "Token sudah dipakai" }, 401);
  if (new Date(found.expires_at).getTime() < Date.now()) return c.json({ error: "Token kadaluarsa" }, 401);
  await c.env.DB.prepare("UPDATE magic_tokens SET consumed_at = datetime('now') WHERE token_hash = ?").bind(hash).run();
  return c.json({ ok: true, generusId: found.generus_id });
});

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// WebSocket realtime (pengganti Pusher). Diteruskan ke Durable Object.
app.get("/api/realtime/ws", async (c) => {
  if (c.req.header("Upgrade")?.toLowerCase() !== "websocket") {
    return c.json({ error: "Expected WebSocket upgrade" }, 426);
  }
  if (!c.env.REALTIME) return c.json({ error: "Realtime tidak tersedia" }, 503);
  const stub = c.env.REALTIME.get(c.env.REALTIME.idFromName("taaruf-hub"));
  return stub.fetch(c.req.raw);
});

// Semua route Next.js lama (server/api/**/route.ts) dilayani di sini.
app.route("/", apiRouter);

// Fallback: layani aset statis hasil `next build` (out/) lewat binding ASSETS.
// SPA fallback (deep link) ditangani `not_found_handling = "single-page-application"`.
app.all("*", async (c) => {
  if (!c.env.ASSETS) return c.notFound();
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
