export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriDaerah, mandiriKegiatanDaerah, settings } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    if (scope === "all") {
      const data = await db.select().from(mandiriDaerah)
        .orderBy(mandiriDaerah.nama);
      return NextResponse.json(data);
    }

    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const activeKegiatanId = activeSetting[0]?.value;

    if (!activeKegiatanId) {
      return NextResponse.json([]);
    }

    const data = await db
      .select({
        id: mandiriDaerah.id,
        nama: mandiriDaerah.nama,
      })
      .from(mandiriDaerah)
      .innerJoin(
        mandiriKegiatanDaerah,
        and(
          eq(mandiriKegiatanDaerah.daerahId, mandiriDaerah.id),
          eq(mandiriKegiatanDaerah.kegiatanId, activeKegiatanId)
        )
      )
      .orderBy(mandiriDaerah.nama);
      
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data daerah" }, { status: 500 });
  }
}
