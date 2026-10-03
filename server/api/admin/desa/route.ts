export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { desa, kelompok, generus, kegiatan, absensi } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await db.select().from(desa).orderBy(desa.nama);
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
    const { nama } = await request.json();
    if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    await db.insert(desa).values({ nama });
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
    const { id, nama } = await request.json();
    if (!id || !nama) return NextResponse.json({ error: "ID dan nama wajib diisi" }, { status: 400 });
    await db.update(desa).set({ nama }).where(eq(desa.id, Number(id)));
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
    
    const desaId = Number(id);

    // Get all generus IDs in this desa to delete their attendance
    const generusInDesa = await db.select({ id: generus.id }).from(generus).where(eq(generus.desaId, desaId));
    const generusIds = generusInDesa.map(g => g.id);

    if (generusIds.length > 0) {
      await db.delete(absensi).where(inArray(absensi.generusId, generusIds));
    }

    // Get all kegiatan IDs in this desa to delete their attendance
    const kegiatanInDesa = await db.select({ id: kegiatan.id }).from(kegiatan).where(eq(kegiatan.desaId, desaId));
    const kegiatanIds = kegiatanInDesa.map(k => k.id);
    
    if (kegiatanIds.length > 0) {
      await db.delete(absensi).where(inArray(absensi.kegiatanId, kegiatanIds));
    }

    // Now safe to delete main entities
    await db.delete(generus).where(eq(generus.desaId, desaId));
    await db.delete(kegiatan).where(eq(kegiatan.desaId, desaId));
    await db.delete(kelompok).where(eq(kelompok.desaId, desaId));
    await db.delete(desa).where(eq(desa.id, desaId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
