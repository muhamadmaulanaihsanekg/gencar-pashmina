import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../../shared/schema";
import { haversineM } from "../../shared/validation";
import { JWTPayload } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string };

export const absensiRouter = new Hono<{ Bindings: Env; Variables: { user?: JWTPayload } }>();

absensiRouter.get("/", async (c) => {
  const session = c.get("user");
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const kegiatanId = c.req.query("kegiatanId");
  if (!kegiatanId) return c.json({ error: "kegiatanId diperlukan" }, 400);

  const db = drizzle(c.env.DB, { schema });

  const data = await db
    .select({
      id: schema.absensi.id,
      kegiatanId: schema.absensi.kegiatanId,
      generusId: schema.absensi.generusId,
      timestamp: schema.absensi.timestamp,
      keterangan: schema.absensi.keterangan,
      generusNama: schema.generus.nama,
      generusNomorUnik: schema.generus.nomorUnik,
      generusKategori: schema.generus.kategori,
      generusJenisKelamin: schema.generus.jenisKelamin,
      desaId: schema.generus.desaId,
      desaNama: schema.desa.nama,
      kelompokId: schema.generus.kelompokId,
      kelompokNama: schema.kelompok.nama,
    })
    .from(schema.absensi)
    .innerJoin(schema.generus, eq(schema.absensi.generusId, schema.generus.id))
    .leftJoin(schema.desa, eq(schema.generus.desaId, schema.desa.id))
    .leftJoin(schema.kelompok, eq(schema.generus.kelompokId, schema.kelompok.id))
    .where(eq(schema.absensi.kegiatanId, kegiatanId))
    .orderBy(desc(schema.absensi.timestamp));

  return c.json(data);
});

absensiRouter.post("/scan", async (c) => {
  const { qrToken, lat, lng, accuracy, generusId, kegiatanId } = await c.req.json().catch(() => ({}));
  if (!generusId) return c.json({ error: "generusId wajib" }, 400);

  const db = drizzle(c.env.DB, { schema });

  let targetKegiatanId = kegiatanId;

  if (!targetKegiatanId && qrToken) {
    const qr = await c.env.DB.prepare("SELECT * FROM wilayah_qr WHERE qr_token = ?").bind(qrToken).first<any>();
    if (!qr) return c.json({ error: "QR tidak dikenal" }, 404);

    const today = new Date().toISOString().slice(0, 10);
    let kegs: any[] = [];
    if (qr.level === "daerah") {
      kegs = await c.env.DB.prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND desa_id IS NULL AND kelompok_id IS NULL").bind(today).all().then((r: any) => r.results || []);
    } else if (qr.level === "desa") {
      kegs = await c.env.DB.prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND desa_id = ? AND kelompok_id IS NULL").bind(today, qr.desa_id).all().then((r: any) => r.results || []);
    } else {
      kegs = await c.env.DB.prepare("SELECT * FROM kegiatan WHERE tanggal = ? AND kelompok_id = ?").bind(today, qr.kelompok_id).all().then((r: any) => r.results || []);
    }

    if (kegs.length === 0) return c.json({ error: "Tidak ada kegiatan aktif di wilayah ini", kegiatan: [] }, 404);
    if (kegs.length > 1) {
      return c.json({ needPick: true, kegiatan: kegs });
    }
    targetKegiatanId = kegs[0].id;
  }

  if (!targetKegiatanId) {
    return c.json({ error: "kegiatanId wajib" }, 400);
  }

  // Check existing attendance
  const existing = await db
    .select()
    .from(schema.absensi)
    .where(and(eq(schema.absensi.kegiatanId, targetKegiatanId), eq(schema.absensi.generusId, generusId)))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ ok: true, alreadyPresent: true, message: "Sudah absen sebelumnya" });
  }

  // Record attendance
  const id = crypto.randomUUID();
  await db.insert(schema.absensi).values({
    id,
    kegiatanId: targetKegiatanId,
    generusId,
    keterangan: "hadir",
    timestamp: new Date().toISOString(),
  } as any);

  return c.json({ ok: true, success: true, message: "Absensi berhasil dicatat" });
});
