import { NextResponse } from "next/server";
import { getSession, clearSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { mandiriAbsensi, mandiriKegiatan, settings } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

export async function POST() {
  try {
    const session = await getSession();
    if (session && session.generusId) {
      const generusId = session.generusId;
      
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      const kegiatanId = activeSetting[0]?.value || "";
      
      if (kegiatanId) {
        await db.update(mandiriAbsensi)
          .set({ keterangan: "pulang" })
          .where(and(
            eq(mandiriAbsensi.kegiatanId, kegiatanId),
            eq(mandiriAbsensi.generusId, generusId)
          ));
      }
    }
  } catch (error) {
    console.error("Failed to update status on session logout:", error);
  }

  await clearSession();
  return NextResponse.json({ success: true });
}
