export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, desa, kelompok, users, mandiri, mandiriDesa, mandiriKelompok, formPanitiaDanPengurus, settings, mandiriKegiatan, mandiriAbsensi, mandiriDaerah } from "@/lib/schema";
import { eq, and, or, like, sql, not, isNull, isNotNull, ne, inArray, notInArray, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { encryptPasswordSymmetric, decryptPasswordSymmetric } from "@/lib/crypto";
import { v4 as uuidv4 } from "uuid";

function generateNomorUnik() {
  const prefix = "GNR";
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${num}`;
}

function buildWhereClause(
  session: Awaited<ReturnType<typeof getSession>>, 
  search?: string, 
  ignoreRoleRestriction?: boolean,
  statusNikah?: string,
  desaId?: string,
  kelompokId?: string,
  jenisKelamin?: string,
  status?: string,
  kategoriUsia?: string,
  notInMandiri?: boolean,
  isGenerus?: boolean,
  pendidikan?: string,
  mandiriDesaId?: string,
  mandiriDaerahId?: string,
  mandiriKelompokId?: string,
  isPnkb?: boolean
) {
  const conditions: any[] = [];
  
  if (isPnkb) {
      conditions.push(
          or(
              like(generus.nomorUnik, 'PNKB-%'),
              like(generus.nomorUnik, 'PNB-%')
          )
      );
  } else if (isGenerus) {
    conditions.push(eq(generus.isGenerus, 1));
    conditions.push(
        and(
            not(like(generus.nomorUnik, 'PNKB-%')),
            not(like(generus.nomorUnik, 'PNB-%'))
        )
    );
    conditions.push(
      or(
        isNull(users.role),
        notInArray(users.role, ["tim_pnkb", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "creator"])
      )
    );
  }
  
  if (notInMandiri) {
    conditions.push(isNull(mandiri.id));
  }

  // 1. Role-based restrictions
  if (!ignoreRoleRestriction) {
    if ((session?.role === "desa" || (session?.role === "tim_pnkb" && !session.kelompokId)) && session.desaId) {
      conditions.push(eq(generus.desaId, session.desaId));
    } else if ((session?.role === "kelompok" || (session?.role === "tim_pnkb" && session.kelompokId)) && session.kelompokId) {
      conditions.push(eq(generus.kelompokId, session.kelompokId));
    }
  }

  // 2. Explicit User Filters
  if (desaId && desaId !== "all" && !isNaN(Number(desaId))) {
    conditions.push(eq(generus.desaId, Number(desaId)));
  }
  if (kelompokId && kelompokId !== "all" && !isNaN(Number(kelompokId))) {
    conditions.push(eq(generus.kelompokId, Number(kelompokId)));
  }
  if (mandiriDesaId && mandiriDesaId !== "all" && !isNaN(Number(mandiriDesaId))) {
    conditions.push(eq(generus.mandiriDesaId, Number(mandiriDesaId)));
  }
  if (mandiriDaerahId && mandiriDaerahId !== "all" && !isNaN(Number(mandiriDaerahId))) {
    conditions.push(eq(mandiriDesa.mandiriDaerahId, Number(mandiriDaerahId)));
  }
  if (mandiriKelompokId && mandiriKelompokId !== "all" && !isNaN(Number(mandiriKelompokId))) {
    conditions.push(eq(generus.mandiriKelompokId, Number(mandiriKelompokId)));
  }

  // 3. Other filters
  if (statusNikah && statusNikah !== "all") {
    conditions.push(eq(generus.statusNikah, statusNikah as any));
  }

  if (kategoriUsia && kategoriUsia !== "all") {
    conditions.push(eq(generus.kategoriUsia, kategoriUsia as any));
  }

  if (pendidikan && pendidikan !== "all") {
    // If it's a standard level like S1, D3, handle common variations (S-1, S 1, etc.)
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

  if (search) {
    const trimmedSearch = search.trim();
    const isGnrCode = /^GNR\d+$/i.test(trimmedSearch);
    const isNomorUrut = /^\d+$/.test(trimmedSearch);

    if (isGnrCode) {
      conditions.push(eq(generus.nomorUnik, trimmedSearch.toUpperCase()));
    } else if (isNomorUrut) {
      conditions.push(eq(mandiri.nomorUrut, Number(trimmedSearch)));
    } else {
      conditions.push(
        or(
          like(generus.nama, `%${trimmedSearch}%`),
          like(generus.nomorUnik, `%${trimmedSearch}%`),
          like(mandiri.nomorUrut, `%${trimmedSearch}%`),
          like(mandiriDaerah.nama, `%${trimmedSearch}%`),
          like(mandiriDesa.nama, `%${trimmedSearch}%`),
          like(desa.nama, `%${trimmedSearch}%`),
          like(kelompok.nama, `%${trimmedSearch}%`),
          like(generus.alamat, `%${trimmedSearch}%`),
          like(formPanitiaDanPengurus.dapukan, `%${trimmedSearch}%`)
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
        not(or(isNull(users.role), eq(users.role, "generus"))!),
        isNotNull(formPanitiaDanPengurus.id)
      )
    );
  } else if (status === "peserta") {
    conditions.push(
      and(
        or(isNull(users.role), eq(users.role, "generus")),
        isNull(formPanitiaDanPengurus.id)
      )
    );
  } else if (status === "all" && isGenerus) {
     // If we are in the main Data Generus view (isGenerus=1), we can skip the role check join 
     // for the 'all' view to maximize performance. The isGenerus flag is our source of truth here.
  }

  return (conditions.length > 0 ? and(...conditions) : undefined) as any;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const statusNikah = searchParams.get("statusNikah") || "all";
    const desaId = searchParams.get("desaId") || "";
    const mandiriDaerahId = searchParams.get("mandiriDaerahId") || "";
    const mandiriDesaId = searchParams.get("mandiriDesaId") || "";
    const mandiriKelompokId = searchParams.get("mandiriKelompokId") || "";
    const kelompokId = searchParams.get("kelompokId") || "";
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const all = searchParams.get("all") === "true";
    const mandiriOnly = searchParams.get("mandiriOnly") === "true";
    let notInMandiri = searchParams.get("notInMandiri") === "true";
    const isGenerusPage = searchParams.get("isGenerus") === "true";
    const isPnkb = searchParams.get("isPnkb") === "true";
    let filterIsGenerus = false;

    let kegiatanId = searchParams.get("kegiatanId") || "";
    if (!kegiatanId) {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      kegiatanId = activeSetting[0]?.value || "";
    }

    if ((!all && !mandiriOnly) || isGenerusPage) {
      filterIsGenerus = true;
    }

    const jenisKelamin = searchParams.get("jenisKelamin") || "all";
    const status = searchParams.get("status") || "all";
    const kategoriUsia = searchParams.get("kategoriUsia") || "all";
    const pendidikan = searchParams.get("pendidikan") || "all";
    const sortBy = searchParams.get("sortBy") || "nama";
    const order = searchParams.get("order") || "asc";
    const offset = (page - 1) * limit;

    const finalWhere = buildWhereClause(
      session, search, all, statusNikah, desaId, kelompokId, 
      jenisKelamin, status, kategoriUsia, notInMandiri, filterIsGenerus,
      pendidikan, mandiriDesaId, mandiriDaerahId, mandiriKelompokId, isPnkb
    );

    let whereClause = finalWhere;
    if (mandiriOnly) {
      const matchExclude = sql`${generus.id} NOT IN (
        SELECT pengirim_id FROM mandiri_pemilihan 
        WHERE status = 'Selesai' AND hasil_pengirim = 'Lanjut' AND hasil_penerima = 'Lanjut'
        UNION
        SELECT penerima_id FROM mandiri_pemilihan 
        WHERE status = 'Selesai' AND hasil_pengirim = 'Lanjut' AND hasil_penerima = 'Lanjut'
      )`;
      whereClause = whereClause ? and(whereClause, matchExclude) : matchExclude;
    }

    const isExport = all === true;
    const canSeePrivateData = ["admin", "kmm_daerah", "admin_romantic_room", "pengurus_daerah", "tim_pnkb", "admin_pdkt"].includes(session.role);

    // Common select object to avoid duplication and missing fields
    const commonSelect = {
        id: generus.id,
        nomorUnik: generus.nomorUnik,
        nama: generus.nama,
        email: canSeePrivateData ? users.email : sql`NULL`,
        passwordPlain: session.role === "admin" ? users.passwordPlain : sql`NULL`,
        role: users.role,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
        foto: generus.foto,
        instagram: generus.instagram,
        tanggalLahir: generus.tanggalLahir,
        tempatLahir: generus.tempatLahir,
        kategoriUsia: generus.kategoriUsia,
        kategori: generus.kategori,
        jenisKelamin: generus.jenisKelamin,
        nomorUrut: mandiri.nomorUrut,
        mandiriDesaNama: mandiriDesa.nama,
        mandiriDesaKota: mandiriDaerah.nama,
        mandiriKelompokNama: mandiriKelompok.nama,
        // Added missing fields for Katalog view
        noTelp: canSeePrivateData ? generus.noTelp : sql`NULL`,
        namaOrtu: canSeePrivateData ? generus.namaOrtu : sql`NULL`,
        alamat: generus.alamat,
        pendidikan: generus.pendidikan,
        pekerjaan: generus.pekerjaan,
        statusNikah: generus.statusNikah,
        suku: generus.suku,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        kriteriaPasangan: generus.kriteriaPasangan,
        createdAt: generus.createdAt,
        panitiaStatus: formPanitiaDanPengurus.dapukan,
        keterangan: mandiriAbsensi.keterangan,
        totalMemanggil: sql<number>`(SELECT COUNT(*) FROM mandiri_pemilihan WHERE mandiri_pemilihan.pengirim_id = ${generus.id} AND mandiri_pemilihan.kegiatan_id = ${kegiatanId})`,
        totalDipanggil: sql<number>`(SELECT COUNT(*) FROM mandiri_pemilihan WHERE mandiri_pemilihan.penerima_id = ${generus.id} AND mandiri_pemilihan.kegiatan_id = ${kegiatanId})`,
    };

    // Sorting logic
    const orderByClause = [];
    if (sortBy === "nomorUrut") {
      orderByClause.push(order === "desc" ? sql`${mandiri.nomorUrut} DESC` : sql`${mandiri.nomorUrut} ASC`);
    } else {
      orderByClause.push(order === "desc" ? sql`${generus.nama} DESC` : sql`${generus.nama} ASC`);
    }

    if (isExport) {
      let query = db
        .select(commonSelect)
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .leftJoin(desa, eq(generus.desaId, desa.id))
        .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
        .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
        .leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id))
        .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
        .leftJoin(formPanitiaDanPengurus, eq(generus.id, formPanitiaDanPengurus.generusId))
        .leftJoin(mandiriAbsensi, and(eq(generus.id, mandiriAbsensi.generusId), eq(mandiriAbsensi.kegiatanId, kegiatanId)));

      if (mandiriOnly) {
        query = (query as any)
          .innerJoin(mandiri, and(eq(generus.id, mandiri.generusId), eq(mandiri.kegiatanId, kegiatanId)));
      } else {
        query = (query as any).leftJoin(mandiri, eq(generus.id, mandiri.generusId));
      }

      let data = await query.where(finalWhere).orderBy(...orderByClause);
      
      // DEKRIPSI OTOMATIS: Kembalikan wujud password asli khusus ke layar Admin
      if (session.role === "admin") {
         data = data.map(item => ({
            ...item,
            passwordPlain: decryptPasswordSymmetric(item.passwordPlain as string)
         })) as any;
      }

      return NextResponse.json(
        { data, total: data.length, page: 1, limit: data.length },
        { headers: { "Cache-Control": "private, max-age=60" } }
      );
    }

    let dataQuery = db
      .select(commonSelect)
      .from(generus)
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .leftJoin(formPanitiaDanPengurus, eq(generus.id, formPanitiaDanPengurus.generusId))
      .leftJoin(mandiriAbsensi, and(eq(generus.id, mandiriAbsensi.generusId), eq(mandiriAbsensi.kegiatanId, kegiatanId)));

    if (mandiriOnly) {
      dataQuery = (dataQuery as any)
        .innerJoin(mandiri, and(eq(generus.id, mandiri.generusId), eq(mandiri.kegiatanId, kegiatanId)));
    } else {
      dataQuery = (dataQuery as any).leftJoin(mandiri, eq(generus.id, mandiri.generusId));
    }

    // Optimized Count Query: Avoid unnecessary joins for simple counts
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(generus);

    // Only join users if status filtering is happening, it's not simply 'all', or filtering by isGenerus
    if (status !== "all" || search || filterIsGenerus) {
      countQuery.leftJoin(users, eq(generus.id, users.generusId));
    }

    if (search) {
      countQuery.leftJoin(desa, eq(generus.desaId, desa.id));
      countQuery.leftJoin(kelompok, eq(generus.kelompokId, kelompok.id));
      countQuery.leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id));
      countQuery.leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id));
      countQuery.leftJoin(mandiri, eq(generus.id, mandiri.generusId));
    }

    if (search || mandiriOnly || status !== "all") {
      countQuery.leftJoin(formPanitiaDanPengurus, eq(generus.id, formPanitiaDanPengurus.generusId));
    }

    if (mandiriOnly) {
      countQuery
        .innerJoin(mandiri, and(eq(generus.id, mandiri.generusId), eq(mandiri.kegiatanId, kegiatanId)));
    }

    let [data, countResult] = await Promise.all([
      dataQuery
        .where(whereClause)
        .orderBy(...orderByClause)
        .limit(limit)
        .offset(offset),
      countQuery.where(whereClause),
    ]);
    
    // DEKRIPSI OTOMATIS: Kembalikan wujud password asli khusus ke layar Admin (Dashboard)
    if (session.role === "admin") {
      data = data.map(item => ({
         ...item,
         passwordPlain: decryptPasswordSymmetric(item.passwordPlain as string)
      })) as any;
    }

    return NextResponse.json(
      { data, total: Number(countResult[0]?.count || 0), page, limit },
      { headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error: any) {
    console.error("Generus GET error details:", error);
    return NextResponse.json({ error: "Gagal mengambil data dari server" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { 
      nama, tempatLahir, tanggalLahir, jenisKelamin, kategoriUsia, kategori, alamat, noTelp, noTelpOrtu, namaOrtu,
      pendidikan, pekerjaan, statusNikah, desaId, kelompokId, 
      mandiriDesaId, mandiriKelompokId,
      hobi, makananMinumanFavorit, suku, foto 
    } = body;

    if (!nama || !jenisKelamin || !kategoriUsia || (!desaId && !mandiriDesaId)) {
      return NextResponse.json({ error: "Nama dan Wilayah wajib diisi" }, { status: 400 });
    }

    // Duplicate Check
    const duplicateConditions = [];
    if (nama && tanggalLahir) {
      duplicateConditions.push(and(eq(generus.nama, nama), eq(generus.tanggalLahir, tanggalLahir)));
    }
    if (noTelp) {
      duplicateConditions.push(eq(generus.noTelp, noTelp));
    }

    const duplicate = duplicateConditions.length > 0 
      ? await db.query.generus.findFirst({ where: or(...duplicateConditions) })
      : null;

    if (duplicate) {
        return NextResponse.json({ 
            error: `Data dengan Nama "${nama}" atau Nomor HP "${noTelp}" sudah terdaftar sebelumnya.` 
        }, { status: 400 });
    }

    // Access control
    if ((session.role === "kelompok") && session.kelompokId && session.kelompokId !== Number(kelompokId)) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }
    if ((session.role === "desa") && session.desaId && !session.kelompokId && session.desaId !== Number(desaId)) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }

    let nomorUnik = generateNomorUnik();
    // Ensure unique
    let existing = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) });
    while (existing) {
      nomorUnik = generateNomorUnik();
      existing = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) });
    }

    const id = uuidv4();
    await db.insert(generus).values({
      id,
      nomorUnik,
      nama,
      tempatLahir,
      tanggalLahir,
      jenisKelamin,
      kategoriUsia,
      kategori: kategori || "Generus",
      alamat,
      noTelp,
      noTelpOrtu,
      namaOrtu,
      pendidikan,
      pekerjaan,
      statusNikah: statusNikah || "Belum Menikah",
      desaId: desaId ? Number(desaId) : null,
      kelompokId: kelompokId ? Number(kelompokId) : null,
      mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
      mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
      hobi,
      makananMinumanFavorit,
      suku,
      foto,
      createdBy: session.userId,
      isGenerus: 1,
    });

    // AUTO-CREATE USER ACCOUNT for Generus role (in users)
    const { email: customEmail, password: customPassword } = body;
    let finalEmail = customEmail ? customEmail.toLowerCase() : `${nomorUnik.toLowerCase()}@gencar.com`;
    const finalPassword = customPassword || nomorUnik;
    
    // Check email uniqueness in users
    const existingEmail = await db.query.users.findFirst({ where: eq(users.email, finalEmail) });
    if (existingEmail) {
        finalEmail = `${uuidv4().substring(0, 4)}_${finalEmail}`;
    }

    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(finalPassword, 10);

    await db.insert(users).values({
        id: uuidv4(),
        name: nama,
        email: finalEmail,
        passwordHash, 
        passwordPlain: encryptPasswordSymmetric(finalPassword),
        role: "generus",
        generusId: id,
        desaId: desaId ? Number(desaId) : null,
        kelompokId: kelompokId ? Number(kelompokId) : null,
    });

    return NextResponse.json({ success: true, id, nomorUnik });
  } catch (error) {
    console.error("Generus POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}
