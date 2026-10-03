export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { repairMandiriNomorUrut } from "@/lib/mandiriNomorUrut";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "admin_keuangan", "admin_kegiatan"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    let kegiatanId = typeof body?.kegiatanId === "string" ? body.kegiatanId : "";

    if (!kegiatanId) {
      const activeSetting = await db
        .select()
        .from(settings)
        .where(eq(settings.key, "mandiri_active_kegiatan_id"))
        .limit(1);
      kegiatanId = activeSetting[0]?.value || "";
    }

    if (!kegiatanId) {
      return NextResponse.json({ error: "Kegiatan aktif tidak ditemukan." }, { status: 400 });
    }

    const result = await repairMandiriNomorUrut(db, kegiatanId);

    return NextResponse.json({
      success: true,
      kegiatanId,
      ...result,
    });
  } catch (error) {
    console.error("Fix nomor urut mandiri error:", error);
    const status = Number((error as any)?.status || 500);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Gagal memperbaiki nomor peserta",
    }, { status });
  }
}
