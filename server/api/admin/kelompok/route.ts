export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kelompok, desa, generus, kegiatan, absensi } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await db
      .select({ id: kelompok.id, nama: kelompok.nama, desaId: kelompok.desaId, desaNama: desa.nama })
      .from(kelompok)
      .leftJoin(desa, eq(kelompok.desaId, desa.id))
      .orderBy(kelompok.nama);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { nama, desaId } = await request.json();
    if (!nama || !desaId) return NextResponse.json({ error: "Nama dan desaId wajib diisi" }, { status: 400 });
    await db.insert(kelompok).values({ nama, desaId: Number(desaId) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, nama, desaId } = await request.json();
    if (!id || !nama || !desaId) return NextResponse.json({ error: "ID, nama, dan desaId wajib diisi" }, { status: 400 });
    await db.update(kelompok).set({ nama, desaId: Number(desaId) }).where(eq(kelompok.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    
    const kelompokId = Number(id);

    // Get dependent IDs to clean up first
    const generusInKel = await db.select({ id: generus.id }).from(generus).where(eq(generus.kelompokId, kelompokId));
    const generusIds = generusInKel.map(g => g.id);

    if (generusIds.length > 0) {
      await db.delete(absensi).where(inArray(absensi.generusId, generusIds));
    }

    const kegiatanInKel = await db.select({ id: kegiatan.id }).from(kegiatan).where(eq(kegiatan.kelompokId, kelompokId));
    const kegiatanIds = kegiatanInKel.map(k => k.id);

    if (kegiatanIds.length > 0) {
      await db.delete(absensi).where(inArray(absensi.kegiatanId, kegiatanIds));
    }

    // Now safe to delete
    await db.delete(generus).where(eq(generus.kelompokId, kelompokId));
    await db.delete(kegiatan).where(eq(kegiatan.kelompokId, kelompokId));
    await db.delete(kelompok).where(eq(kelompok.id, kelompokId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
