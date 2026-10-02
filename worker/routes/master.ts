import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc } from "drizzle-orm";
import * as schema from "../../shared/schema";

type Env = { DB: D1Database; JWT_SECRET: string };

export const masterRouter = new Hono<{ Bindings: Env }>();

masterRouter.get("/desa", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const data = await db.select().from(schema.desa);
  return c.json(data);
});

masterRouter.get("/kelompok", async (c) => {
  const desaId = c.req.query("desaId");
  const db = drizzle(c.env.DB, { schema });
  if (desaId) {
    const data = await db.select().from(schema.kelompok).where(eq(schema.kelompok.desaId, Number(desaId)));
    return c.json(data);
  }
  const data = await db.select().from(schema.kelompok);
  return c.json(data);
});

masterRouter.get("/public/generus/desa", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const data = await db.select().from(schema.desa).orderBy(schema.desa.nama);
  return c.json(data);
});

masterRouter.get("/public/generus/kelompok", async (c) => {
  const desaId = c.req.query("desaId");
  if (!desaId) return c.json([]);
  const db = drizzle(c.env.DB, { schema });
  const data = await db
    .select()
    .from(schema.kelompok)
    .where(eq(schema.kelompok.desaId, Number(desaId)))
    .orderBy(schema.kelompok.nama);
  return c.json(data);
});

masterRouter.get("/public/members", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const data = await db
    .select({
      id: schema.generus.id,
      nama: schema.generus.nama,
      kategori: schema.generus.kategori,
      desaNama: schema.desa.nama,
      kelompokNama: schema.kelompok.nama,
    })
    .from(schema.generus)
    .leftJoin(schema.desa, eq(schema.generus.desaId, schema.desa.id))
    .leftJoin(schema.kelompok, eq(schema.generus.kelompokId, schema.kelompok.id))
    .limit(100);
  return c.json(data);
});

masterRouter.get("/public/organisasi", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const desaList = await db.select().from(schema.desa);
  const kelompokList = await db.select().from(schema.kelompok);
  return c.json({ desa: desaList, kelompok: kelompokList });
});

masterRouter.get("/settings", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const data = await db.select().from(schema.settings).catch(() => []);
  const settingsObj: Record<string, string | null> = {
    site_logo: "/img/pashmina-logo.png?v=8",
    app_name: "PASHMINA 8.0",
    generus_registration_active: "true"
  };
  data.forEach((s) => {
    if (s.key) settingsObj[s.key] = s.value;
  });
  return c.json(settingsObj);
});

