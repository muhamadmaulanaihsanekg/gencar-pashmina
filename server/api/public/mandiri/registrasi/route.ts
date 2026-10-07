
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiri, settings, desa, kelompok, users, mandiriDesa, mandiriDaerah, mandiriKegiatan, formPanitiaDanPengurus } from "@/lib/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getMandiriPersonPerempuanQuotaStatus, getNextMandiriNomorUrut, isMandiriJenisKelamin } from "@/lib/mandiriNomorUrut";

function generateNomorUnik() {
  const prefix = "MND"; // Using MND prefix for public mandiri registration
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${num}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Check Registration Status (Open/Closed)
    const statusSet = await db.select().from(settings).where(eq(settings.key, "mandiri_registration_status"));
    const currentStatus = statusSet[0]?.value;
    const reqStatusPeserta = body.statusPeserta || "Utusan Daerah";

    if (currentStatus === "0") {
      return NextResponse.json({ error: "Mohon maaf, pendaftaran saat ini sudah ditutup" }, { status: 403 });
    }
    
    if (currentStatus === "tutup_utusan" && reqStatusPeserta !== "Person") {
      return NextResponse.json({ error: "Pendaftaran untuk Utusan Daerah saat ini sedang ditutup." }, { status: 403 });
    }

    if (currentStatus === "tutup_person" && reqStatusPeserta === "Person") {
      return NextResponse.json({ error: "Pendaftaran untuk Peserta Person saat ini sedang ditutup." }, { status: 403 });
    }

    // 2. Fetch active activity
    const activeSetting = await db.query.settings.findFirst({
        where: eq(settings.key, "mandiri_active_kegiatan_id")
    });
    const activeKegiatanId = activeSetting?.value;
    
    if (!activeKegiatanId) {
        return NextResponse.json({ error: "Pendaftaran tidak dapat diproses karena tidak ada kegiatan mandiri yang sedang aktif." }, { status: 400 });
    }

    const activeKegRes = await db.select().from(mandiriKegiatan).where(eq(mandiriKegiatan.id, activeKegiatanId)).limit(1);
    const activeKegNama = activeKegRes[0]?.judul || "Kegiatan Mandiri";
    const {
        nama, jenisKelamin, tempatLahir, tanggalLahir,
        alamat, noTelp, pendidikan, pekerjaan, statusNikah,
        hobi, makananMinumanFavorit, suku, foto, anakKe, jumlahSaudara, tinggiBadan,
        jumlahAnak,
        mandiriDesaId, mandiriKelompokId, instagram,
        statusPeserta, dibayarkanSenilai, buktiPembayaran,
        kriteriaPasangan, targetMenikah
    } = body;

    if (!nama || !jenisKelamin || !mandiriDesaId || !tempatLahir || !tanggalLahir || !noTelp || !pendidikan || !pekerjaan || !foto) {
      return NextResponse.json({ error: "Mohon lengkapi semua data wajib." }, { status: 400 });
    }

    if (!isMandiriJenisKelamin(jenisKelamin)) {
      return NextResponse.json({ error: "Jenis kelamin tidak valid. Gunakan L atau P." }, { status: 400 });
    }

    // Minimum Age Validation
    const minAgeLakiSet = await db.select().from(settings).where(eq(settings.key, "mandiri_registration_min_age_laki"));
    const minAgeLaki = Number(minAgeLakiSet[0]?.value || "0");
    
    const minAgePerempuanSet = await db.select().from(settings).where(eq(settings.key, "mandiri_registration_min_age_perempuan"));
    const minAgePerempuan = Number(minAgePerempuanSet[0]?.value || "0");

    let isUnderage = false;
    const birthDate = new Date(tanggalLahir);
    if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (jenisKelamin === "L" && minAgeLaki > 0 && age < minAgeLaki) {
            isUnderage = true;
        }
        
        if (jenisKelamin === "P" && minAgePerempuan > 0 && age < minAgePerempuan) {
            isUnderage = true;
        }
    }

    if (isUnderage && !targetMenikah) {
        return NextResponse.json({ error: "Kolom opsi 'Target Menikah' harus diisi apabila umur pendaftar belum mencukupi batas." }, { status: 400 });
    }

    if (statusPeserta === "Person" && (!dibayarkanSenilai || !buktiPembayaran)) {
      return NextResponse.json({ error: "Mohon lengkapi nominal pembayaran dan bukti pembayaran." }, { status: 400 });
    }

    // 2.1. Quota Check for Daerah
    const quotaSet = await db.select().from(settings).where(eq(settings.key, "mandiri_registration_quota"));
    const quotaValue = Number(quotaSet[0]?.value || "0");

    const desaRecord = await db.select({
      daerahId: mandiriDesa.mandiriDaerahId,
      daerahNama: mandiriDaerah.nama
    })
    .from(mandiriDesa)
    .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
    .where(eq(mandiriDesa.id, Number(mandiriDesaId)))
    .limit(1);

    const catatanPembayaran = statusPeserta === "Person"
      ? "Sudah dibayar oleh peserta Person"
      : `Sudah dibayar oleh ${desaRecord[0]?.daerahNama || "Daerah Terkait"}`;

    if (quotaValue > 0 && desaRecord.length > 0 && desaRecord[0].daerahId) {
      const targetDaerahId = desaRecord[0].daerahId;
      const targetDaerahNama = desaRecord[0].daerahNama || "Daerah Terkait";

      const countResult = await db.select({
        count: sql<number>`count(*)`
      })
      .from(mandiri)
      .innerJoin(generus, eq(mandiri.generusId, generus.id))
      .innerJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(formPanitiaDanPengurus, and(
          eq(generus.id, formPanitiaDanPengurus.generusId),
          eq(formPanitiaDanPengurus.kegiatanId, activeKegiatanId)
      ))
      .where(and(
        eq(mandiri.kegiatanId, activeKegiatanId),
        eq(mandiriDesa.mandiriDaerahId, targetDaerahId),
        eq(generus.jenisKelamin, jenisKelamin),
        sql`${formPanitiaDanPengurus.id} IS NULL`
      ));

      const registeredCount = Number(countResult[0]?.count || 0);
      const genderLimit = quotaValue / 2;

      if (registeredCount >= genderLimit) {
        const genderLabel = jenisKelamin === "L" ? "pria" : "wanita";
        return NextResponse.json({
          status: "quota_full",
          error: `Kuota maksimal peserta ${genderLabel} untuk daerah ${targetDaerahNama} (${genderLimit} orang) sudah penuh.`
        }, { status: 409 });
      }
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
        // Check if already in mandiri list for the active event
        const existingMandiri = await db.query.mandiri.findFirst({
            where: and(
                eq(mandiri.generusId, duplicate.id),
                eq(mandiri.kegiatanId, activeKegiatanId)
            )
        });

        if (existingMandiri) {
            return NextResponse.json({ 
                isAlreadyRegistered: true,
                nomorUnik: duplicate.nomorUnik,
                nomorUrut: existingMandiri.nomorUrut,
                nama: duplicate.nama,
                message: "Peserta sudah terdaftar sebelumnya."
            });
        }

        // --- VALIDATION PASSED: Existing Generus found, Proceed to add to Mandiri ---
        
        // Update existing generus data with the latest info from Mandiri form
        // Also remove from youth category (isGenerus = 0)
        await db.update(generus).set({
            nama, jenisKelamin, tempatLahir, tanggalLahir,
            alamat, noTelp, pendidikan, pekerjaan, statusNikah: statusNikah || null,
            hobi, makananMinumanFavorit, suku, foto,
            anakKe: anakKe ? Number(anakKe) : null,
            jumlahSaudara: jumlahSaudara ? Number(jumlahSaudara) : null,
            jumlahAnak: jumlahAnak !== undefined && jumlahAnak !== "" ? Number(jumlahAnak) : 0,
            tinggiBadan: tinggiBadan ? Number(tinggiBadan) : null,
            mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
            mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
            instagram: instagram || duplicate.instagram, 
            kriteriaPasangan: kriteriaPasangan || duplicate.kriteriaPasangan,
            targetMenikah: targetMenikah || duplicate.targetMenikah,
            isGenerus: 0,
            updatedAt: new Date().toISOString()
        }).where(eq(generus.id, duplicate.id));

        // Hapus akun generus lama (users) agar tidak duplikat role
        await db.delete(users).where(eq(users.generusId, duplicate.id));

        const nextNr = await getNextMandiriNomorUrut(db, jenisKelamin, activeKegiatanId);

        // Add to mandiri activity list
        await db.insert(mandiri).values({
            id: uuidv4(),
            generusId: duplicate.id,
            nomorUrut: nextNr,
            kegiatanId: activeKegiatanId,
            statusMandiri: isUnderage ? "Menunggu" : "Aktif",
            statusPeserta: statusPeserta === "Person" ? "Person" : "Utusan Daerah",
            dibayarkanSenilai: statusPeserta === "Person" ? Number(dibayarkanSenilai) : null,
            buktiPembayaran: statusPeserta === "Person" ? buktiPembayaran : null,
            catatan: catatanPembayaran
        });

        return NextResponse.json({ 
            success: true, 
            generusId: duplicate.id, 
            nomorUnik: duplicate.nomorUnik, 
            nomorUrut: nextNr,
            nama: duplicate.nama,
            jenisKelamin,
        });
    }

    // --- CASE: NEW GENERUS ---

    // Pick a valid kelompok/desa for the new entry to satisfy constraints
    const fkWorkaround = await db.select({ 
        kId: kelompok.id, 
        dId: kelompok.desaId 
    }).from(kelompok).limit(1);

    let defaultDesaId = null;
    let defaultKelompokId = null;

    if (fkWorkaround.length > 0) {
        defaultKelompokId = fkWorkaround[0].kId;
        defaultDesaId = fkWorkaround[0].dId;
    } else {
        const firstDesa = await db.select({ id: desa.id }).from(desa).limit(1);
        defaultDesaId = firstDesa[0]?.id;
    }

    let nomorUnik = generateNomorUnik();
    let uniqueExisting = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) });
    while (uniqueExisting) {
      nomorUnik = generateNomorUnik();
      uniqueExisting = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) });
    }

    const generusId = uuidv4();
    const generusData: any = {
      id: generusId,
      nomorUnik,
      nama,
      jenisKelamin,
      kategoriUsia: "Bekerja", // Default as it's no longer in form and DB constraint lacks 'Mandiri'
      tempatLahir,
      tanggalLahir,
      alamat,
      noTelp,
      pendidikan,
      pekerjaan,
      statusNikah: statusNikah || null,
      hobi,
      makananMinumanFavorit,
      suku,
      anakKe: anakKe ? Number(anakKe) : null,
      jumlahSaudara: jumlahSaudara ? Number(jumlahSaudara) : null,
      jumlahAnak: jumlahAnak !== undefined && jumlahAnak !== "" ? Number(jumlahAnak) : 0,
      tinggiBadan: tinggiBadan ? Number(tinggiBadan) : null,
      foto,
      desaId: null,
      kelompokId: null,
      mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
      mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
      instagram,
      kriteriaPasangan,
      targetMenikah,
      createdBy: "FORM_MANDIRI",
      isGenerus: 0
    };

    await db.insert(generus).values(generusData);

    const nextNr = await getNextMandiriNomorUrut(db, jenisKelamin, activeKegiatanId);

    // Add to mandiri activity list
    await db.insert(mandiri).values({
      id: uuidv4(),
      generusId,
      nomorUrut: nextNr,
      kegiatanId: activeKegiatanId,
      statusMandiri: isUnderage ? "Menunggu" : "Aktif",
      statusPeserta: statusPeserta === "Person" ? "Person" : "Utusan Daerah",
      dibayarkanSenilai: statusPeserta === "Person" ? Number(dibayarkanSenilai) : null,
      buktiPembayaran: statusPeserta === "Person" ? buktiPembayaran : null,
      catatan: catatanPembayaran
    });

    return NextResponse.json({ 
      success: true, 
      generusId, 
      nomorUnik, 
      nomorUrut: nextNr,
      nama,
      jenisKelamin,
    });  } catch (error) {
    console.error("Public Registration error:", error);
    const status = Number((error as any)?.status || 500);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memproses pendaftaran" }, { status });
  }
}
