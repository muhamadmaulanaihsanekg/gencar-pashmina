export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timGambuh, settings, mandiriDesa, mandiriDaerah } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "tim_pnkb_gambuh"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get active kegiatanId from settings
    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const kegiatanId = activeSetting[0]?.value || "";

    if (!kegiatanId) {
      return NextResponse.json([]);
    }

    const data = await db.select({
      id: timGambuh.id,
      nama: timGambuh.nama,
      kegiatanId: timGambuh.kegiatanId,
      daerahId: timGambuh.daerahId,
      daerahNama: mandiriDaerah.nama,
      desaId: timGambuh.desaId,
      desaNama: mandiriDesa.nama,
      tipe: timGambuh.tipe,
      createdAt: timGambuh.createdAt,
    })
    .from(timGambuh)
    .leftJoin(mandiriDaerah, eq(timGambuh.daerahId, mandiriDaerah.id))
    .leftJoin(mandiriDesa, eq(timGambuh.desaId, mandiriDesa.id))
    .where(and(eq(timGambuh.kegiatanId, kegiatanId), eq(timGambuh.tipe, "Tim Penunggu")))
    .orderBy(timGambuh.nama);

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET tim-gambuh error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get active kegiatanId
    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const kegiatanId = activeSetting[0]?.value || "";

    if (!kegiatanId) {
      return NextResponse.json({ error: "Tidak ada kegiatan mandiri yang sedang aktif" }, { status: 400 });
    }

    const { nama, daerahId, desaId, tipe } = await request.json();

    if (!nama || !tipe || !daerahId || !desaId) {
      return NextResponse.json({ error: "Nama, Tipe, Daerah, dan Desa wajib diisi" }, { status: 400 });
    }

    if (tipe !== "Tim Penunggu") {
      return NextResponse.json({ error: "Tipe harus Tim Penunggu" }, { status: 400 });
    }

    const id = uuidv4();
    await db.insert(timGambuh).values({
      id,
      nama,
      kegiatanId,
      daerahId: daerahId ? Number(daerahId) : null,
      desaId: desaId ? Number(desaId) : null,
      tipe: tipe as "Tim Penunggu",
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("POST tim-gambuh error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}
