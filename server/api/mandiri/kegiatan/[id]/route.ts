export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  mandiriKegiatan, 
  mandiriAbsensi, 
  mandiriPemilihan, 
  mandiriKunjungan,
  rab,
  rabApproval,
  rundown,
  rundownApproval,
  idCardBuilderData
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const item = await db.query.mandiriKegiatan.findFirst({
      where: eq(mandiriKegiatan.id, id),
    });

    if (!item) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

    return NextResponse.json(item, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Mandiri Kegiatan item GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_keuangan", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const body = await request.json();
    const { judul, deskripsi, tanggal, lokasi, kota, desaId, kelompokId } = body;

    if (!judul || !tanggal || !kota) {
      return NextResponse.json({ error: "Judul, tanggal, dan kota wajib diisi" }, { status: 400 });
    }

    await db
      .update(mandiriKegiatan)
      .set({
        judul,
        deskripsi,
        tanggal,
        lokasi,
        kota,
        desaId: desaId ? Number(desaId) : null,
        kelompokId: kelompokId ? Number(kelompokId) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(mandiriKegiatan.id, id));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Mandiri Kegiatan item PUT error:", error);
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_keuangan", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    // Hapus data dependen (cascade manual) untuk mencegah foreign key error
    await Promise.all([
      db.delete(mandiriAbsensi).where(eq(mandiriAbsensi.kegiatanId, id)),
      db.delete(mandiriPemilihan).where(eq(mandiriPemilihan.kegiatanId, id)),
      db.delete(mandiriKunjungan).where(eq(mandiriKunjungan.kegiatanId, id)),
      db.delete(rab).where(eq(rab.mandiriKegiatanId, id)),
      db.delete(rabApproval).where(eq(rabApproval.mandiriKegiatanId, id)),
      db.delete(rundown).where(eq(rundown.mandiriKegiatanId, id)),
      db.delete(rundownApproval).where(eq(rundownApproval.mandiriKegiatanId, id)),
      db.update(idCardBuilderData).set({ kegiatanId: null }).where(eq(idCardBuilderData.kegiatanId, id)),
    ]);

    await db.delete(mandiriKegiatan).where(eq(mandiriKegiatan.id, id));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Mandiri Kegiatan item DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
