import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  mandiri, 
  mandiriAbsensi, 
  generus, 
  settings, 
  mandiriPemilihan, 
  mandiriKunjungan
} from "@/lib/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { pusherServer } from "@/lib/pusher";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nomorUnik, alasanPulang } = body;

    if (!nomorUnik) {
      return NextResponse.json({ error: "Nomor unik diperlukan" }, { status: 400 });
    }

    if (!alasanPulang || !alasanPulang.trim()) {
      return NextResponse.json({ error: "Alasan pulang wajib diisi" }, { status: 400 });
    }

    // 1. Get the active activity from settings
    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const kegiatanId = activeSetting[0]?.value || "";
    if (!kegiatanId) {
      return NextResponse.json({ error: "Tidak ada kegiatan aktif yang terkonfigurasi" }, { status: 400 });
    }

    // 2. Find the generus by nomorUnik
    const u = await db.select({ id: generus.id })
      .from(generus)
      .where(eq(generus.nomorUnik, nomorUnik))
      .limit(1);

    if (u.length === 0) {
      return NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 });
    }
    const generusId = u[0].id;

    // 3. Check if there is an attendance record
    const attendance = await db.select()
      .from(mandiriAbsensi)
      .where(and(
        eq(mandiriAbsensi.kegiatanId, kegiatanId),
        eq(mandiriAbsensi.generusId, generusId)
      ))
      .limit(1);

    if (attendance.length === 0) {
      return NextResponse.json({ error: "Absensi tidak ditemukan" }, { status: 404 });
    }

    // 4. Update the mandiri_absensi keterangan to "pulang", with time and reason
    const now = new Date().toISOString();
    await db.update(mandiriAbsensi)
      .set({ 
        keterangan: "pulang",
        alasanPulang: alasanPulang.trim(),
        waktuPulang: now,
        timestamp: now // Update timestamp too for check-out time order
      })
      .where(and(
        eq(mandiriAbsensi.kegiatanId, kegiatanId),
        eq(mandiriAbsensi.generusId, generusId)
      ));

    // 5. REMOVE FROM QUEUE (Daftar Antrean)
    // Find all 'Menunggu' elections where this participant is sender or receiver
    const activeQueues = await db.select()
      .from(mandiriPemilihan)
      .where(and(
        eq(mandiriPemilihan.status, "Menunggu"),
        or(
          eq(mandiriPemilihan.pengirimId, generusId),
          eq(mandiriPemilihan.penerimaId, generusId)
        )
      ));

    for (const q of activeQueues) {
      // Delete associated kunjungan records
      await db.delete(mandiriKunjungan)
        .where(eq(mandiriKunjungan.pemilihanId, q.id));

      // Delete the election itself
      await db.delete(mandiriPemilihan)
        .where(eq(mandiriPemilihan.id, q.id));

      // Broadcast Pusher update
      try {
        await pusherServer.trigger("taaruf-channel", "taaruf-changed", {
          type: "delete",
          pengirimId: q.pengirimId,
          penerimaId: q.penerimaId,
        });
      } catch (pusherErr) {
        console.error("Pusher queue delete trigger error:", pusherErr);
      }
    }

    // 6. CANCEL ACTIVE CALLS
    await db.update(mandiriPemilihan)
      .set({ status: "Selesai", statusTunggu: "batal" })
      .where(and(
        eq(mandiriPemilihan.status, "Menunggu"),
        or(
          eq(mandiriPemilihan.pengirimId, generusId),
          eq(mandiriPemilihan.penerimaId, generusId)
        )
      ));

    // 7. Clear the session token in mandiri table to invalidate their device session
    await db.update(mandiri)
      .set({ lastSessionToken: null })
      .where(eq(mandiri.generusId, generusId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pulang API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
