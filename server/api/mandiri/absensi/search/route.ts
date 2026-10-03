export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiri, mandiriDesa, idCardBuilderData, formPanitiaDanPengurus, settings, mandiriDaerah, timGambuh } from "@/lib/schema";
import { eq, or, like, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Search specifically for generus who are in the mandiri list for the specified kegiatan
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    let kegiatanId = searchParams.get("kegiatanId") || "";
    const showAll = searchParams.get("showAll") === "true";

    if (!q && !showAll) return NextResponse.json([]);

    if (!kegiatanId) {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      kegiatanId = activeSetting[0]?.value || "";
    }

    if (!kegiatanId) return NextResponse.json([]);

    const limitRecords = showAll ? 2000 : 10;
    const limitCombined = showAll ? 4000 : 15;

    const dataGenerus = await db
      .select({
        id: generus.id,
        nama: generus.nama,
        nomorUnik: generus.nomorUnik,
        desaNama: mandiriDesa.nama,
        desaKota: mandiriDaerah.nama,
        nomorPeserta: sql<string>`COALESCE(CAST(${mandiri.nomorUrut} AS TEXT), ${idCardBuilderData.dapukan})`,
      })
      .from(generus)
      .leftJoin(mandiri, and(eq(generus.id, mandiri.generusId), eq(mandiri.kegiatanId, kegiatanId)))
      .leftJoin(idCardBuilderData, and(eq(generus.nomorUnik, idCardBuilderData.nomorUnik), eq(idCardBuilderData.kegiatanId, kegiatanId)))
      .leftJoin(timGambuh, eq(generus.id, timGambuh.id))
      .leftJoin(
        mandiriDesa,
        eq(
          sql`COALESCE(${generus.mandiriDesaId}, ${timGambuh.desaId})`,
          mandiriDesa.id
        )
      )
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(
        and(
          q ? or(
            like(generus.nama, `%${q}%`),
            like(generus.nomorUnik, `%${q}%`)
          ) : undefined,
          or(
            sql`${mandiri.id} IS NOT NULL`,
            sql`${idCardBuilderData.id} IS NOT NULL`
          )
        )
      )
      .limit(limitRecords);

    // Also search specifically in form_panitia_dan_pengurus for those not yet in generus or those with different info
    const dataPanitia = await db
      .select({
        id: sql<string>`COALESCE(${formPanitiaDanPengurus.generusId}, ${formPanitiaDanPengurus.id})`,
        nama: formPanitiaDanPengurus.nama,
        nomorUnik: formPanitiaDanPengurus.nomorUnik,
        desaNama: mandiriDesa.nama,
        desaKota: mandiriDaerah.nama,
        nomorPeserta: formPanitiaDanPengurus.dapukan,
      })
      .from(formPanitiaDanPengurus)
      .leftJoin(mandiriDesa, eq(formPanitiaDanPengurus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(
        and(
          eq(formPanitiaDanPengurus.kegiatanId, kegiatanId),
          q ? or(
            like(formPanitiaDanPengurus.nama, `%${q}%`),
            like(formPanitiaDanPengurus.nomorUnik, `%${q}%`),
            like(formPanitiaDanPengurus.noTelp, `%${q}%`)
          ) : undefined
        )
      )
      .limit(limitRecords);

    // Also search specifically in tim_gambuh for Tim PNKB and Ibu Gambuh
    const dataTimGambuh = await db
      .select({
        id: timGambuh.id,
        nama: timGambuh.nama,
        nomorUnik: sql<string>`COALESCE(${generus.nomorUnik}, ${timGambuh.id})`,
        desaNama: mandiriDesa.nama,
        desaKota: mandiriDaerah.nama,
        nomorPeserta: timGambuh.tipe,
      })
      .from(timGambuh)
      .leftJoin(generus, eq(timGambuh.id, generus.id))
      .leftJoin(mandiriDesa, eq(timGambuh.desaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(
        and(
          eq(timGambuh.kegiatanId, kegiatanId),
          q ? or(
            like(timGambuh.nama, `%${q}%`),
            like(timGambuh.tipe, `%${q}%`),
            like(timGambuh.noTelp, `%${q}%`)
          ) : undefined
        )
      )
      .limit(limitRecords);

    // Combine and deduplicate by nama + nomorUnik
    const combined = [...dataGenerus, ...dataPanitia, ...dataTimGambuh];
    const seen = new Set();
    const data = combined.filter(item => {
      const key = `${item.nama}-${item.nomorUnik}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limitCombined);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Mandiri Search generus error:", error);
    return NextResponse.json({ error: "Gagal mencari data" }, { status: 500 });
  }
}
