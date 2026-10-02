import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../shared/schema";
import { haversineM } from "../shared/validation";
import { authMiddleware, JWTPayload } from "./middleware/auth";
import { authRouter } from "./routes/auth";
import { profileRouter } from "./routes/profile";
import { kegiatanRouter } from "./routes/kegiatan";
import { absensiRouter } from "./routes/absensi";
import { generusRouter } from "./routes/generus";
import { contentRouter } from "./routes/content";
import { masterRouter } from "./routes/master";
import { uploadRouter } from "./routes/upload";

type Env = { DB: D1Database; BUCKET: R2Bucket; KV?: KVNamespace; JWT_SECRET: string; DAERAH_NAMA?: string; R2_PUBLIC_URL?: string } & Record<string, unknown>;

const app = new Hono<{ Bindings: Env; Variables: { user?: JWTPayload } }>();

app.use("/*", cors({ origin: (o) => o || "*", credentials: true, allowHeaders: ["Content-Type", "Authorization"] }));
app.use("/api/*", authMiddleware);

app.route("/api/auth", authRouter);
app.route("/api/profile", profileRouter);
app.route("/api/kegiatan", kegiatanRouter);
app.route("/api/absensi", absensiRouter);
app.route("/api/generus", generusRouter);
app.route("/api/upload", uploadRouter);
app.route("/api", contentRouter);
app.route("/api", masterRouter);

app.get("/api/health", (c) => c.json({ ok: true, daerah: c.env.DAERAH_NAMA || "Cengkareng" }));

// ── Helpers ──
function db(c: any) { return drizzle(c.env.DB, { schema }); }

// POST /api/auth/magic/generate — admin generate link 30m
app.post("/api/auth/magic/generate", async (c) => {
  const { generusId } = await c.req.json().catch(() => ({}));
  if (!generusId) return c.json({ error: "generusId wajib" }, 400);
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const hash = await sha256(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const d = db(c);
  await d.insert(schema.magicTokens).values({ id: crypto.randomUUID(), generusId, email: generusId, tokenHash: hash, expiresAt });
  // caller should send link via WA/email: /auth/magic?token=TOKEN
  return c.json({ token, expiresAt });
});

app.get("/api/auth/magic/verify", async (c) => {
  const token = c.req.query("token") || "";
  if (!token) return c.json({ error: "token wajib" }, 400);
  const hash = await sha256(token);
  const d = db(c);
  const row = await d.select().from(schema.magicTokens).where((eq: any) => eq).then((r: any) => r[0]).catch(() => null);
  // Simplified check — full verify via D1 query by tokenHash
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

export default app;
