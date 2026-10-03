import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timGambuh } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "tim_pnkb_gambuh"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { nama, daerahId, desaId, tipe, umur, noTelp, foto } = await request.json();

    if (!nama || !tipe || !daerahId || !desaId) {
      return NextResponse.json({ error: "Nama, Tipe, Daerah, dan Desa wajib diisi" }, { status: 400 });
    }

    if (!["PNKB", "Ibu Gambuh", "Penunggu PNKB", "Penunggu Ibu Gambuh"].includes(tipe)) {
      return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
    }

    await db.update(timGambuh)
      .set({
        nama,
        umur: umur ? Number(umur) : null,
        noTelp: noTelp || null,
        daerahId: daerahId ? Number(daerahId) : null,
        desaId: desaId ? Number(desaId) : null,
        tipe: tipe as "PNKB" | "Ibu Gambuh" | "Penunggu PNKB" | "Penunggu Ibu Gambuh",
        foto: foto || null,
      })
      .where(eq(timGambuh.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT tim-gambuh id error:", error);
    return NextResponse.json({ error: "Gagal memperbarui data" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    await db.delete(timGambuh).where(eq(timGambuh.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE tim-gambuh id error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
