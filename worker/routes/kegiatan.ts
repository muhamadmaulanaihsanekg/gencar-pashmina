import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, sql, or, isNull } from "drizzle-orm";
import * as schema from "../../shared/schema";
import { JWTPayload } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string };

export const kegiatanRouter = new Hono<{ Bindings: Env; Variables: { user?: JWTPayload } }>();

kegiatanRouter.get("/", async (c) => {
  const session = c.get("user");
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB, { schema });
  const conditions = [];

  if (session.role === "desa" && session.desaId) {
    conditions.push(eq(schema.kegiatan.desaId, session.desaId));
  } else if (session.role === "kelompok" && session.kelompokId && session.desaId) {
    conditions.push(
      or(
        eq(schema.kegiatan.kelompokId, session.kelompokId),
        and(eq(schema.kegiatan.desaId, session.desaId), isNull(schema.kegiatan.kelompokId))
      )
    );
  }

  const data = await db
    .select({
      id: schema.kegiatan.id,
      judul: schema.kegiatan.judul,
      deskripsi: schema.kegiatan.deskripsi,
      tanggal: schema.kegiatan.tanggal,
      jam: schema.kegiatan.jam,
      lokasi: schema.kegiatan.lokasi,
      desaNama: schema.desa.nama,
      kelompokNama: schema.kelompok.nama,
      desaId: schema.kegiatan.desaId,
      kelompokId: schema.kegiatan.kelompokId,
      createdAt: schema.kegiatan.createdAt,
    })
    .from(schema.kegiatan)
    .leftJoin(schema.desa, eq(schema.kegiatan.desaId, schema.desa.id))
    .leftJoin(schema.kelompok, eq(schema.kegiatan.kelompokId, schema.kelompok.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.kegiatan.tanggal));

  return c.json(data);
});

kegiatanRouter.post("/", async (c) => {
  const session = c.get("user");
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const allowedRoles = ["admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "admin_kegiatan"];
  if (!allowedRoles.includes(session.role)) {
    return c.json({ error: "Akses ditolak" }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const { judul, deskripsi, tanggal, jam, lokasi, lat, lng, radiusM, gpsRequired } = body;

  if (!judul || !tanggal) {
    return c.json({ error: "Judul dan tanggal kegiatan wajib diisi" }, 400);
  }

  const db = drizzle(c.env.DB, { schema });
  const id = crypto.randomUUID();

  const newKegiatan = {
    id,
    judul,
    deskripsi: deskripsi || "",
    tanggal,
    jam: jam || "",
    lokasi: lokasi || "",
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
    radiusM: radiusM ? Number(radiusM) : 100,
    gpsRequired: gpsRequired ? 1 : 0,
    desaId: session.role === "desa" ? session.desaId : body.desaId ? Number(body.desaId) : null,
    kelompokId: session.role === "kelompok" ? session.kelompokId : body.kelompokId ? Number(body.kelompokId) : null,
  };

  await db.insert(schema.kegiatan).values(newKegiatan as any);
  return c.json({ success: true, data: newKegiatan });
});
