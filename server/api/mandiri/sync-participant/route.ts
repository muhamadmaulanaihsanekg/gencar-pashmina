
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiri, mandiriAbsensi, mandiriDesa, idCardBuilderData, mandiriDaerah } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { getNextMandiriNomorUrut, isMandiriJenisKelamin } from "@/lib/mandiriNomorUrut";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "admin_romantic_room", "pengurus_daerah", "tim_pnkb"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      nama, 
      nomorUnik, 
      daerah, 
      desa, 
      role,
      dapukan, 
      foto, 
      jenisKelamin, 
      kegiatanId,
      gradient 
    } = body;

    if (!nama || !nomorUnik || !jenisKelamin) {
      return NextResponse.json({ error: "Nama, Nomor Unik, dan Jenis Kelamin wajib diisi" }, { status: 400 });
    }

    if (!isMandiriJenisKelamin(jenisKelamin)) {
      return NextResponse.json({ error: "Jenis kelamin tidak valid. Gunakan L atau P." }, { status: 400 });
    }

    // 1. Find or Create Generus
    let targetGenerusId = "";
    const existingGenerus = await db.query.generus.findFirst({
      where: eq(generus.nomorUnik, nomorUnik)
    });

    if (existingGenerus) {
      targetGenerusId = existingGenerus.id;
      // Update existing if needed (optional, but good for sync)
      await db.update(generus).set({
        nama,
        jenisKelamin,
        foto: foto || existingGenerus.foto,
        updatedAt: sql`(datetime('now'))`
      }).where(eq(generus.id, targetGenerusId));
    } else {
      targetGenerusId = uuidv4();
      
      // Try to find mandiriDesaId based on daerah name
      let mDesaId = null;
      if (daerah && daerah !== "KOTA / DAERAH") {
        const dMatch = await db
          .select({ id: mandiriDesa.id })
          .from(mandiriDesa)
          .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
          .where(sql`lower(${mandiriDesa.nama}) = ${daerah.toLowerCase()} OR lower(${mandiriDaerah.nama}) = ${daerah.toLowerCase()}`)
          .limit(1);
        if (dMatch.length > 0) mDesaId = dMatch[0].id;
      }

      await db.insert(generus).values({
        id: targetGenerusId,
        nomorUnik,
        nama,
        jenisKelamin,
        kategoriUsia: "Bekerja",
        foto: foto || null,
        mandiriDesaId: mDesaId,
        isGenerus: 0
      });
    }

    // 2. Ensure in Mandiri table for this kegiatanId
    const existingMandiri = await db.query.mandiri.findFirst({
      where: and(
        eq(mandiri.generusId, targetGenerusId),
        eq(mandiri.kegiatanId, kegiatanId)
      )
    });

    if (!existingMandiri) {
      const nextNr = await getNextMandiriNomorUrut(db, jenisKelamin, kegiatanId);

      await db.insert(mandiri).values({
        id: uuidv4(),
        generusId: targetGenerusId,
        kegiatanId: kegiatanId || null,
        nomorUrut: nextNr,
        statusMandiri: "Aktif",
        catatan: `Daftar via ID Card Builder (${role || ""}${dapukan ? " - " + dapukan : ""})`
      });
    }

    // 3. Record Attendance if kegiatanId provided
    if (kegiatanId) {
      const existingAbsensi = await db.query.mandiriAbsensi.findFirst({
        where: and(
          eq(mandiriAbsensi.kegiatanId, kegiatanId),
          eq(mandiriAbsensi.generusId, targetGenerusId)
        )
      });

      if (!existingAbsensi) {
        await db.insert(mandiriAbsensi).values({
          id: uuidv4(),
          kegiatanId,
          generusId: targetGenerusId,
          keterangan: "hadir"
        });
      }
    }
    
    // 4. Save to ID Card Builder Data Record
    await db.insert(idCardBuilderData).values({
      id: uuidv4(),
      nama,
      daerah,
      desa,
      role,
      dapukan,
      foto,
      nomorUnik,
      jenisKelamin,
      kegiatanId,
      gradient: gradient || null,
      createdBy: session.userId,
    });

    return NextResponse.json({ 
      success: true, 
      generusId: targetGenerusId,
      message: kegiatanId ? "Data tersinkron dan kehadiran dicatat" : "Data peserta tersinkron"
    });

  } catch (error: any) {
    console.error("Sync Participant Error:", error);
    const status = Number(error?.status || 500);
    return NextResponse.json({ error: error.message || "Gagal sinkronisasi data" }, { status });
  }
}
