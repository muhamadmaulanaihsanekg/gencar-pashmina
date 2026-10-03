export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timGambuh, settings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { nama, daerahId, desaId } = await request.json();

    if (!nama || !daerahId || !desaId) {
      return NextResponse.json({ error: "Nama, Daerah, dan Desa wajib diisi" }, { status: 400 });
    }

    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const kegiatanId = activeSetting[0]?.value || "";

    if (!kegiatanId) {
      return NextResponse.json({ error: "Pendaftaran sedang ditutup (tidak ada kegiatan aktif)" }, { status: 400 });
    }

    const id = uuidv4();
    await db.insert(timGambuh).values({
      id,
      nama,
      kegiatanId,
      daerahId: daerahId ? Number(daerahId) : null,
      desaId: desaId ? Number(desaId) : null,
      tipe: "Tim Penunggu",
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Daftar Tim Penunggu error:", error);
    return NextResponse.json({ error: "Gagal mendaftar" }, { status: 500 });
  }
}
