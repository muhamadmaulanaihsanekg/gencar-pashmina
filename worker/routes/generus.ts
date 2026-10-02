import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, like, or } from "drizzle-orm";
import * as schema from "../../shared/schema";
import { JWTPayload } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string };

export const generusRouter = new Hono<{ Bindings: Env; Variables: { user?: JWTPayload } }>();

generusRouter.get("/", async (c) => {
  const session = c.get("user");
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB, { schema });
  const search = c.req.query("search") || "";
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (session.role === "desa" && session.desaId) {
    conditions.push(eq(schema.generus.desaId, session.desaId));
  } else if (session.role === "kelompok" && session.kelompokId) {
    conditions.push(eq(schema.generus.kelompokId, session.kelompokId));
  }

  if (search) {
    conditions.push(
      or(
        like(schema.generus.nama, `%${search}%`),
        like(schema.generus.nomorUnik, `%${search}%`)
      )
    );
  }

  const data = await db
    .select({
      id: schema.generus.id,
      nomorUnik: schema.generus.nomorUnik,
      nama: schema.generus.nama,
      jenisKelamin: schema.generus.jenisKelamin,
      kategori: schema.generus.kategori,
      kategoriUsia: schema.generus.kategoriUsia,
      desaId: schema.generus.desaId,
      kelompokId: schema.generus.kelompokId,
      desaNama: schema.desa.nama,
      kelompokNama: schema.kelompok.nama,
      foto: schema.generus.foto,
    })
    .from(schema.generus)
    .leftJoin(schema.desa, eq(schema.generus.desaId, schema.desa.id))
    .leftJoin(schema.kelompok, eq(schema.generus.kelompokId, schema.kelompok.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.generus.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data, page, limit });
});

generusRouter.post("/", async (c) => {
  const session = c.get("user");
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB, { schema });
  const body = await c.req.json().catch(() => ({}));

  if (!body.nama || !body.jenisKelamin) {
    return c.json({ error: "Nama dan jenis kelamin wajib diisi" }, 400);
  }

  const id = crypto.randomUUID();
  const nomorUnik = "GNR" + Math.floor(100000 + Math.random() * 900000);

  const newGenerus = {
    id,
    nomorUnik,
    nama: body.nama,
    jenisKelamin: body.jenisKelamin,
    kategoriUsia: body.kategoriUsia || "Remaja",
    kategori: body.kategori || "Generus",
    desaId: session.role === "desa" ? session.desaId : body.desaId ? Number(body.desaId) : null,
    kelompokId: session.role === "kelompok" ? session.kelompokId : body.kelompokId ? Number(body.kelompokId) : null,
    foto: body.foto || null,
  };

  await db.insert(schema.generus).values(newGenerus as any);
  return c.json({ success: true, data: newGenerus });
});
