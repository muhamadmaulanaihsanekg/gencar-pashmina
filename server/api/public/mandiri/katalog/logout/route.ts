import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiri, mandiriAbsensi, generus, settings } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nomorUnik } = body;

    if (!nomorUnik) {
      return NextResponse.json({ error: "Nomor unik diperlukan" }, { status: 400 });
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

    // 3. Clear session token in mandiri table
    await db.update(mandiri)
      .set({ lastSessionToken: null })
      .where(eq(mandiri.generusId, generusId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
