export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timGambuh, settings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { nama, umur, noTelp, daerahId, desaId, kelompokId, tipe, foto } = await request.json();

    if (!nama || !umur || !noTelp || !tipe || !daerahId || !desaId || !kelompokId || !foto) {
      return NextResponse.json({ error: "Nama, Umur, No WhatsApp, Tipe, Daerah, Desa, Kelompok, dan Foto wajib diisi" }, { status: 400 });
    }

    if (!["PNKB", "Ibu Gambuh", "Penunggu PNKB", "Penunggu Ibu Gambuh", "Tim Penunggu"].includes(tipe)) {
      return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
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
      umur: umur ? Number(umur) : null,
      kegiatanId,
      daerahId: daerahId ? Number(daerahId) : null,
      desaId: desaId ? Number(desaId) : null,
      kelompokId: kelompokId ? Number(kelompokId) : null,
      tipe: tipe as "PNKB" | "Ibu Gambuh" | "Tim Penunggu" | "Penunggu PNKB" | "Penunggu Ibu Gambuh",
      noTelp: noTelp,
      foto: foto || null
    });

    return NextResponse.json({ success: true, id, nama, tipe, foto: foto || null });
  } catch (error) {
    console.error("Daftar Tim Gambuh error:", error);
    return NextResponse.json({ error: "Gagal mendaftar" }, { status: 500 });
  }
}
