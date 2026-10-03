export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKegiatan, mandiriDesa, mandiriKelompok } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await db
      .select({
        id: mandiriKegiatan.id,
        judul: mandiriKegiatan.judul,
        deskripsi: mandiriKegiatan.deskripsi,
        tanggal: mandiriKegiatan.tanggal,
        lokasi: mandiriKegiatan.lokasi,
        kota: mandiriKegiatan.kota,
        desaNama: mandiriDesa.nama,
        kelompokNama: mandiriKelompok.nama,
        desaId: mandiriKegiatan.desaId,
        kelompokId: mandiriKegiatan.kelompokId,
        createdAt: mandiriKegiatan.createdAt,
      })
      .from(mandiriKegiatan)
      .leftJoin(mandiriDesa, eq(mandiriKegiatan.desaId, mandiriDesa.id))
      .leftJoin(mandiriKelompok, eq(mandiriKegiatan.kelompokId, mandiriKelompok.id))
      .orderBy(sql`${mandiriKegiatan.tanggal} DESC`);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Mandiri Kegiatan GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_keuangan", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { judul, deskripsi, tanggal, lokasi, kota, desaId, kelompokId } = body;

    if (!judul || !tanggal || !kota) {
      return NextResponse.json({ error: "Judul, tanggal, dan kota wajib diisi" }, { status: 400 });
    }

    const id = uuidv4();
    
    await db.insert(mandiriKegiatan).values({
      id,
      judul,
      deskripsi,
      tanggal,
      lokasi,
      kota,
      desaId: desaId ? Number(desaId) : null,
      kelompokId: kelompokId ? Number(kelompokId) : null,
      createdBy: session.userId,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Mandiri Kegiatan POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}
