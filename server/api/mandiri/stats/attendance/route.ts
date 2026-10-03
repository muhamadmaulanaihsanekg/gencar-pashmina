
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriAbsensi, mandiriKegiatan, formPanitiaDanPengurus, settings } from "@/lib/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    // Allow both session-based and participant-based (via headers) access? 
    // For stats, we usually want at least some auth.
    // The dashboard already checks isAdmin, so this API should too.

    const { searchParams } = new URL(request.url);
    let kegiatanId = searchParams.get("kegiatanId") || "";
    let kegiatanJudul = "";

    if (!kegiatanId) {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      kegiatanId = activeSetting[0]?.value || "";
    }

    if (!kegiatanId) {
      return NextResponse.json({ count: 0 });
    }
    const act = await db.select().from(mandiriKegiatan).where(eq(mandiriKegiatan.id, kegiatanId)).limit(1);
    kegiatanJudul = act[0]?.judul || "Kegiatan Aktif";

    // 2. Count distinct committee members in attendance
    const attendanceCount = await db
      .select({ count: sql<number>`count(distinct ${formPanitiaDanPengurus.id})` })
      .from(mandiriAbsensi)
      .innerJoin(formPanitiaDanPengurus, eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId))
      .where(and(
        eq(mandiriAbsensi.kegiatanId, kegiatanId),
        eq(formPanitiaDanPengurus.kegiatanId, kegiatanId)
      ));

    return NextResponse.json({ 
        count: Number(attendanceCount[0]?.count || 0),
        kegiatanJudul: kegiatanJudul 
    });
  } catch (error) {
    console.error("Attendance stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
