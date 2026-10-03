
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, desa, kelompok, users, mandiri, mandiriDesa, mandiriKelompok, settings, formPanitiaDanPengurus, mandiriKegiatan, mandiriAbsensi, mandiriPemilihan, mandiriDaerah } from "@/lib/schema";
import { eq, and, or, like, sql, isNull, isNotNull, desc, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nUnik = searchParams.get("nomorUnik");
    const sToken = searchParams.get("sessionToken");

    let isAuthorizedModifier = false;
    
    // Check server session for admin/staff
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    if (session && ["admin", "admin_romantic_room", "tim_pnkb", "tim_pnkb_gambuh"].includes(session.role)) {
      isAuthorizedModifier = true;
    }

    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const kegiatanId = activeSetting[0]?.value || "";

    let currentParticipantId: string | null = null;
    if (nUnik && sToken && kegiatanId) {
      const authCheck = await db.select({ 
        role: formPanitiaDanPengurus.dapukan,
        generusId: generus.id
      })
      .from(generus)
      .leftJoin(mandiri, and(eq(generus.id, mandiri.generusId), eq(mandiri.kegiatanId, kegiatanId)))
      .leftJoin(formPanitiaDanPengurus, and(eq(generus.id, formPanitiaDanPengurus.generusId), eq(formPanitiaDanPengurus.kegiatanId, kegiatanId)))
      .where(and(eq(generus.nomorUnik, nUnik), eq(mandiri.lastSessionToken, sToken)))
      .limit(1);

      if (authCheck.length > 0) {
        currentParticipantId = authCheck[0].generusId;
        if (authCheck[0].role === "Panitia" || authCheck[0].role === "Pengurus") {
          // Panitia dan Pengurus tetap harus mengikuti status public open/close
          // isAuthorizedModifier = true; 
        }
      }
    }
    
    // Robust fallback to find participant ID by nomorUnik if token query fails
    if (!currentParticipantId && nUnik) {
      const fallbackCheck = await db.select({ id: generus.id })
        .from(generus)
        .where(eq(generus.nomorUnik, nUnik))
        .limit(1);
      if (fallbackCheck.length > 0) {
        currentParticipantId = fallbackCheck[0].id;
      }
    }

    // 1. Check Public Access Status
    const publicStatusSet = await db.select().from(settings).where(eq(settings.key, "mandiri_katalog_public_status"));
    const isPublicOpen = publicStatusSet[0]?.value === "open";

    // If public view is closed, allow access ONLY if they are an authorized modifier OR a registered participant
    if (!isPublicOpen && !isAuthorizedModifier && !currentParticipantId) {
      return NextResponse.json({ error: "Katalog sedang tidak dibuka untuk publik." }, { status: 403 });
    }


    if (!kegiatanId) {
      return NextResponse.json({ data: [], total: 0, page: Number(searchParams.get("page") || "1"), limit: Number(searchParams.get("limit") || "20") });
    }

    const search = (searchParams.get("search") || "").trim();
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const jenisKelamin = searchParams.get("jenisKelamin") || "all";
    const status = searchParams.get("status") || "all";
    const pendidikan = searchParams.get("pendidikan") || "all";
    const mandiriDesaId = searchParams.get("mandiriDesaId") || "all";
    const desaId = searchParams.get("desaId") || "all";
    const kota = searchParams.get("kota") || "all";
    const kelompokId = searchParams.get("kelompokId") || "all";
    const pekerjaan = searchParams.get("pekerjaan") || "all";
    const umur = searchParams.get("umur") || "all";
    const kriteria = searchParams.get("kriteria") || "all";
    const hobi = searchParams.get("hobi") || "all";
    const makanan = searchParams.get("makanan") || "all";
    const suku = searchParams.get("suku") || "all";
    const anakKe = searchParams.get("anakKe") || "";
    const jumlahSaudara = searchParams.get("jumlahSaudara") || "";
    const tinggiMin = searchParams.get("tinggiMin") || "";
    const tinggiMax = searchParams.get("tinggiMax") || "";
    const umurMin = searchParams.get("umurMin") || "";
    const umurMax = searchParams.get("umurMax") || "";
    const onlyChosen = searchParams.get("onlyChosen") === "true";

    // Build conditions
    const conditions: any[] = [];
    
    if (search) {
      if (/^\d+$/.test(search)) {
        conditions.push(eq(mandiri.nomorUrut, Number(search)));
      } else {
        conditions.push(
          or(
            like(generus.nama, `%${search}%`),
            like(generus.nomorUnik, `%${search}%`),
            like(mandiri.nomorUrut, `%${search}%`),
            like(mandiriDaerah.nama, `%${search}%`),
            like(mandiriDesa.nama, `%${search}%`),
            like(desa.nama, `%${search}%`),
            like(kelompok.nama, `%${search}%`),
            like(formPanitiaDanPengurus.dapukan, `%${search}%`),
            like(generus.kriteriaPasangan, `%${search}%`)
          )
        );
      }
    }

    if (jenisKelamin && (jenisKelamin === "L" || jenisKelamin === "P")) {
      conditions.push(eq(generus.jenisKelamin, jenisKelamin as "L" | "P"));
    }

    if (status === "panitia") {
      conditions.push(
        or(
          and(sql`${users.role} IS NOT NULL`, sql`${users.role} != 'generus'`),
          isNotNull(formPanitiaDanPengurus.id)
        )
      );
    } else if (status === "peserta") {
      conditions.push(
        and(
          or(eq(users.role, "generus"), isNull(users.role)),
          isNull(formPanitiaDanPengurus.id)
        )
      );
    }

    if (pendidikan && pendidikan !== "all") {
      if (/^[SD][1-4]$/i.test(pendidikan)) {
        const char = pendidikan[0].toUpperCase();
        const num = pendidikan[1];
        conditions.push(or(
          like(generus.pendidikan, `${char}${num}%`),
          like(generus.pendidikan, `${char}-${num}%`),
          like(generus.pendidikan, `${char} ${num}%`),
          like(generus.pendidikan, `${char}.${num}%`)
        ));
      } else {
        conditions.push(like(generus.pendidikan, `${pendidikan}%`));
      }
    }

    if (mandiriDesaId && mandiriDesaId !== "all") {
      conditions.push(eq(generus.mandiriDesaId, Number(mandiriDesaId)));
    }

    if (kelompokId && kelompokId !== "all") {
      conditions.push(eq(generus.mandiriKelompokId, Number(kelompokId)));
    }

    if (kota && kota !== "all") {
      conditions.push(eq(mandiriDaerah.nama, kota));
    }

    if (pekerjaan && pekerjaan !== "all") {
      conditions.push(like(generus.pekerjaan, `%${pekerjaan}%`));
    }

    if (hobi && hobi !== "all") {
      conditions.push(like(generus.hobi, `%${hobi}%`));
    }

    if (makanan && makanan !== "all") {
      conditions.push(like(generus.makananMinumanFavorit, `%${makanan}%`));
    }

    if (suku && suku !== "all") {
      conditions.push(eq(generus.suku, suku));
    }

    if (anakKe !== "") {
      conditions.push(eq(generus.anakKe, Number(anakKe)));
    }

    if (jumlahSaudara !== "") {
      conditions.push(eq(generus.jumlahSaudara, Number(jumlahSaudara)));
    }

    if (tinggiMin !== "" && !isNaN(Number(tinggiMin))) {
      conditions.push(sql`${generus.tinggiBadan} >= ${Number(tinggiMin)}`);
    }

    if (tinggiMax !== "" && !isNaN(Number(tinggiMax))) {
      conditions.push(sql`${generus.tinggiBadan} <= ${Number(tinggiMax)}`);
    }

    if (kriteria && kriteria !== "all") {
      conditions.push(like(generus.kriteriaPasangan, `%${kriteria}%`));
    }

    if (umur && umur !== "all") {
      // Check if it's a range like "17-20" or ">30"
      if (umur.includes("-")) {
        const [min, max] = umur.split("-").map(Number);
        conditions.push(sql`cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', ${generus.tanggalLahir}) as integer) BETWEEN ${min} AND ${max}`);
      } else if (umur.startsWith(">")) {
        const min = Number(umur.replace(">", ""));
        conditions.push(sql`cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', ${generus.tanggalLahir}) as integer) > ${min}`);
      } else {
        // Exact age
        conditions.push(sql`cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', ${generus.tanggalLahir}) as integer) = ${Number(umur)}`);
      }
    } else {
      if (umurMin !== "" && !isNaN(Number(umurMin))) {
        conditions.push(sql`cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', ${generus.tanggalLahir}) as integer) >= ${Number(umurMin)}`);
      }
      if (umurMax !== "" && !isNaN(Number(umurMax))) {
        conditions.push(sql`cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', ${generus.tanggalLahir}) as integer) <= ${Number(umurMax)}`);
      }
    }

    if (desaId && desaId !== "all") {
      conditions.push(eq(generus.desaId, Number(desaId)));
    }

    // Only show participants registered for the active activity
    conditions.push(eq(mandiri.kegiatanId, kegiatanId));

    if (onlyChosen) {
      if (currentParticipantId) {
        const chosenIdsQuery = await db.select({ id: mandiriPemilihan.penerimaId })
          .from(mandiriPemilihan)
          .where(eq(mandiriPemilihan.pengirimId, currentParticipantId));
        const chosenIds = chosenIdsQuery.map(c => c.id);
        if (chosenIds.length > 0) {
          conditions.push(inArray(generus.id, chosenIds));
        } else {
          conditions.push(eq(generus.id, "none"));
        }
      } else {
        conditions.push(eq(generus.id, "none"));
      }
    }

    // Exclude matched participants (where both results are 'Lanjut')
    conditions.push(sql`${generus.id} NOT IN (
      SELECT pengirim_id FROM mandiri_pemilihan 
      WHERE status = 'Selesai' AND hasil_pengirim = 'Lanjut' AND hasil_penerima = 'Lanjut'
      UNION
      SELECT penerima_id FROM mandiri_pemilihan 
      WHERE status = 'Selesai' AND hasil_pengirim = 'Lanjut' AND hasil_penerima = 'Lanjut'
    )`);

    const finalWhere = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch Data
    const dataQuery = db
      .select({
        id: generus.id,
        nomorUnik: generus.nomorUnik,
        nama: generus.nama,
        jenisKelamin: generus.jenisKelamin,
        kategoriUsia: generus.kategoriUsia,
        statusNikah: generus.statusNikah,
        suku: generus.suku,
        anakKe: generus.anakKe,
        jumlahSaudara: generus.jumlahSaudara,
        tinggiBadan: generus.tinggiBadan,
        foto: generus.foto,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
        mandiriDesaNama: mandiriDesa.nama,
        mandiriDesaKota: mandiriDaerah.nama,
        mandiriKelompokNama: mandiriKelompok.nama,
        createdAt: generus.createdAt,
        tempatLahir: generus.tempatLahir,
        tanggalLahir: generus.tanggalLahir,
        pendidikan: generus.pendidikan,
        pekerjaan: generus.pekerjaan,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        instagram: generus.instagram,
        kriteriaPasangan: generus.kriteriaPasangan,
        alamat: generus.alamat,
        role: users.role,
        nomorUrut: mandiri.nomorUrut,
        panitiaStatus: formPanitiaDanPengurus.dapukan,
        keterangan: mandiriAbsensi.keterangan,
        isHadir: sql<number>`CASE WHEN ${mandiriAbsensi.id} IS NOT NULL THEN 1 ELSE 0 END`.mapWith(Number),
        selectedCount: sql<number>`(
          SELECT count(*) 
          FROM mandiri_pemilihan 
          WHERE mandiri_pemilihan.penerima_id = ${generus.id} 
          AND mandiri_pemilihan.kegiatan_id = ${kegiatanId}
          AND (mandiri_pemilihan.status = 'Menunggu' OR mandiri_pemilihan.status = 'Diterima' OR mandiri_pemilihan.status = 'Selesai')
        )`.mapWith(Number),
        handshakeStatus: currentParticipantId ? sql<string>`(
          SELECT status 
          FROM mandiri_pemilihan 
          WHERE mandiri_pemilihan.kegiatan_id = ${kegiatanId}
          AND mandiri_pemilihan.status != 'Ditolak'
          AND (
            (mandiri_pemilihan.pengirim_id = ${currentParticipantId} AND mandiri_pemilihan.penerima_id = ${generus.id})
            OR
            (mandiri_pemilihan.pengirim_id = ${generus.id} AND mandiri_pemilihan.penerima_id = ${currentParticipantId})
          )
          LIMIT 1
        )` : sql<string>`NULL`
      })
      .from(generus)
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(mandiriAbsensi, and(eq(generus.id, mandiriAbsensi.generusId), eq(mandiriAbsensi.kegiatanId, kegiatanId)))
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .leftJoin(formPanitiaDanPengurus, eq(generus.id, formPanitiaDanPengurus.generusId));

    // Count Query - only join mandiri (required)
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(generus)
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(mandiriAbsensi, and(eq(generus.id, mandiriAbsensi.generusId), eq(mandiriAbsensi.kegiatanId, kegiatanId)));

    // Dynamic joins for count query if filters are present
    if (search || status !== "all") {
        countQuery.leftJoin(users, eq(generus.id, users.generusId));
        countQuery.leftJoin(formPanitiaDanPengurus, eq(generus.id, formPanitiaDanPengurus.generusId));
    }
    if (search || mandiriDesaId !== "all" || kota !== "all") {
        countQuery.leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id));
        countQuery.leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id));
    }
    if (search || desaId !== "all") {
        countQuery.leftJoin(desa, eq(generus.desaId, desa.id));
    }
    if (search) {
        countQuery.leftJoin(kelompok, eq(generus.kelompokId, kelompok.id));
    }

    const [data, countResult] = await Promise.all([
      dataQuery
        .where(finalWhere)
        .orderBy(generus.nama)
        .limit(limit)
        .offset(offset),
      countQuery.where(finalWhere),
    ]);

    return NextResponse.json({
      data,
      total: Number(countResult[0]?.count || 0),
      page,
      limit
    });
  } catch (error: any) {
    console.error("Public Katalog error:", error);
    return NextResponse.json({ error: "Gagal mengambil data katalog publik" }, { status: 500 });
  }
}
