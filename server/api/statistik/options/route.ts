export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { desa, kelompok, kegiatan, mandiriDaerah, mandiriDesa, mandiriKelompok } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Scope-aware: desa/kelompok users only see own wilayah, but for statistik we still expose all if admin
    const isScopedDesa = session.role === "desa" && session.desaId;
    const isScopedKelompok = session.role === "kelompok" && session.kelompokId;

    const [desas, kelompoks, daerahs, mandiriDesas, mandiriKelompoks, kategoriDistinct] = await Promise.all([
      db.select({ id: desa.id, nama: desa.nama }).from(desa).orderBy(desa.nama),
      db.select({ id: kelompok.id, nama: kelompok.nama, desaId: kelompok.desaId }).from(kelompok).orderBy(kelompok.nama),
      db.select({ id: mandiriDaerah.id, nama: mandiriDaerah.nama }).from(mandiriDaerah).orderBy(mandiriDaerah.nama),
      db.select({ id: mandiriDesa.id, nama: mandiriDesa.nama, daerahId: mandiriDesa.mandiriDaerahId }).from(mandiriDesa).orderBy(mandiriDesa.nama),
      db.select({ id: mandiriKelompok.id, nama: mandiriKelompok.nama, desaId: mandiriKelompok.mandiriDesaId }).from(mandiriKelompok).orderBy(mandiriKelompok.nama),
      db.select({ val: sql<string>`DISTINCT ${kegiatan.kategoriAcara}` }).from(kegiatan).where(sql`${kegiatan.kategoriAcara} IS NOT NULL`),
    ]);

    // kategoriAcara options static + from DB
    const kategoriAcaraOptions = ["sambung_rutin", "keakraban", "pemantapan", "lainnya"];

    const scopedDesas = isScopedDesa ? desas.filter((d: any) => d.id === session.desaId) : desas;
    const scopedKelompoks = isScopedKelompok ? kelompoks.filter((k: any) => k.id === session.kelompokId) : isScopedDesa ? kelompoks.filter((k: any) => k.desaId === session.desaId) : kelompoks;

    return NextResponse.json(
      {
        desas: scopedDesas,
        kelompoks: scopedKelompoks,
        daerahs,
        mandiriDesas,
        mandiriKelompoks,
        kategoriAcaraOptions,
        kategoriUsiaOptions: ["PAUD", "TK", "SD", "SMP", "SMA", "SMK", "Kuliah", "Bekerja", "Mandiri"],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("statistik options error", e);
    return NextResponse.json({ error: "Gagal memuat opsi filter" }, { status: 500 });
  }
}
