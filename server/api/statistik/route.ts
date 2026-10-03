export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generus,
  kegiatan,
  absensi,
  desa,
  kelompok,
  users,
  mandiriDaerah,
  mandiriDesa,
  mandiriKelompok,
} from "@/lib/schema";
import { eq, and, or, sql, isNull, notInArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";

function toInt(v: string | null) {
  if (!v || v === "all" || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);

    // Filter params
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const kategoriAcara = searchParams.get("kategoriAcara") || "all";
    const qDesaId = toInt(searchParams.get("desaId"));
    const qKelompokId = toInt(searchParams.get("kelompokId"));
    const qDaerahId = toInt(searchParams.get("daerahId"));
    const qMandiriDesaId = toInt(searchParams.get("mandiriDesaId"));
    const qMandiriKelompokId = toInt(searchParams.get("mandiriKelompokId"));
    const kategoriMudaMudi = searchParams.get("kategoriMudaMudi") || "all";
    const jenisKelamin = searchParams.get("jenisKelamin") || "all";
    const kategoriUsia = searchParams.get("kategoriUsia") || "all";

    // Role scope base filters for generus
    const roleDesaId = session.role === "desa" && session.desaId ? session.desaId : null;
    const roleKelompokId = session.role === "kelompok" && session.kelompokId ? session.kelompokId : null;
    // tim_pnkb scoped like desa/kelompok
    const roleTimDesaId = session.role === "tim_pnkb" && !session.kelompokId && session.desaId ? session.desaId : null;
    const roleTimKelompokId = session.role === "tim_pnkb" && session.kelompokId ? session.kelompokId : null;

    const effectiveDesaId = roleDesaId ?? roleTimDesaId ?? qDesaId;
    const effectiveKelompokId = roleKelompokId ?? roleTimKelompokId ?? qKelompokId;

    // Build generus where conditions
    const generusConds: any[] = [];
    generusConds.push(eq(generus.isGenerus, 1));
    // Exclude admin roles from generus counts
    generusConds.push(
      or(
        isNull(users.role),
        notInArray(users.role, ["tim_pnkb", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "creator", "admin", "admin_romantic_room", "admin_keuangan", "admin_kegiatan"])
      )
    );
    if (effectiveDesaId != null) generusConds.push(eq(generus.desaId, effectiveDesaId));
    if (effectiveKelompokId != null) generusConds.push(eq(generus.kelompokId, effectiveKelompokId));
    if (qDaerahId != null) generusConds.push(eq(mandiriDesa.mandiriDaerahId, qDaerahId));
    if (qMandiriDesaId != null) generusConds.push(eq(generus.mandiriDesaId, qMandiriDesaId));
    if (qMandiriKelompokId != null) generusConds.push(eq(generus.mandiriKelompokId, qMandiriKelompokId));
    if (kategoriMudaMudi !== "all") generusConds.push(eq(generus.kategoriMudaMudi, kategoriMudaMudi as any));
    if (jenisKelamin === "L" || jenisKelamin === "P") generusConds.push(eq(generus.jenisKelamin, jenisKelamin as any));
    if (kategoriUsia !== "all") generusConds.push(eq(generus.kategoriUsia, kategoriUsia as any));

    const generusWhere = and(...generusConds);

    // Kegiatan where conditions
    const kegiatanConds: any[] = [];
    if (kategoriAcara !== "all") kegiatanConds.push(eq(kegiatan.kategoriAcara, kategoriAcara as any));
    if (effectiveDesaId != null) kegiatanConds.push(eq(kegiatan.desaId, effectiveDesaId));
    if (effectiveKelompokId != null) kegiatanConds.push(eq(kegiatan.kelompokId, effectiveKelompokId));
    if (from) kegiatanConds.push(sql`${kegiatan.tanggal} >= ${from}`);
    if (to) kegiatanConds.push(sql`${kegiatan.tanggal} <= ${to}`);
    // Role scope for desa/kelompok kegiatan already handled via effective ids, but if role is kelompok also allow desa-wide kegiatan (kelompokId null) ?
    // For stats we keep strict as above; bisa di-relax jika diperlukan.

    const kegiatanWhere = kegiatanConds.length ? and(...kegiatanConds) : undefined;

    // Helper to add joins needed for generus queries that involve mandiriDesa
    const needsMandiriDesaJoin = qDaerahId != null;

    // ========== GENERUS STATS ==========
    // Total generus
    const totalGenerusQ = needsMandiriDesaJoin
      ? db
          .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
          .from(generus)
          .leftJoin(users, eq(generus.id, users.generusId))
          .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
          .where(generusWhere)
      : db
          .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
          .from(generus)
          .leftJoin(users, eq(generus.id, users.generusId))
          .where(generusWhere);

    // By Gender
    const byGenderQ = needsMandiriDesaJoin
      ? db
          .select({ name: generus.jenisKelamin, value: sql<number>`count(*)` })
          .from(generus)
          .leftJoin(users, eq(generus.id, users.generusId))
          .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
          .where(generusWhere)
          .groupBy(generus.jenisKelamin)
      : db
          .select({ name: generus.jenisKelamin, value: sql<number>`count(*)` })
          .from(generus)
          .leftJoin(users, eq(generus.id, users.generusId))
          .where(generusWhere)
          .groupBy(generus.jenisKelamin);

    // By Kategori Usia
    const byUsiaQ = needsMandiriDesaJoin
      ? db
          .select({ name: generus.kategoriUsia, value: sql<number>`count(*)` })
          .from(generus)
          .leftJoin(users, eq(generus.id, users.generusId))
          .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
          .where(generusWhere)
          .groupBy(generus.kategoriUsia)
      : db
          .select({ name: generus.kategoriUsia, value: sql<number>`count(*)` })
          .from(generus)
          .leftJoin(users, eq(generus.id, users.generusId))
          .where(generusWhere)
          .groupBy(generus.kategoriUsia);

    // By Pribumi/Perantauan
    const byMudaMudiQ = needsMandiriDesaJoin
      ? db
          .select({ name: sql<string>`COALESCE(${generus.kategoriMudaMudi}, 'belum_diisi')`, value: sql<number>`count(*)` })
          .from(generus)
          .leftJoin(users, eq(generus.id, users.generusId))
          .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
          .where(generusWhere)
          .groupBy(generus.kategoriMudaMudi)
      : db
          .select({ name: sql<string>`COALESCE(${generus.kategoriMudaMudi}, 'belum_diisi')`, value: sql<number>`count(*)` })
          .from(generus)
          .leftJoin(users, eq(generus.id, users.generusId))
          .where(generusWhere)
          .groupBy(generus.kategoriMudaMudi);

    // By Desa (official wilayah)
    const byDesaQ = db
      .select({ name: sql<string>`COALESCE(${desa.nama}, 'Tanpa Desa')`, value: sql<number>`count(*)` })
      .from(generus)
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(generusWhere)
      .groupBy(desa.nama)
      .orderBy(sql`count(*) DESC`);

    // By Mandiri Daerah
    const byDaerahQ = db
      .select({ name: sql<string>`COALESCE(${mandiriDaerah.nama}, 'Tanpa Daerah')`, value: sql<number>`count(*)` })
      .from(generus)
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .where(generusWhere)
      .groupBy(mandiriDaerah.nama)
      .orderBy(sql`count(*) DESC`);

    // By Pendidikan (top)
    const byPendidikanQ = db
      .select({ name: sql<string>`COALESCE(${generus.pendidikan}, 'Belum diisi')`, value: sql<number>`count(*)` })
      .from(generus)
      .leftJoin(users, eq(generus.id, users.generusId))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(generusWhere)
      .groupBy(generus.pendidikan)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // ========== KEGIATAN STATS ==========
    const totalKegiatanQ = db.select({ count: sql<number>`count(*)` }).from(kegiatan).where(kegiatanWhere);
    const kegiatanByKategoriQ = db
      .select({ name: sql<string>`COALESCE(${kegiatan.kategoriAcara}, 'lainnya')`, value: sql<number>`count(*)` })
      .from(kegiatan)
      .where(kegiatanWhere)
      .groupBy(kegiatan.kategoriAcara);
    const kegiatanMonthlyQ = db
      .select({ name: sql<string>`substr(${kegiatan.tanggal},1,7)`, value: sql<number>`count(*)` })
      .from(kegiatan)
      .where(kegiatanWhere)
      .groupBy(sql`substr(${kegiatan.tanggal},1,7)`)
      .orderBy(sql`substr(${kegiatan.tanggal},1,7) ASC`);

    // ========== ABSENSI STATS ==========
    // Build absensi where: need to join generus & kegiatan & apply filters
    // We'll run aggregated queries with explicit where on joined tables.
    // For absensi we filter by kegiatan tanggal range + kategoriAcara + generus filters.
    const absensiBaseConds: any[] = [];
    if (from) absensiBaseConds.push(sql`${kegiatan.tanggal} >= ${from}`);
    if (to) absensiBaseConds.push(sql`${kegiatan.tanggal} <= ${to}`);
    if (kategoriAcara !== "all") absensiBaseConds.push(eq(kegiatan.kategoriAcara, kategoriAcara as any));
    if (effectiveDesaId != null) {
      // absensi filtered by generus wilayah OR kegiatan wilayah? We'll filter by generus wilayah primarily
      absensiBaseConds.push(eq(generus.desaId, effectiveDesaId));
    }
    if (effectiveKelompokId != null) absensiBaseConds.push(eq(generus.kelompokId, effectiveKelompokId));
    if (qDaerahId != null) absensiBaseConds.push(eq(mandiriDesa.mandiriDaerahId, qDaerahId));
    if (qMandiriDesaId != null) absensiBaseConds.push(eq(generus.mandiriDesaId, qMandiriDesaId));
    if (qMandiriKelompokId != null) absensiBaseConds.push(eq(generus.mandiriKelompokId, qMandiriKelompokId));
    if (kategoriMudaMudi !== "all") absensiBaseConds.push(eq(generus.kategoriMudaMudi, kategoriMudaMudi as any));
    if (jenisKelamin === "L" || jenisKelamin === "P") absensiBaseConds.push(eq(generus.jenisKelamin, jenisKelamin as any));
    if (kategoriUsia !== "all") absensiBaseConds.push(eq(generus.kategoriUsia, kategoriUsia as any));

    const absensiWhere = absensiBaseConds.length ? and(...absensiBaseConds) : undefined;

    // Total absensi & by keterangan
    const totalAbsensiQ = db
      .select({ count: sql<number>`count(*)` })
      .from(absensi)
      .innerJoin(generus, eq(absensi.generusId, generus.id))
      .innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(absensiWhere);

    const byKeteranganQ = db
      .select({ name: absensi.keterangan, value: sql<number>`count(*)` })
      .from(absensi)
      .innerJoin(generus, eq(absensi.generusId, generus.id))
      .innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(absensiWhere)
      .groupBy(absensi.keterangan);

    const absensiByGenderQ = db
      .select({ name: generus.jenisKelamin, value: sql<number>`count(*)` })
      .from(absensi)
      .innerJoin(generus, eq(absensi.generusId, generus.id))
      .innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(absensiWhere)
      .groupBy(generus.jenisKelamin);

    const absensiByUsiaQ = db
      .select({ name: generus.kategoriUsia, value: sql<number>`count(*)` })
      .from(absensi)
      .innerJoin(generus, eq(absensi.generusId, generus.id))
      .innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(absensiWhere)
      .groupBy(generus.kategoriUsia)
      .orderBy(sql`count(*) DESC`);

    const absensiByMudaMudiQ = db
      .select({ name: sql<string>`COALESCE(${generus.kategoriMudaMudi}, 'belum_diisi')`, value: sql<number>`count(*)` })
      .from(absensi)
      .innerJoin(generus, eq(absensi.generusId, generus.id))
      .innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(absensiWhere)
      .groupBy(generus.kategoriMudaMudi);

    const absensiByKategoriAcaraQ = db
      .select({ name: sql<string>`COALESCE(${kegiatan.kategoriAcara}, 'lainnya')`, value: sql<number>`count(*)` })
      .from(absensi)
      .innerJoin(generus, eq(absensi.generusId, generus.id))
      .innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(absensiWhere)
      .groupBy(kegiatan.kategoriAcara);

    const absensiTimeSeriesQ = db
      .select({
        date: kegiatan.tanggal,
        hadir: sql<number>`SUM(CASE WHEN ${absensi.keterangan}='hadir' THEN 1 ELSE 0 END)`,
        izin: sql<number>`SUM(CASE WHEN ${absensi.keterangan}='izin' THEN 1 ELSE 0 END)`,
        alpha: sql<number>`SUM(CASE WHEN ${absensi.keterangan}='alpha' THEN 1 ELSE 0 END)`,
        total: sql<number>`count(*)`,
      })
      .from(absensi)
      .innerJoin(generus, eq(absensi.generusId, generus.id))
      .innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(absensiWhere)
      .groupBy(kegiatan.tanggal)
      .orderBy(kegiatan.tanggal);

    const absensiByDesaQ = db
      .select({ name: sql<string>`COALESCE(${desa.nama}, 'Tanpa Desa')`, value: sql<number>`count(*)` })
      .from(absensi)
      .innerJoin(generus, eq(absensi.generusId, generus.id))
      .innerJoin(kegiatan, eq(absensi.kegiatanId, kegiatan.id))
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .where(absensiWhere)
      .groupBy(desa.nama)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // Execute all in parallel
    const [
      totalGenerusRes,
      byGenderRes,
      byUsiaRes,
      byMudaMudiRes,
      byDesaRes,
      byDaerahRes,
      byPendidikanRes,
      totalKegiatanRes,
      kegiatanByKategoriRes,
      kegiatanMonthlyRes,
      totalAbsensiRes,
      byKeteranganRes,
      absensiByGenderRes,
      absensiByUsiaRes,
      absensiByMudaMudiRes,
      absensiByKategoriAcaraRes,
      timeSeriesRes,
      absensiByDesaRes,
    ] = await Promise.all([
      totalGenerusQ,
      byGenderQ,
      byUsiaQ,
      byMudaMudiQ,
      byDesaQ,
      byDaerahQ,
      byPendidikanQ,
      totalKegiatanQ,
      kegiatanByKategoriQ,
      kegiatanMonthlyQ,
      totalAbsensiQ,
      byKeteranganQ,
      absensiByGenderQ,
      absensiByUsiaQ,
      absensiByMudaMudiQ,
      absensiByKategoriAcaraQ,
      absensiTimeSeriesQ,
      absensiByDesaQ,
    ]);

    const totalGenerus = Number(totalGenerusRes[0]?.count || 0);
    const totalKegiatan = Number(totalKegiatanRes[0]?.count || 0);
    const totalAbsensi = Number(totalAbsensiRes[0]?.count || 0);

    // normalize helpers
    const norm = (arr: any[]) =>
      arr.map((r: any) => ({ name: r.name ?? "unknown", value: Number(r.value || 0) })).filter((r) => r.value > 0);

    const hadir = Number((byKeteranganRes as any[]).find((r: any) => r.name === "hadir")?.value || 0);
    const izin = Number((byKeteranganRes as any[]).find((r: any) => r.name === "izin")?.value || 0);
    const alpha = Number((byKeteranganRes as any[]).find((r: any) => r.name === "alpha")?.value || 0);
    const hadirRate = totalAbsensi > 0 ? Math.round((hadir / totalAbsensi) * 100) : 0;

    return NextResponse.json(
      {
        summary: { totalGenerus, totalKegiatan, totalAbsensi, hadir, izin, alpha, hadirRate },
        member: {
          byGender: norm(byGenderRes as any),
          byUsia: norm(byUsiaRes as any),
          byMudaMudi: norm(byMudaMudiRes as any),
          byDesa: norm(byDesaRes as any),
          byDaerah: norm(byDaerahRes as any),
          byPendidikan: norm(byPendidikanRes as any),
        },
        kegiatan: {
          total: totalKegiatan,
          byKategori: norm(kegiatanByKategoriRes as any),
          monthly: (kegiatanMonthlyRes as any[]).map((r: any) => ({ name: r.name, value: Number(r.value) })),
        },
        absensi: {
          total: totalAbsensi,
          byKeterangan: norm(byKeteranganRes as any),
          byGender: norm(absensiByGenderRes as any),
          byUsia: norm(absensiByUsiaRes as any),
          byMudaMudi: norm(absensiByMudaMudiRes as any),
          byKategoriAcara: norm(absensiByKategoriAcaraRes as any),
          byDesa: norm(absensiByDesaRes as any),
          timeSeries: (timeSeriesRes as any[]).map((r: any) => ({
            date: r.date,
            hadir: Number(r.hadir || 0),
            izin: Number(r.izin || 0),
            alpha: Number(r.alpha || 0),
            total: Number(r.total || 0),
          })),
        },
        filtersApplied: {
          from: from || null,
          to: to || null,
          kategoriAcara,
          desaId: effectiveDesaId,
          kelompokId: effectiveKelompokId,
          daerahId: qDaerahId,
          mandiriDesaId: qMandiriDesaId,
          mandiriKelompokId: qMandiriKelompokId,
          kategoriMudaMudi,
          jenisKelamin,
          kategoriUsia,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Statistik GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil statistik" }, { status: 500 });
  }
}
