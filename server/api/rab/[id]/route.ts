export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rab } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_keuangan", "admin_romantic_room", "admin_kegiatan", "desa", "kelompok", "creator"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const body = await request.json();
    const { item, volume, satuan, hargaSatuan, keterangan } = body;

    const totalHarga = Number(volume) * Number(hargaSatuan);

    await db
      .update(rab)
      .set({
        item,
        volume: Number(volume),
        satuan,
        hargaSatuan: Number(hargaSatuan),
        totalHarga,
        keterangan,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(rab.id, id));

    return NextResponse.json({ success: true, id, totalHarga });
  } catch (error) {
    console.error("RAB PUT error:", error);
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_keuangan", "admin_romantic_room", "admin_kegiatan", "desa", "kelompok", "creator"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.delete(rab).where(eq(rab.id, id));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("RAB DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
