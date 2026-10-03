export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriAbsensi, generus, mandiriDesa, mandiri, idCardBuilderData, mandiriDaerah } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const ALLOWED_ROLES = ["admin", "kmm_daerah", "admin_romantic_room", "pengurus_daerah", "tim_pnkb"];

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kegiatanId = searchParams.get("kegiatanId");

    if (!kegiatanId) return NextResponse.json({ error: "kegiatanId diperlukan" }, { status: 400 });

    const data = await db
      .select({
        id: mandiriAbsensi.id,
        kegiatanId: mandiriAbsensi.kegiatanId,
        generusId: mandiriAbsensi.generusId,
        timestamp: mandiriAbsensi.timestamp,
        keterangan: mandiriAbsensi.keterangan,
        alasanPulang: mandiriAbsensi.alasanPulang,
        waktuPulang: mandiriAbsensi.waktuPulang,
        generusNama: generus.nama,
        generusNomorUnik: generus.nomorUnik,
        generusJenisKelamin: generus.jenisKelamin,
        desaNama: mandiriDesa.nama,
        desaKota: mandiriDaerah.nama,
        nomorPeserta: sql<string>`COALESCE(CAST(${mandiri.nomorUrut} AS TEXT), ${idCardBuilderData.dapukan})`,
      })
      .from(mandiriAbsensi)
      .leftJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
      .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(idCardBuilderData, eq(generus.nomorUnik, idCardBuilderData.nomorUnik))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(
        and(
          eq(mandiriAbsensi.kegiatanId, kegiatanId),
          eq(mandiriAbsensi.keterangan, "pulang")
        )
      )
      .orderBy(sql`datetime(${mandiriAbsensi.waktuPulang}) DESC`);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Mandiri Pulang GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID absensi diperlukan" }, { status: 400 });
    }

    // Check if the record exists
    const existing = await db.query.mandiriAbsensi.findFirst({
      where: eq(mandiriAbsensi.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Data absensi tidak ditemukan" }, { status: 404 });
    }

    // Revert status to 'hadir' and clear check-out info
    await db.update(mandiriAbsensi)
      .set({
        keterangan: "hadir",
        alasanPulang: null,
        waktuPulang: null,
        timestamp: new Date().toISOString()
      })
      .where(eq(mandiriAbsensi.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mandiri Pulang POST restore error:", error);
    return NextResponse.json({ error: "Gagal memproses data" }, { status: 500 });
  }
}
