export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timGambuh, settings, mandiriDesa, mandiriDaerah, mandiriKelompok } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "tim_pnkb_gambuh"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filterKegiatanId = searchParams.get("kegiatanId");

    let targetKegiatanId = filterKegiatanId;

    if (!targetKegiatanId || targetKegiatanId === "active") {
      // Get active kegiatanId from settings
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      targetKegiatanId = activeSetting[0]?.value || "";
    }

    if (!targetKegiatanId && targetKegiatanId !== "all") {
      return NextResponse.json([]);
    }

    let query: any = db.select({
      id: timGambuh.id,
      nama: timGambuh.nama,
      umur: timGambuh.umur,
      kegiatanId: timGambuh.kegiatanId,
      daerahId: timGambuh.daerahId,
      daerahNama: mandiriDaerah.nama,
      desaId: timGambuh.desaId,
      desaNama: mandiriDesa.nama,
      kelompokId: timGambuh.kelompokId,
      kelompokNama: mandiriKelompok.nama,
      tipe: timGambuh.tipe,
      noTelp: timGambuh.noTelp,
      foto: timGambuh.foto,
      createdAt: timGambuh.createdAt,
    })
    .from(timGambuh)
    .leftJoin(mandiriDaerah, eq(timGambuh.daerahId, mandiriDaerah.id))
    .leftJoin(mandiriDesa, eq(timGambuh.desaId, mandiriDesa.id))
    .leftJoin(mandiriKelompok, eq(timGambuh.kelompokId, mandiriKelompok.id));

    if (targetKegiatanId !== "all") {
      query = query.where(eq(timGambuh.kegiatanId, targetKegiatanId));
    }

    const data = await query.orderBy(timGambuh.nama);

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET tim-gambuh error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "tim_pnkb_gambuh"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get active kegiatanId
    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const kegiatanId = activeSetting[0]?.value || "";

    if (!kegiatanId) {
      return NextResponse.json({ error: "Tidak ada kegiatan mandiri yang sedang aktif" }, { status: 400 });
    }

    const { nama, daerahId, desaId, tipe, umur, kelompokId, noTelp, foto } = await request.json();

    if (!nama || !tipe) {
      return NextResponse.json({ error: "Nama dan Tipe wajib diisi" }, { status: 400 });
    }

    if (!["PNKB", "Ibu Gambuh", "Penunggu PNKB", "Penunggu Ibu Gambuh", "Tim Penunggu"].includes(tipe)) {
      return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
    }

    const id = uuidv4();
    await db.insert(timGambuh).values({
      id,
      nama,
      umur: umur ? Number(umur) : null,
      kegiatanId,
      daerahId: daerahId ? Number(daerahId) : null,
      desaId: desaId ? Number(desaId) : null,
      kelompokId: kelompokId ? Number(kelompokId) : null,
      tipe: tipe as "PNKB" | "Ibu Gambuh" | "Tim Penunggu" | "Penunggu PNKB" | "Penunggu Ibu Gambuh",
      noTelp: noTelp || null,
      foto: foto || null,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("POST tim-gambuh error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "tim_pnkb_gambuh"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (action === "deleteAll") {
      // Get active kegiatanId
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      const kegiatanId = activeSetting[0]?.value || "";

      if (!kegiatanId) {
        return NextResponse.json({ error: "Tidak ada kegiatan mandiri yang sedang aktif" }, { status: 400 });
      }

      await db.delete(timGambuh).where(eq(timGambuh.kegiatanId, kegiatanId));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("DELETE tim-gambuh error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
