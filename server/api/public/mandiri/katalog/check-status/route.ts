
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriAbsensi, mandiriKegiatan, generus, mandiri, mandiriDesa, formPanitiaDanPengurus, settings, mandiriDaerah } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nomorUnik = searchParams.get("nomorUnik");
    const nomorPeserta = searchParams.get("nomorPeserta");
    const sessionToken = searchParams.get("sessionToken");
    const deviceId = searchParams.get("deviceId");

    if (!nomorUnik && !nomorPeserta) {
      return NextResponse.json({ error: "Nomor identitas diperlukan" }, { status: 400 });
    }

    // 1. Get the active kegiatan from settings
    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    let kegiatanId = activeSetting[0]?.value || "";
    let activeKegiatan = null;

    if (kegiatanId) {
      const result = await db.select().from(mandiriKegiatan).where(eq(mandiriKegiatan.id, kegiatanId)).limit(1);
      if (result.length > 0) {
        activeKegiatan = result[0];
      }
    }

    if (!activeKegiatan) {
      return NextResponse.json({ status: "no_activity" });
    }

    const latestActivity = [activeKegiatan];

    // 2. Find the generus by nomorPeserta OR nomorUnik
    let generusId = null;

    if (nomorPeserta) {
        // Search in mandiri table for the latest sequence number
        const m = await db.select({ generusId: mandiri.generusId })
            .from(mandiri)
            .where(eq(mandiri.nomorUrut, Number(nomorPeserta)))
            .orderBy(desc(mandiri.createdAt))
            .limit(1);
        if (m.length > 0) generusId = m[0].generusId;
    } else if (nomorUnik) {
        const u = await db.select({ id: generus.id })
            .from(generus)
            .where(eq(generus.nomorUnik, nomorUnik))
            .limit(1);
        if (u.length > 0) generusId = u[0].id;
    }

    if (!generusId) {
      return NextResponse.json({ status: "not_found" });
    }

    // Find the user's name and last session token
    const user = await db.select({ 
        id: generus.id,
        nama: generus.nama,
        nomorUrut: mandiri.nomorUrut,
        nomorUnik: generus.nomorUnik,
        lastSessionToken: mandiri.lastSessionToken,
        deviceId: mandiri.deviceId,
        mandiriDesaNama: mandiriDesa.nama,
        mandiriDesaKota: mandiriDaerah.nama,
        jenisKelamin: generus.jenisKelamin,
        role: formPanitiaDanPengurus.dapukan,
        noTelp: generus.noTelp
    })
    .from(generus)
    .leftJoin(mandiri, and(eq(generus.id, mandiri.generusId), eq(mandiri.kegiatanId, kegiatanId)))
    .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
    .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
    .leftJoin(formPanitiaDanPengurus, eq(generus.id, formPanitiaDanPengurus.generusId))
    .where(eq(generus.id, generusId))
    .limit(1);

    if (user.length === 0 || !user[0].nomorUrut) {
      return NextResponse.json({ status: "not_found" });
    }

    // Verify session token if provided (passive check for existing sessions)
    // This is what prevents multiple simultaneous sessions
    const isAdminRole = user[0]?.role === "Admin Romantic Room" || user[0]?.role === "admin_romantic_room";
    
    if (!isAdminRole && sessionToken && user[0]?.lastSessionToken && sessionToken !== user[0].lastSessionToken) {
        return NextResponse.json({ status: "multi_login" });
    }

    // Generate new token if logging in from scratch
    let finalSessionToken = sessionToken || user[0]?.lastSessionToken;
    if (nomorPeserta || !sessionToken) {
      finalSessionToken = isAdminRole && user[0]?.lastSessionToken ? user[0].lastSessionToken : uuidv4();
      await db.update(mandiri)
          .set({ 
            deviceId: deviceId || user[0]?.deviceId, 
            lastSessionToken: finalSessionToken 
          })
          .where(and(eq(mandiri.generusId, generusId), eq(mandiri.kegiatanId, kegiatanId)));
    }

    // 3. Check if attended the latest activity
    const attendance = await db.select()
      .from(mandiriAbsensi)
      .where(and(
        eq(mandiriAbsensi.kegiatanId, kegiatanId),
        eq(mandiriAbsensi.generusId, generusId)
      ))
      .limit(1);

    const commonResponse = {
      id: user[0]?.id,
      kegiatanId,
      kegiatanJudul: latestActivity[0].judul,
      nama: user[0]?.nama || "Peserta",
      nomorUrut: user[0]?.nomorUrut || "-",
      nomorUnik: user[0]?.nomorUnik || nomorUnik,
      mandiriDesaNama: user[0]?.mandiriDesaNama,
      mandiriDesaKota: user[0]?.mandiriDesaKota,
      jenisKelamin: user[0]?.jenisKelamin,
      role: user[0]?.role || "Peserta",
      sessionToken: finalSessionToken,
      noTelp: user[0]?.noTelp
    };

    if (attendance.length > 0) {
      let attendanceTimestamp = attendance[0].timestamp;
      let attendanceKeterangan = attendance[0].keterangan;

      // If currently "pulang" (went home/logged out), reset to "hadir" since they are entering/logging in again
      if (attendance[0].keterangan === "pulang") {
        attendanceTimestamp = new Date().toISOString();
        attendanceKeterangan = "hadir";
        await db.update(mandiriAbsensi)
          .set({ keterangan: attendanceKeterangan, timestamp: attendanceTimestamp })
          .where(and(
            eq(mandiriAbsensi.kegiatanId, kegiatanId),
            eq(mandiriAbsensi.generusId, generusId)
          ));
      }

      return NextResponse.json({ 
        status: "attended", 
        ...commonResponse,
        attendance: {
          id: attendance[0].id,
          kegiatanId,
          kegiatanJudul: latestActivity[0].judul,
          keterangan: attendanceKeterangan,
          timestamp: attendanceTimestamp
        },
        attendanceKeterangan,
        attendanceTimestamp
      });
    }

    return NextResponse.json({ 
      status: "waiting", 
      ...commonResponse,
      attendance: null
    });
  } catch (error) {
    console.error("Check status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
