export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generus,
  kegiatan,
  artikel,
  users,
  mandiriKegiatan,
  mandiri,
  mandiriAbsensi,
  formPanitiaDanPengurus,
  mandiriDesa,
  mandiriDaerah,
  mandiriKelompok,
  mandiriKegiatanDaerah,
  mandiriKunjungan,
  mandiriPemilihan,
  settings,
} from "@/lib/schema";
import {
  eq,
  and,
  sql,
  or,
  isNull,
  not,
  notInArray,
  desc,
  inArray,
  aliasedTable,
  isNotNull,
  like,
} from "drizzle-orm";

async function getStats(session: any, searchParams?: any) {
  try {
    if (!session) return null;
    const isManagementOrPNKB = ["desa", "kelompok", "tim_pnkb"].includes(session.role);
    const desaFilter =
      (session.role === "desa" || (session.role === "tim_pnkb" && !session.kelompokId)) && session.desaId
        ? eq(generus.desaId, session.desaId)
        : undefined;
    const kelompokFilter =
      (session.role === "kelompok" || (session.role === "tim_pnkb" && session.kelompokId)) && session.kelompokId
        ? eq(generus.kelompokId, session.kelompokId)
        : undefined;
    const generusFilter = desaFilter || kelompokFilter;

    const desaFilterKegiatan =
      (session.role === "desa" || (session.role === "tim_pnkb" && !session.kelompokId)) && session.desaId
        ? eq(kegiatan.desaId, session.desaId)
        : undefined;
    const kelompokFilterKegiatan =
      (session.role === "kelompok" || (session.role === "tim_pnkb" && session.kelompokId)) && session.kelompokId
        ? eq(kegiatan.kelompokId, session.kelompokId)
        : undefined;
    const kegiatanFilter = desaFilterKegiatan || kelompokFilterKegiatan;

    const offsetTz = new Date().getTimezoneOffset();
    const localToday = new Date(new Date().getTime() - offsetTz * 60 * 1000);
    const todayStr = localToday.toISOString().split("T")[0];
    const finalKegiatanFilter = kegiatanFilter
      ? and(kegiatanFilter, sql`${kegiatan.tanggal} >= ${todayStr}`)
      : (sql`${kegiatan.tanggal} >= ${todayStr}` as any);
    const historyKegiatanFilter = kegiatanFilter
      ? and(kegiatanFilter, sql`${kegiatan.tanggal} < ${todayStr}`)
      : (sql`${kegiatan.tanggal} < ${todayStr}` as any);

    const roleExclusion = and(
      or(
        isNull(users.role),
        notInArray(users.role, [
          "tim_pnkb",
          "pengurus_daerah",
          "kmm_daerah",
          "desa",
          "kelompok",
          "creator",
        ]),
      ),
      not(like(generus.nomorUnik, "PNKB-%")),
      not(like(generus.nomorUnik, "PNB-%"))
    );

    const finalGenerusFilter = generusFilter
      ? and(generusFilter, roleExclusion)
      : (roleExclusion as any);

    // Active Mandiri Kegiatan from settings
    const activeSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "mandiri_active_kegiatan_id"));
    const currentActivityId = activeSetting[0]?.value || undefined;

    let activeKegiatanTitle = "";
    if (currentActivityId) {
      const kegiatanInfo = await db
        .select({ judul: mandiriKegiatan.judul })
        .from(mandiriKegiatan)
        .where(eq(mandiriKegiatan.id, currentActivityId))
        .limit(1);
      if (kegiatanInfo.length > 0) {
        activeKegiatanTitle = kegiatanInfo[0].judul;
      }
    }

    const attendanceFilter = (extra?: any) => {
      const base = [eq(mandiriAbsensi.keterangan, "hadir")];
      if (currentActivityId) base.push(eq(mandiriAbsensi.kegiatanId, currentActivityId));
      else base.push(sql`1=0`);
      return extra ? and(...base, extra) : and(...base);
    };

    const pulangFilter = (extra?: any) => {
      const base = [eq(mandiriAbsensi.keterangan, "pulang")];
      if (currentActivityId) base.push(eq(mandiriAbsensi.kegiatanId, currentActivityId));
      else base.push(sql`1=0`);
      return extra ? and(...base, extra) : and(...base);
    };

    const desaFilterPanitia =
      (session.role === "desa" || (session.role === "tim_pnkb" && !session.kelompokId)) && session.desaId
        ? eq(formPanitiaDanPengurus.mandiriDesaId, session.desaId)
        : undefined;
    const kelompokFilterPanitia =
      (session.role === "kelompok" || (session.role === "tim_pnkb" && session.kelompokId)) && session.kelompokId
        ? eq(formPanitiaDanPengurus.mandiriKelompokId, session.kelompokId)
        : undefined;
    const panitiaFilter = desaFilterPanitia || kelompokFilterPanitia;

    // Mandiri Specific Filters from searchParams
    const mCity = searchParams?.city;
    const mVillage = searchParams?.village;
    const mGroup = searchParams?.group;
    const mGender = searchParams?.gender;

    let mandiriUserConditions: any[] = [];
    let panitiaConditions: any[] = [];

    if (mGender) {
      mandiriUserConditions.push(eq(generus.jenisKelamin, mGender as any));
      panitiaConditions.push(eq(formPanitiaDanPengurus.jenisKelamin, mGender as any));
    }

    let mandiriDesaIds: number[] | undefined = undefined;
    if (mCity || mVillage) {
      const conditions = [];
      if (mCity) conditions.push(eq(mandiriDaerah.nama, mCity));
      if (mVillage) conditions.push(eq(mandiriDesa.nama, mVillage));

      const matchedDesas = await db
        .select({ id: mandiriDesa.id })
        .from(mandiriDesa)
        .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
        .where(and(...conditions));
      mandiriDesaIds = matchedDesas.map((d: { id: number }) => d.id);

      if (mandiriDesaIds && mandiriDesaIds.length === 0) {
        mandiriUserConditions.push(sql`1=0`);
        panitiaConditions.push(sql`1=0`);
      } else if (mandiriDesaIds) {
        mandiriUserConditions.push(inArray(generus.mandiriDesaId, mandiriDesaIds));
        panitiaConditions.push(inArray(formPanitiaDanPengurus.mandiriDesaId, mandiriDesaIds));
      }
    }

    if (mGroup) {
      const matchedGroups = await db
        .select({ id: mandiriKelompok.id })
        .from(mandiriKelompok)
        .where(eq(mandiriKelompok.nama, mGroup));
      const mandiriKelompokIds = matchedGroups.map((g) => g.id);
      if (mandiriKelompokIds.length === 0) {
        mandiriUserConditions.push(sql`1=0`);
        panitiaConditions.push(sql`1=0`);
      } else {
        mandiriUserConditions.push(inArray(generus.mandiriKelompokId, mandiriKelompokIds));
        panitiaConditions.push(inArray(formPanitiaDanPengurus.mandiriKelompokId, mandiriKelompokIds));
      }
    }

    const mandiriUserFilter = mandiriUserConditions.length > 0 ? and(...mandiriUserConditions) : undefined;
    const panitiaFilterWithParams = panitiaConditions.length > 0 ? and(...panitiaConditions) : undefined;

    let artikelAuthorConditions = [];
    if (["desa", "kelompok", "creator"].includes(session.role)) {
      if (session.desaId && (session.role === "desa" || session.role === "creator")) {
        artikelAuthorConditions.push(eq(users.desaId, session.desaId));
      }
      if (session.kelompokId && (session.role === "kelompok" || session.role === "creator")) {
        artikelAuthorConditions.push(eq(users.kelompokId, session.kelompokId));
      }
    }
    const artikelAuthorFilter = artikelAuthorConditions.length > 0 ? and(...artikelAuthorConditions) : undefined;

    const [
      generusCount,
      kegiatanCount,
      historyKegiatanCount,
      artikelCount,
      beritaCount,
      userCount,
      marriedCount,
      notMarriedCount,
      paudCount,
      tkCount,
      sdCount,
      smpCount,
      smaCount,
      smkCount,
      kuliahCount,
      bekerjaCount,
      usiaMandiriCount,
      mandiriCount,
      mandiriHadirPeserta,
      mandiriHadirLaki,
      mandiriHadirPerempuan,
      mandiriHadirPanitia,
      mandiriHadirPanitiaLaki,
      mandiriHadirPanitiaPerempuan,
      mandiriTotalPanitia,
      mandiriPulangPeserta,
      mandiriPulangPanitia,
      mandiriTerdaftarPesertaLaki,
      mandiriTerdaftarPesertaPerempuan,
      mandiriTerdaftarPanitiaLaki,
      mandiriTerdaftarPanitiaPerempuan,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1))),
      db.select({ count: sql<number>`count(*)` }).from(kegiatan).where(finalKegiatanFilter),
      db.select({ count: sql<number>`count(*)` }).from(kegiatan).where(historyKegiatanFilter),
      db
        .select({ count: sql<number>`count(*)` })
        .from(artikel)
        .leftJoin(users, eq(artikel.authorId, users.id))
        .where(
          artikelAuthorFilter
            ? and(eq(artikel.status, "published"), eq(artikel.tipe, "artikel"), artikelAuthorFilter)
            : and(eq(artikel.status, "published"), eq(artikel.tipe, "artikel"))
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(artikel)
        .leftJoin(users, eq(artikel.authorId, users.id))
        .where(
          artikelAuthorFilter
            ? and(eq(artikel.status, "published"), eq(artikel.tipe, "berita"), artikelAuthorFilter)
            : and(eq(artikel.status, "published"), eq(artikel.tipe, "berita"))
        ),
      ["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room"].includes(session.role)
        ? db.select({ count: sql<number>`count(*)` }).from(users)
        : Promise.resolve([{ count: 0 }]),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.statusNikah, "Menikah"))),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.statusNikah, "Belum Menikah"))),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "PAUD"))),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "TK"))),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "SD"))),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "SMP"))),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "SMA"))),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "SMK"))),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "Kuliah"))),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "Bekerja"))),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            or(eq(users.role, "usia_mandiri"), eq(generus.kategori, "Usia Mandiri"))
          )
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiri)
        .innerJoin(generus, eq(mandiri.generusId, generus.id))
        .where(
          and(
            generusFilter,
            mandiriUserFilter,
            currentActivityId ? eq(mandiri.kegiatanId, currentActivityId) : undefined,
            currentActivityId
              ? sql`${mandiri.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${currentActivityId})`
              : sql`${mandiri.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`
          )
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiriAbsensi)
        .innerJoin(mandiri, eq(mandiriAbsensi.generusId, mandiri.generusId))
        .innerJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
        .where(
          and(
            attendanceFilter(),
            generusFilter,
            mandiriUserFilter,
            currentActivityId
              ? sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${currentActivityId})`
              : sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`
          )
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiriAbsensi)
        .innerJoin(mandiri, eq(mandiriAbsensi.generusId, mandiri.generusId))
        .innerJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
        .where(
          and(
            attendanceFilter(eq(generus.jenisKelamin, "L")),
            generusFilter,
            mandiriUserFilter,
            currentActivityId
              ? sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${currentActivityId})`
              : sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`
          )
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiriAbsensi)
        .innerJoin(mandiri, eq(mandiriAbsensi.generusId, mandiri.generusId))
        .innerJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
        .where(
          and(
            attendanceFilter(eq(generus.jenisKelamin, "P")),
            generusFilter,
            mandiriUserFilter,
            currentActivityId
              ? sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${currentActivityId})`
              : sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`
          )
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${formPanitiaDanPengurus.id})` })
        .from(mandiriAbsensi)
        .innerJoin(formPanitiaDanPengurus, eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId))
        .where(
          and(
            attendanceFilter(),
            panitiaFilter,
            panitiaFilterWithParams,
            currentActivityId ? eq(formPanitiaDanPengurus.kegiatanId, currentActivityId) : undefined
          )
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${formPanitiaDanPengurus.id})` })
        .from(mandiriAbsensi)
        .innerJoin(formPanitiaDanPengurus, eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId))
        .where(
          and(
            attendanceFilter(eq(formPanitiaDanPengurus.jenisKelamin, "L")),
            panitiaFilter,
            panitiaFilterWithParams,
            currentActivityId ? eq(formPanitiaDanPengurus.kegiatanId, currentActivityId) : undefined
          )
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${formPanitiaDanPengurus.id})` })
        .from(mandiriAbsensi)
        .innerJoin(formPanitiaDanPengurus, eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId))
        .where(
          and(
            attendanceFilter(eq(formPanitiaDanPengurus.jenisKelamin, "P")),
            panitiaFilter,
            panitiaFilterWithParams,
            currentActivityId ? eq(formPanitiaDanPengurus.kegiatanId, currentActivityId) : undefined
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(formPanitiaDanPengurus)
        .where(
          and(
            panitiaFilter,
            panitiaFilterWithParams,
            currentActivityId ? eq(formPanitiaDanPengurus.kegiatanId, currentActivityId) : undefined
          )
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiriAbsensi)
        .innerJoin(mandiri, eq(mandiriAbsensi.generusId, mandiri.generusId))
        .innerJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
        .where(
          and(
            pulangFilter(),
            generusFilter,
            mandiriUserFilter,
            currentActivityId
              ? sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${currentActivityId})`
              : sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`
          )
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${formPanitiaDanPengurus.id})` })
        .from(mandiriAbsensi)
        .innerJoin(formPanitiaDanPengurus, eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId))
        .where(
          and(
            pulangFilter(),
            panitiaFilter,
            panitiaFilterWithParams,
            currentActivityId ? eq(formPanitiaDanPengurus.kegiatanId, currentActivityId) : undefined
          )
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiri)
        .innerJoin(generus, eq(mandiri.generusId, generus.id))
        .where(
          and(
            generusFilter,
            mandiriUserFilter,
            eq(generus.jenisKelamin, "L"),
            currentActivityId ? eq(mandiri.kegiatanId, currentActivityId) : undefined,
            currentActivityId
              ? sql`${mandiri.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${currentActivityId})`
              : sql`${mandiri.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`
          )
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiri)
        .innerJoin(generus, eq(mandiri.generusId, generus.id))
        .where(
          and(
            generusFilter,
            mandiriUserFilter,
            eq(generus.jenisKelamin, "P"),
            currentActivityId ? eq(mandiri.kegiatanId, currentActivityId) : undefined,
            currentActivityId
              ? sql`${mandiri.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${currentActivityId})`
              : sql`${mandiri.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(formPanitiaDanPengurus)
        .where(
          and(
            panitiaFilter,
            panitiaFilterWithParams,
            eq(formPanitiaDanPengurus.jenisKelamin, "L"),
            currentActivityId ? eq(formPanitiaDanPengurus.kegiatanId, currentActivityId) : undefined
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(formPanitiaDanPengurus)
        .where(
          and(
            panitiaFilter,
            panitiaFilterWithParams,
            eq(formPanitiaDanPengurus.jenisKelamin, "P"),
            currentActivityId ? eq(formPanitiaDanPengurus.kegiatanId, currentActivityId) : undefined
          )
        ),
    ]);

    // Session Results Stats
    const g1 = aliasedTable(generus, "g1");
    const g2 = aliasedTable(generus, "g2");
    const md1 = aliasedTable(mandiriDesa, "md1");
    const md2 = aliasedTable(mandiriDesa, "md2");
    const mda1 = aliasedTable(mandiriDaerah, "mda1");
    const mda2 = aliasedTable(mandiriDaerah, "mda2");
    const mk1 = aliasedTable(mandiriKelompok, "mk1");
    const mk2 = aliasedTable(mandiriKelompok, "mk2");
    const pan1 = aliasedTable(formPanitiaDanPengurus, "pan1");
    const pan2 = aliasedTable(formPanitiaDanPengurus, "pan2");

    const allVisits = await db
      .select({
        h1: mandiriPemilihan.hasilPengirim,
        h2: mandiriPemilihan.hasilPenerima,
        city1: mda1.nama,
        village1: md1.nama,
        group1: mk1.nama,
        city2: mda2.nama,
        village2: md2.nama,
        group2: mk2.nama,
      })
      .from(mandiriKunjungan)
      .innerJoin(mandiriPemilihan, eq(mandiriKunjungan.pemilihanId, mandiriPemilihan.id))
      .leftJoin(g1, eq(sql`COALESCE(${mandiriPemilihan.pengirimId}, ${mandiriKunjungan.generusId})`, g1.id))
      .leftJoin(g2, eq(mandiriPemilihan.penerimaId, g2.id))
      .leftJoin(pan1, eq(g1.id, pan1.generusId))
      .leftJoin(pan2, eq(g2.id, pan2.generusId))
      .leftJoin(md1, eq(sql`COALESCE(${g1.mandiriDesaId}, ${pan1.mandiriDesaId})`, md1.id))
      .leftJoin(md2, eq(sql`COALESCE(${g2.mandiriDesaId}, ${pan2.mandiriDesaId})`, md2.id))
      .leftJoin(mda1, eq(md1.mandiriDaerahId, mda1.id))
      .leftJoin(mda2, eq(md2.mandiriDaerahId, mda2.id))
      .leftJoin(mk1, eq(sql`COALESCE(${g1.mandiriKelompokId}, ${pan1.mandiriKelompokId})`, mk1.id))
      .leftJoin(mk2, eq(sql`COALESCE(${g2.mandiriKelompokId}, ${pan2.mandiriKelompokId})`, mk2.id))
      .where(
        currentActivityId
          ? and(isNotNull(mandiriKunjungan.pemilihanId), eq(mandiriKunjungan.kegiatanId, currentActivityId))
          : isNotNull(mandiriKunjungan.pemilihanId)
      )
      .groupBy(mandiriKunjungan.pemilihanId);

    const filteredVisits = allVisits.filter((v: any) => {
      let match = true;
      if (mCity) match = v.city1 === mCity || v.city2 === mCity;
      if (mVillage && match) match = v.village1 === mVillage || v.village2 === mVillage;
      if (mGroup && match) match = v.group1 === mGroup || v.group2 === mGroup;
      return match;
    });

    const sessionStats = {
      totalSelesai: filteredVisits.filter((v: any) => v.h1 && v.h2).length,
      lanjutLanjut: filteredVisits.filter((v: any) => v.h1 === "Lanjut" && v.h2 === "Lanjut").length,
      lanjutTidak: filteredVisits.filter(
        (v: any) =>
          (v.h1 === "Lanjut" && v.h2 === "Tidak Lanjut") || (v.h1 === "Tidak Lanjut" && v.h2 === "Lanjut")
      ).length,
      tidakTidak: filteredVisits.filter((v: any) => v.h1 === "Tidak Lanjut" && v.h2 === "Tidak Lanjut").length,
      raguRagu: filteredVisits.filter((v: any) => v.h1 === "Ragu-ragu" && v.h2 === "Ragu-ragu").length,
      lanjutRagu: filteredVisits.filter(
        (v: any) =>
          (v.h1 === "Lanjut" && v.h2 === "Ragu-ragu") || (v.h1 === "Ragu-ragu" && v.h2 === "Lanjut")
      ).length,
      tidakRagu: filteredVisits.filter(
        (v: any) =>
          (v.h1 === "Tidak Lanjut" && v.h2 === "Ragu-ragu") || (v.h1 === "Ragu-ragu" && v.h2 === "Tidak Lanjut")
      ).length,
    };

    return {
      activeKegiatanTitle,
      generus: Number(generusCount[0].count),
      kegiatan: Number(kegiatanCount[0].count),
      historyKegiatan: Number(historyKegiatanCount[0].count),
      artikel: Number(artikelCount[0].count),
      berita: Number(beritaCount[0].count),
      users: Number(userCount[0].count),
      married: Number(marriedCount[0].count),
      notMarried: Number(notMarriedCount[0].count),
      paud: Number(paudCount[0].count),
      tk: Number(tkCount[0].count),
      sd: Number(sdCount[0].count),
      smp: Number(smpCount[0].count),
      sma: Number(smaCount[0].count),
      smk: Number(smkCount[0].count),
      kuliah: Number(kuliahCount[0].count),
      bekerja: Number(bekerjaCount[0].count),
      usiaMandiri: Number(usiaMandiriCount[0].count),
      mandiri: Number(mandiriCount[0].count),
      mandiriHadirPeserta: Number(mandiriHadirPeserta[0]?.count || 0),
      mandiriHadirLaki: Number(mandiriHadirLaki[0]?.count || 0),
      mandiriHadirPerempuan: Number(mandiriHadirPerempuan[0]?.count || 0),
      mandiriHadirPanitia: Number(mandiriHadirPanitia[0]?.count || 0),
      mandiriHadirPanitiaLaki: Number(mandiriHadirPanitiaLaki[0]?.count || 0),
      mandiriHadirPanitiaPerempuan: Number(mandiriHadirPanitiaPerempuan[0]?.count || 0),
      mandiriTotalPanitia: Number(mandiriTotalPanitia[0]?.count || 0),
      mandiriPulangPeserta: Number(mandiriPulangPeserta[0]?.count || 0),
      mandiriPulangPanitia: Number(mandiriPulangPanitia[0]?.count || 0),
      mandiriTidakHadirPeserta: Math.max(
        0,
        Number(mandiriCount[0].count) -
          Number(mandiriHadirPeserta[0]?.count || 0) -
          Number(mandiriPulangPeserta[0]?.count || 0)
      ),
      mandiriTidakHadirPanitia: Math.max(
        0,
        Number(mandiriTotalPanitia[0]?.count || 0) -
          Number(mandiriHadirPanitia[0]?.count || 0) -
          Number(mandiriPulangPanitia[0]?.count || 0)
      ),
      mandiriTerdaftarPesertaLaki: Number(mandiriTerdaftarPesertaLaki[0]?.count || 0),
      mandiriTerdaftarPesertaPerempuan: Number(mandiriTerdaftarPesertaPerempuan[0]?.count || 0),
      mandiriTerdaftarPanitiaLaki: Number(mandiriTerdaftarPanitiaLaki[0]?.count || 0),
      mandiriTerdaftarPanitiaPerempuan: Number(mandiriTerdaftarPanitiaPerempuan[0]?.count || 0),
      sessionStats,
    };
  } catch (error) {
    console.error("Dashboard DB fetch error:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Sesi telah berakhir. Silakan login kembali." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchParamsObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      searchParamsObj[key] = value;
    });

    const stats = await getStats(session, searchParamsObj);

    // Fetch Cities, Villages & Groups for Filter based on active kegiatan
    const activeSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "mandiri_active_kegiatan_id"));
    const currentActivityId = activeSetting[0]?.value || undefined;

    let activeDaerahIds: number[] = [];
    if (currentActivityId) {
      const active = await db
        .select({ daerahId: mandiriKegiatanDaerah.daerahId })
        .from(mandiriKegiatanDaerah)
        .where(
          and(
            eq(mandiriKegiatanDaerah.kegiatanId, currentActivityId),
            eq(mandiriKegiatanDaerah.isActive, 1)
          )
        );
      activeDaerahIds = active.map((a: any) => a.daerahId);
    }

    let villageQuery = db
      .select({
        id: mandiriDesa.id,
        nama: mandiriDesa.nama,
        mandiriDaerahId: mandiriDesa.mandiriDaerahId,
        kota: mandiriDaerah.nama,
      })
      .from(mandiriDesa)
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id));

    if (currentActivityId) {
      if (activeDaerahIds.length > 0) {
        villageQuery = villageQuery.where(inArray(mandiriDesa.mandiriDaerahId, activeDaerahIds)) as any;
      } else {
        villageQuery = villageQuery.where(sql`1=0`) as any;
      }
    }
    const villages = await villageQuery.orderBy(mandiriDesa.nama);
    const cities = Array.from(new Set(villages.map((v: any) => v.kota).filter(Boolean))).sort();

    let groupQuery = db
      .select({
        id: mandiriKelompok.id,
        nama: mandiriKelompok.nama,
        mandiriDesaId: mandiriKelompok.mandiriDesaId,
        desa: mandiriDesa.nama,
        kota: mandiriDaerah.nama,
      })
      .from(mandiriKelompok)
      .leftJoin(mandiriDesa, eq(mandiriKelompok.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id));

    if (currentActivityId) {
      if (activeDaerahIds.length > 0) {
        groupQuery = groupQuery.where(inArray(mandiriDesa.mandiriDaerahId, activeDaerahIds)) as any;
      } else {
        groupQuery = groupQuery.where(sql`1=0`) as any;
      }
    }
    const groups = await groupQuery.orderBy(mandiriKelompok.nama);

    let userFoto = "";
    if (session.generusId) {
      const res = await db
        .select({ foto: generus.foto })
        .from(generus)
        .where(eq(generus.id, session.generusId))
        .limit(1);
      if (res.length > 0) userFoto = res[0].foto || "";
    }

    return NextResponse.json({
      session,
      stats,
      cities,
      villages,
      groups,
      userFoto,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Gagal memuat data dashboard." }, { status: 500 });
  }
}
