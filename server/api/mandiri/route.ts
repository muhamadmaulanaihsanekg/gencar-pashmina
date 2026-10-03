export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiri, generus, desa, kelompok, mandiriDesa, mandiriKelompok, users, mandiriKegiatan, mandiriAbsensi, absensi, settings, mandiriDaerah, formPanitiaDanPengurus } from "@/lib/schema";
import { eq, and, or, like, sql, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import {
  getNextMandiriNomorUrut,
  isMandiriJenisKelamin,
  isMandiriNomorUrutSesuaiJenisKelamin,
} from "@/lib/mandiriNomorUrut";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "tim_pnkb", "tim_pnkb_gambuh"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const onlyAttended = searchParams.get("onlyAttended") === "true";

    const conditions = [];

    if (search) {
      if (/^\d+$/.test(search)) {
        conditions.push(eq(mandiri.nomorUrut, Number(search)));
      } else {
        conditions.push(
          or(
            like(generus.nama, `%${search}%`),
            like(generus.nomorUnik, `%${search}%`),
            like(mandiriDesa.nama, `%${search}%`),
            like(mandiriDaerah.nama, `%${search}%`)
          )
        );
      }
    }

    const sort = searchParams.get("sort") || ""; // "asc" or "desc"

    // Gunakan kegiatanId dari query param jika ada, lalu dari settings, lalu fallback ke terbaru
    let kegiatanId = searchParams.get("kegiatanId") || "";

    if (!kegiatanId) {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      kegiatanId = activeSetting[0]?.value || "";
    }

    if (kegiatanId) {
      conditions.push(eq(mandiri.kegiatanId, kegiatanId));
    }

    const baseWhereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const statusPeserta = searchParams.get("statusPeserta");
    if (statusPeserta && statusPeserta !== "all") {
        if (statusPeserta === "Utusan Daerah" || statusPeserta === "Person") {
            conditions.push(eq(mandiri.statusPeserta, statusPeserta));
        } else if (statusPeserta === "pesertaL") {
            conditions.push(sql`${formPanitiaDanPengurus.id} IS NULL AND ${generus.jenisKelamin} = 'L'`);
        } else if (statusPeserta === "pesertaP") {
            conditions.push(sql`${formPanitiaDanPengurus.id} IS NULL AND ${generus.jenisKelamin} = 'P'`);
        } else if (statusPeserta === "panitiaL") {
            conditions.push(sql`${formPanitiaDanPengurus.id} IS NOT NULL AND ${generus.jenisKelamin} = 'L'`);
        } else if (statusPeserta === "panitiaP") {
            conditions.push(sql`${formPanitiaDanPengurus.id} IS NOT NULL AND ${generus.jenisKelamin} = 'P'`);
        } else if (statusPeserta === "pesertaAll") {
            conditions.push(sql`${formPanitiaDanPengurus.id} IS NULL`);
        } else if (statusPeserta === "panitiaAll") {
            conditions.push(sql`${formPanitiaDanPengurus.id} IS NOT NULL`);
        }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine order
    let orderClause: any = desc(mandiri.createdAt);
    if (sort === "asc") {
      orderClause = sql`${mandiri.nomorUrut} ASC`;
    } else if (sort === "desc") {
      orderClause = sql`${mandiri.nomorUrut} DESC`;
    }

    // Optimized Data Query - Based on MANDIRI table
    let dataQuery = db
      .select({
        id: mandiri.id, 
        nomorUrut: mandiri.nomorUrut,
        statusMandiri: mandiri.statusMandiri,
        statusPeserta: mandiri.statusPeserta,
        dibayarkanSenilai: mandiri.dibayarkanSenilai,
        buktiPembayaran: mandiri.buktiPembayaran,
        catatan: mandiri.catatan,
        generusId: mandiri.generusId,
        nama: generus.nama,
        nomorUnik: generus.nomorUnik,
        jenisKelamin: generus.jenisKelamin,
        kategoriUsia: generus.kategoriUsia,
        tanggalLahir: generus.tanggalLahir,
        pekerjaan: generus.pekerjaan,
        tempatLahir: generus.tempatLahir,
        alamat: generus.alamat,
        pendidikan: generus.pendidikan,
        suku: generus.suku,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        instagram: generus.instagram,
        kriteriaPasangan: generus.kriteriaPasangan,
        targetMenikah: generus.targetMenikah,
        desaKota: sql<string>`COALESCE(${mandiriDaerah.nama}, 'Luar JB2')`,
        desaNama: sql<string>`COALESCE(${mandiriDesa.nama}, ${desa.nama}, 'N/A')`,
        kelompokNama: sql<string>`COALESCE(${mandiriKelompok.nama}, ${kelompok.nama}, 'N/A')`,
        mandiriDaerahId: mandiriDesa.mandiriDaerahId,
        mandiriDesaId: generus.mandiriDesaId,
        mandiriKelompokId: generus.mandiriKelompokId,
        noTelp: generus.noTelp,
        foto: generus.foto,
        createdAt: mandiri.createdAt,
        userId: users.id,
        isHadir: sql<number>`CASE WHEN ${mandiriAbsensi.id} IS NOT NULL THEN 1 ELSE 0 END`,
        waktuHadir: mandiriAbsensi.timestamp,
        keterangan: mandiriAbsensi.keterangan,
        isPanitia: sql<boolean>`CASE WHEN ${formPanitiaDanPengurus.id} IS NOT NULL THEN true ELSE false END`,
      })
      .from(mandiri)
      .innerJoin(generus, eq(mandiri.generusId, generus.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id))
      .leftJoin(formPanitiaDanPengurus, and(
          eq(generus.id, formPanitiaDanPengurus.generusId),
          eq(formPanitiaDanPengurus.kegiatanId, kegiatanId)
      ));

    if (onlyAttended) {
      dataQuery = (dataQuery as any).innerJoin(mandiriAbsensi, and(
        eq(generus.id, mandiriAbsensi.generusId),
        eq(mandiriAbsensi.kegiatanId, kegiatanId)
      ));
    } else {
      dataQuery = (dataQuery as any).leftJoin(mandiriAbsensi, and(
        eq(generus.id, mandiriAbsensi.generusId),
        eq(mandiriAbsensi.kegiatanId, kegiatanId)
      ));
    }

    const data = await dataQuery
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(orderClause);

    // Optimized Count Query
    const countQuery = db
      .select({ 
          count: sql<number>`count(*)`,
          utusanDaerah: sql<number>`SUM(CASE WHEN ${mandiri.statusPeserta} = 'Utusan Daerah' OR ${mandiri.statusPeserta} IS NULL THEN 1 ELSE 0 END)`,
          person: sql<number>`SUM(CASE WHEN ${mandiri.statusPeserta} = 'Person' THEN 1 ELSE 0 END)`,
          pesertaAll: sql<number>`SUM(CASE WHEN ${formPanitiaDanPengurus.id} IS NULL THEN 1 ELSE 0 END)`,
          panitiaAll: sql<number>`SUM(CASE WHEN ${formPanitiaDanPengurus.id} IS NOT NULL THEN 1 ELSE 0 END)`,
          pesertaL: sql<number>`SUM(CASE WHEN ${formPanitiaDanPengurus.id} IS NULL AND ${generus.jenisKelamin} = 'L' THEN 1 ELSE 0 END)`,
          pesertaP: sql<number>`SUM(CASE WHEN ${formPanitiaDanPengurus.id} IS NULL AND ${generus.jenisKelamin} = 'P' THEN 1 ELSE 0 END)`,
          panitiaL: sql<number>`SUM(CASE WHEN ${formPanitiaDanPengurus.id} IS NOT NULL AND ${generus.jenisKelamin} = 'L' THEN 1 ELSE 0 END)`,
          panitiaP: sql<number>`SUM(CASE WHEN ${formPanitiaDanPengurus.id} IS NOT NULL AND ${generus.jenisKelamin} = 'P' THEN 1 ELSE 0 END)`
      })
      .from(mandiri)
      .innerJoin(generus, eq(mandiri.generusId, generus.id))
      .leftJoin(formPanitiaDanPengurus, and(
          eq(generus.id, formPanitiaDanPengurus.generusId),
          eq(formPanitiaDanPengurus.kegiatanId, kegiatanId)
      ));

    if (onlyAttended) {
      countQuery.innerJoin(mandiriAbsensi, and(
        eq(generus.id, mandiriAbsensi.generusId),
        eq(mandiriAbsensi.kegiatanId, kegiatanId)
      ));
    }

    if (search && !/^\d+$/.test(search)) {
      countQuery.leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id));
      countQuery.leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id));
    }

    const countResult = await countQuery.where(baseWhereClause);
    
    let totalFiltered = Number(countResult[0]?.count || 0);
    if (statusPeserta === "Utusan Daerah") {
        totalFiltered = Number(countResult[0]?.utusanDaerah || 0);
    } else if (statusPeserta === "Person") {
        totalFiltered = Number(countResult[0]?.person || 0);
    } else if (statusPeserta === "pesertaAll") {
        totalFiltered = Number(countResult[0]?.pesertaAll || 0);
    } else if (statusPeserta === "panitiaAll") {
        totalFiltered = Number(countResult[0]?.panitiaAll || 0);
    } else if (statusPeserta === "pesertaL") {
        totalFiltered = Number(countResult[0]?.pesertaL || 0);
    } else if (statusPeserta === "pesertaP") {
        totalFiltered = Number(countResult[0]?.pesertaP || 0);
    } else if (statusPeserta === "panitiaL") {
        totalFiltered = Number(countResult[0]?.panitiaL || 0);
    } else if (statusPeserta === "panitiaP") {
        totalFiltered = Number(countResult[0]?.panitiaP || 0);
    }

    return NextResponse.json({
      data,
      total: totalFiltered,
      counts: {
          utusanDaerah: Number(countResult[0]?.utusanDaerah || 0),
          person: Number(countResult[0]?.person || 0),
          pesertaAll: Number(countResult[0]?.pesertaAll || 0),
          panitiaAll: Number(countResult[0]?.panitiaAll || 0),
          pesertaL: Number(countResult[0]?.pesertaL || 0),
          pesertaP: Number(countResult[0]?.pesertaP || 0),
          panitiaL: Number(countResult[0]?.panitiaL || 0),
          panitiaP: Number(countResult[0]?.panitiaP || 0),
      },
      page,
      limit,
    }, {
      headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" }
    });
  } catch (error) {
    console.error("Mandiri GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin_romantic_room", "admin", "pengurus_daerah", "kmm_daerah"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    // Check Deadline for non-admins
    if (session.role !== "admin") {
      const settingsTable = (await import("@/lib/schema")).settings;
      const statusSet = await db.select().from(settingsTable).where(eq(settingsTable.key, "mandiri_registration_status"));
      if (statusSet[0]?.value === "0") {
        return NextResponse.json({ error: "Pendaftaran saat ini ditutup manual oleh admin. Penambahan manual dikunci." }, { status: 403 });
      }
    }

    const body = await request.json();
    const { generusId, statusMandiri, catatan } = body;

    if (!generusId) {
      return NextResponse.json({ error: "Generus ID wajib diisi" }, { status: 400 });
    }

    // Check if already in list
    const existing = await db.query.mandiri.findFirst({
      where: eq(mandiri.generusId, generusId),
    });

    if (existing) {
      return NextResponse.json({ error: "Generus ini sudah ada dalam daftar Mandiri" }, { status: 400 });
    }

    // Fetch participant gender to determine numbering range
    const genData = await db.query.generus.findFirst({
        where: eq(generus.id, generusId),
        columns: { jenisKelamin: true, nama: true, nomorUnik: true, desaId: true, kelompokId: true, mandiriDesaId: true, mandiriKelompokId: true }
    });
    
    if (!genData) {
        return NextResponse.json({ error: "Data Generus tidak ditemukan" }, { status: 404 });
    }

    const { jenisKelamin } = genData;
    if (!isMandiriJenisKelamin(jenisKelamin)) {
      return NextResponse.json({ error: "Jenis kelamin peserta tidak valid. Gunakan L atau P." }, { status: 400 });
    }

    // Ambil kegiatan aktif agar peserta yang ditambah manual juga terasosiasi
    const activeKegiatanSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const activeKegiatanId = activeKegiatanSetting[0]?.value || null;

    const nextNr = await getNextMandiriNomorUrut(db, jenisKelamin, activeKegiatanId);

    const id = uuidv4();
    await db.insert(mandiri).values({
      id,
      generusId,
      kegiatanId: activeKegiatanId,
      nomorUrut: nextNr,
      statusMandiri: statusMandiri || "Aktif",
      catatan,
    });

    // Remove from youth category (isGenerus = 0) and cleanup old account
    await db.update(generus).set({ isGenerus: 0 }).where(eq(generus.id, generusId));
    await db.delete(users).where(eq(users.generusId, generusId));

    // AUTO-SYNC USER ACCOUNT to 'peserta' role
    if (genData) {
      const existingUser = await db.query.users.findFirst({ where: eq(users.generusId, generusId) });
      if (!existingUser) {
        // Create account with participant's nomor unik as initial password
        const passwordHash = await (await import("bcryptjs")).hash(genData.nomorUnik, 10);
        await db.insert(users).values({
          id: uuidv4(),
          name: genData.nama,
          email: `${genData.nomorUnik.toLowerCase()}@gencar.com`, // Default email since admin may not have it
          passwordHash,
          role: "peserta",
          generusId: generusId,
          desaId: genData.desaId,
          kelompokId: genData.kelompokId,
          mandiriDesaId: genData.mandiriDesaId,
          mandiriKelompokId: genData.mandiriKelompokId,
        });
      } else if (existingUser.role === "generus" || existingUser.role === "pending") {
          await db.update(users).set({ role: "peserta" }).where(eq(users.id, existingUser.id));
      }
    }

    return NextResponse.json({ success: true, id, nomorUrut: nextNr });
  } catch (error) {
    console.error("Mandiri POST error:", error);
    const status = Number((error as any)?.status || 500);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyimpan data" }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { 
      id: mandiriId, statusMandiri, catatan, resetDevice, statusPeserta, dibayarkanSenilai,
      generusId, nama, foto, noTelp, jenisKelamin, tanggalLahir, pekerjaan, mandiriDesaId, mandiriKelompokId,
      tempatLahir, alamat, pendidikan, suku, hobi, makananMinumanFavorit, instagram, kriteriaPasangan, targetMenikah
    } = body;

    if (!mandiriId) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    if (jenisKelamin !== undefined && !isMandiriJenisKelamin(jenisKelamin)) {
      return NextResponse.json({ error: "Jenis kelamin tidak valid. Gunakan L atau P." }, { status: 400 });
    }

    const entry = await db.query.mandiri.findFirst({ where: eq(mandiri.id, mandiriId) });
    if (!entry) return NextResponse.json({ error: "Data pendaftaran tidak ditemukan" }, { status: 404 });

    const updateData: any = { 
      statusMandiri, 
      catatan, 
      statusPeserta,
      updatedAt: sql`(datetime('now'))` 
    };
    
    if (dibayarkanSenilai !== undefined) {
      updateData.dibayarkanSenilai = dibayarkanSenilai;
    }
    
    if (resetDevice) updateData.deviceId = null;

    if (jenisKelamin !== undefined) {
      const existingGenerus = await db.select({ jenisKelamin: generus.jenisKelamin })
        .from(generus)
        .where(eq(generus.id, entry.generusId || generusId))
        .limit(1);
        
      const isMisaligned = !isMandiriNomorUrutSesuaiJenisKelamin(jenisKelamin, entry.nomorUrut);

      if ((existingGenerus.length > 0 && existingGenerus[0]?.jenisKelamin !== jenisKelamin) || isMisaligned) {
        updateData.nomorUrut = await getNextMandiriNomorUrut(db, jenisKelamin, entry.kegiatanId, mandiriId);
      }
    }

    // Run updates concurrently
    const promises: any[] = [
      db.update(mandiri).set(updateData).where(eq(mandiri.id, mandiriId))
    ];

    if (generusId) {
      const genUpdate: any = {};
      if (nama !== undefined) genUpdate.nama = nama;
      if (foto !== undefined) genUpdate.foto = foto;
      if (noTelp !== undefined) genUpdate.noTelp = noTelp;
      if (jenisKelamin !== undefined) genUpdate.jenisKelamin = jenisKelamin;
      if (tanggalLahir !== undefined) genUpdate.tanggalLahir = tanggalLahir;
      if (pekerjaan !== undefined) genUpdate.pekerjaan = pekerjaan;
      if (tempatLahir !== undefined) genUpdate.tempatLahir = tempatLahir;
      if (alamat !== undefined) genUpdate.alamat = alamat;
      if (pendidikan !== undefined) genUpdate.pendidikan = pendidikan;
      if (suku !== undefined) genUpdate.suku = suku;
      if (hobi !== undefined) genUpdate.hobi = hobi;
      if (makananMinumanFavorit !== undefined) genUpdate.makananMinumanFavorit = makananMinumanFavorit;
      if (instagram !== undefined) genUpdate.instagram = instagram;
      if (kriteriaPasangan !== undefined) genUpdate.kriteriaPasangan = kriteriaPasangan;
      if (targetMenikah !== undefined) genUpdate.targetMenikah = targetMenikah;
      if (mandiriDesaId !== undefined) genUpdate.mandiriDesaId = mandiriDesaId ? Number(mandiriDesaId) : null;
      if (mandiriKelompokId !== undefined) genUpdate.mandiriKelompokId = mandiriKelompokId ? Number(mandiriKelompokId) : null;

      if (Object.keys(genUpdate).length > 0) {
        promises.push(db.update(generus).set(genUpdate).where(eq(generus.id, generusId)));
        
        // Update user profile if needed (for syncing desa/kelompok/nama)
        const userUpdate: any = {};
        if (nama !== undefined) userUpdate.name = nama;
        if (mandiriDesaId !== undefined) userUpdate.mandiriDesaId = mandiriDesaId ? Number(mandiriDesaId) : null;
        if (mandiriKelompokId !== undefined) userUpdate.mandiriKelompokId = mandiriKelompokId ? Number(mandiriKelompokId) : null;
        if (Object.keys(userUpdate).length > 0) {
          promises.push(db.update(users).set(userUpdate).where(eq(users.generusId, generusId)));
        }
        
        // Update formPanitiaDanPengurus if this participant is also a Panitia
        const panitiaUpdate: any = {};
        if (nama !== undefined) panitiaUpdate.nama = nama;
        if (noTelp !== undefined) panitiaUpdate.noTelp = noTelp;
        if (jenisKelamin !== undefined) panitiaUpdate.jenisKelamin = jenisKelamin;
        if (tanggalLahir !== undefined) panitiaUpdate.tanggalLahir = tanggalLahir;
        if (tempatLahir !== undefined) panitiaUpdate.tempatLahir = tempatLahir;
        if (alamat !== undefined) panitiaUpdate.alamat = alamat;
        if (suku !== undefined) panitiaUpdate.suku = suku;
        if (mandiriDesaId !== undefined) panitiaUpdate.mandiriDesaId = mandiriDesaId ? Number(mandiriDesaId) : null;
        if (mandiriKelompokId !== undefined) panitiaUpdate.mandiriKelompokId = mandiriKelompokId ? Number(mandiriKelompokId) : null;
        if (Object.keys(panitiaUpdate).length > 0) {
          promises.push(db.update(formPanitiaDanPengurus).set(panitiaUpdate).where(eq(formPanitiaDanPengurus.generusId, generusId)));
        }
      }
    }

    await Promise.all(promises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mandiri PUT error:", error);
    const status = Number((error as any)?.status || 500);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal update data" }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "admin_romantic_room", "pengurus_daerah", "kmm_daerah"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mandiriId = searchParams.get("id");
    const action = searchParams.get("action");
    const kegiatanId = searchParams.get("kegiatanId");

    if (action === "deleteAll") {
      if (!kegiatanId) {
        return NextResponse.json({ error: "Kegiatan wajib dipilih untuk menghapus semua data" }, { status: 400 });
      }

      let conditions = [eq(mandiri.kegiatanId, kegiatanId)];

      const query = db.select({ generusId: mandiri.generusId }).from(mandiri);
      const entries = await query.where(and(...conditions));
      
      const generusIds = entries.map((e: any) => e.generusId).filter(Boolean);

      if (generusIds.length > 0) {
        for (const genId of generusIds) {
          if (genId) {
            await db.delete(mandiriAbsensi).where(eq(mandiriAbsensi.generusId, genId));
            await db.delete(absensi).where(eq(absensi.generusId, genId));
            await db.delete(users).where(eq(users.generusId, genId));
            await db.delete(formPanitiaDanPengurus).where(eq(formPanitiaDanPengurus.generusId, genId));
            await db.delete(mandiri).where(eq(mandiri.generusId, genId));
            await db.delete(generus).where(eq(generus.id, genId));
          }
        }
      }

      // Hapus seluruh panitia untuk kegiatan yang dipilih
      const panitiaEntries = await db.select({ id: formPanitiaDanPengurus.id, generusId: formPanitiaDanPengurus.generusId })
        .from(formPanitiaDanPengurus)
        .where(eq(formPanitiaDanPengurus.kegiatanId, kegiatanId));

      for (const p of panitiaEntries) {
        await db.delete(formPanitiaDanPengurus).where(eq(formPanitiaDanPengurus.id, p.id));
        if (p.generusId) {
          await db.delete(mandiriAbsensi).where(eq(mandiriAbsensi.generusId, p.generusId));
          await db.delete(absensi).where(eq(absensi.generusId, p.generusId));
          await db.delete(users).where(eq(users.generusId, p.generusId));
          await db.delete(mandiri).where(eq(mandiri.generusId, p.generusId));
          await db.delete(generus).where(eq(generus.id, p.generusId));
        }
      }

      return NextResponse.json({ success: true, message: "Semua data peserta dan panitia untuk kegiatan ini berhasil dihapus" });
    }

    if (!mandiriId) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    const entry = await db.query.mandiri.findFirst({ where: eq(mandiri.id, mandiriId) });
    if (!entry) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

    // Hapus manual semua relasi karena sqlite kadang tidak mengaktifkan PRAGMA foreign_keys
    await Promise.all([
      db.delete(mandiriAbsensi).where(eq(mandiriAbsensi.generusId, entry.generusId)),
      db.delete(absensi).where(eq(absensi.generusId, entry.generusId)),
      db.delete(users).where(eq(users.generusId, entry.generusId)),
      db.delete(mandiri).where(eq(mandiri.generusId, entry.generusId)),
    ]);
    
    // Hapus data utama generus
    await db.delete(generus).where(eq(generus.id, entry.generusId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mandiri DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
