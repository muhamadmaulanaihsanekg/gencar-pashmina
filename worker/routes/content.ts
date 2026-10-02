import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../../shared/schema";
import { JWTPayload } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string };

export const contentRouter = new Hono<{ Bindings: Env; Variables: { user?: JWTPayload } }>();

// Artikel
contentRouter.get("/artikel", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const data = await db
    .select()
    .from(schema.artikel)
    .where(and(eq(schema.artikel.tipe, "artikel"), eq(schema.artikel.status, "published")))
    .orderBy(desc(schema.artikel.createdAt));
  return c.json(data);
});

contentRouter.get("/artikel/:id", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB, { schema });
  const row = await db.select().from(schema.artikel).where(eq(schema.artikel.id, id)).limit(1);
  if (row.length === 0) return c.json({ error: "Artikel tidak ditemukan" }, 404);
  return c.json(row[0]);
});

// Berita
contentRouter.get("/berita", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const data = await db
    .select()
    .from(schema.artikel)
    .where(and(eq(schema.artikel.tipe, "berita"), eq(schema.artikel.status, "published")))
    .orderBy(desc(schema.artikel.createdAt));
  return c.json(data);
});

contentRouter.get("/berita/:id", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB, { schema });
  const row = await db.select().from(schema.artikel).where(eq(schema.artikel.id, id)).limit(1);
  if (row.length === 0) return c.json({ error: "Berita tidak ditemukan" }, 404);
  return c.json(row[0]);
});

// Dashboard stats
contentRouter.get("/dashboard", async (c) => {
  const session = c.get("user");
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB, { schema });
  const cities = await db.select().from(schema.desa);
  const groups = await db.select().from(schema.kelompok);

  return c.json({
    session,
    stats: { totalGenerus: 0, totalKegiatan: 0, totalAbsensi: 0 },
    cities,
    villages: [],
    groups,
    userFoto: "",
  });
});
