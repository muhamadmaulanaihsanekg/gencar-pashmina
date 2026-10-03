
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { absensi, generus, kegiatan, mandiriKegiatan, mandiriAbsensi } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { pusherServer } from "@/lib/pusher";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kegiatanId, nomorUnik } = body;

    if (!kegiatanId || !nomorUnik) {
      return NextResponse.json({ error: "Kegiatan ID dan Nomor Unik diperlukan" }, { status: 400 });
    }

    // Periksa apakah kegiatan ada di kegiatan umum
    let validKegiatan = false;
    let kegiatanJudul = "";
    let kegiatanExists = await db.query.kegiatan.findFirst({
      where: eq(kegiatan.id, kegiatanId),
    });
    
    if (kegiatanExists) {
      validKegiatan = true;
      kegiatanJudul = kegiatanExists.judul;
    }

    let isMandiri = false;

    // Jika tidak ditemukan di kegiatan umum, periksa di kegiatan mandiri
    if (!validKegiatan) {
      const mandiriKegExists = await db.query.mandiriKegiatan.findFirst({
        where: eq(mandiriKegiatan.id, kegiatanId),
      });
      if (mandiriKegExists) {
        validKegiatan = true;
        isMandiri = true;
        kegiatanJudul = mandiriKegExists.judul;
      }
    }

    if (!validKegiatan) {
      return NextResponse.json({ error: "Kegiatan tidak ditemukan" }, { status: 404 });
    }

    // Cari generus berdasarkan nomor unik
    const resolvedGenerus = await db.query.generus.findFirst({
      where: eq(generus.nomorUnik, nomorUnik),
    });

    if (!resolvedGenerus) {
      return NextResponse.json(
        { error: "Generus dengan Nomor Unik tersebut tidak ditemukan" },
        { status: 404 }
      );
    }

    const resolvedGenerusId = resolvedGenerus.id;

    let savedAttendance: {
      id: string;
      kegiatanId: string;
      kegiatanJudul: string;
      keterangan: string;
      timestamp: string;
    } | null = null;

    // Proses pencatatan sesuai tipe kegiatan
    if (isMandiri) {
      // Cek apakah sudah absen di mandiri
      const existing = await db.query.mandiriAbsensi.findFirst({
        where: and(eq(mandiriAbsensi.kegiatanId, kegiatanId), eq(mandiriAbsensi.generusId, resolvedGenerusId)),
      });

      if (existing) {
        return NextResponse.json({
          error: "Anda sudah tercatat hadir!",
          existing: { ...existing, kegiatanJudul },
          attendance: { ...existing, kegiatanJudul },
          kegiatanJudul,
          generusNama: resolvedGenerus.nama
        }, { status: 409 });
      }

      // Catat kehadiran di mandiri_absensi
      const id = uuidv4();
      const timestamp = new Date().toISOString();
      await db.insert(mandiriAbsensi).values({
        id,
        kegiatanId,
        generusId: resolvedGenerusId,
        keterangan: "hadir",
        timestamp,
      });
      savedAttendance = { id, kegiatanId, kegiatanJudul, keterangan: "hadir", timestamp };
    } else {
      // Cek apakah sudah absen di umum
      const existing = await db.query.absensi.findFirst({
        where: and(eq(absensi.kegiatanId, kegiatanId), eq(absensi.generusId, resolvedGenerusId)),
      });

      if (existing) {
        return NextResponse.json({
          error: "Anda sudah tercatat hadir!",
          existing: { ...existing, kegiatanJudul },
          attendance: { ...existing, kegiatanJudul },
          kegiatanJudul,
          generusNama: resolvedGenerus.nama
        }, { status: 409 });
      }

      // Catat kehadiran di absensi umum
      const id = uuidv4();
      const timestamp = new Date().toISOString();
      await db.insert(absensi).values({
        id,
        kegiatanId,
        generusId: resolvedGenerusId,
        keterangan: "hadir",
        timestamp,
      });
      savedAttendance = { id, kegiatanId, kegiatanJudul, keterangan: "hadir", timestamp };
    }

    try {
      await pusherServer.trigger("taaruf-channel", "absensi-updated", { kegiatanId });
    } catch (pusherErr) {
      console.error("Pusher trigger error in public absensi:", pusherErr);
    }

    return NextResponse.json({
      success: true,
      generusNama: resolvedGenerus.nama,
      kegiatanJudul,
      attendance: savedAttendance
    });
  } catch (error) {
    console.error("Public Absensi POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan absensi" }, { status: 500 });
  }
}
