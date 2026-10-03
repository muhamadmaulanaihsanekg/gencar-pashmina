export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKunjungan, mandiriPemilihan, settings } from "@/lib/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

const ALLOWED_ROLES = ["admin", "admin_romantic_room", "tim_pnkb", "tim_pnkb_gambuh", "pengurus_daerah", "kmm_daerah"];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      pengirimId,
      penerimaId,
      hasilPengirim = "Lanjut",
      hasilPenerima = "Lanjut",
      kegiatanId: reqKegiatanId
    } = body;

    if (!pengirimId || !penerimaId) {
      return NextResponse.json({ error: "Pemilih dan yang dipilih wajib diisi" }, { status: 400 });
    }

    if (pengirimId === penerimaId) {
      return NextResponse.json({ error: "Pemilih dan yang dipilih tidak boleh orang yang sama" }, { status: 400 });
    }

    let kegiatanId = reqKegiatanId || "";
    if (!kegiatanId) {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      kegiatanId = activeSetting[0]?.value || "";
    }

    // 1. MUTUAL CHECK: Check if a selection already exists between these two participants (A -> B or B -> A)
    const existingPemilihan = await db.query.mandiriPemilihan.findFirst({
      where: and(
        eq(mandiriPemilihan.kegiatanId, kegiatanId),
        or(
          and(eq(mandiriPemilihan.pengirimId, pengirimId), eq(mandiriPemilihan.penerimaId, penerimaId)),
          and(eq(mandiriPemilihan.pengirimId, penerimaId), eq(mandiriPemilihan.penerimaId, pengirimId))
        )
      )
    });

    let pemilihanId: string;

    if (existingPemilihan) {
      pemilihanId = existingPemilihan.id;
      await db.update(mandiriPemilihan)
        .set({
          status: "Selesai",
          statusTunggu: "selesai",
          hasilPengirim: existingPemilihan.pengirimId === pengirimId ? hasilPengirim : hasilPenerima,
          hasilPenerima: existingPemilihan.penerimaId === penerimaId ? hasilPenerima : hasilPengirim
        })
        .where(eq(mandiriPemilihan.id, pemilihanId));
    } else {
      pemilihanId = crypto.randomUUID();
      await db.insert(mandiriPemilihan).values({
        id: pemilihanId,
        pengirimId,
        penerimaId,
        kegiatanId,
        status: "Selesai",
        statusTunggu: "selesai",
        hasilPengirim,
        hasilPenerima,
        createdAt: sql`(datetime('now'))`
      });
    }

    // 2. Ensure kunjungan records exist for historical report
    const existingKunjungan = await db.query.mandiriKunjungan.findFirst({
      where: eq(mandiriKunjungan.pemilihanId, pemilihanId)
    });

    if (!existingKunjungan) {
      await db.insert(mandiriKunjungan).values([
        {
          id: crypto.randomUUID(),
          generusId: pengirimId,
          pemilihanId,
          kegiatanId,
          createdAt: sql`(datetime('now'))`
        },
        {
          id: crypto.randomUUID(),
          generusId: penerimaId,
          pemilihanId,
          kegiatanId,
          createdAt: sql`(datetime('now'))`
        }
      ]);
    }

    // 5. MATCH CLEANUP: If both chose 'Lanjut', automatically clean up all other pending queues for A & B
    const finalSelection = await db.query.mandiriPemilihan.findFirst({
      where: eq(mandiriPemilihan.id, pemilihanId)
    });

    if (finalSelection?.hasilPengirim === "Lanjut" && finalSelection?.hasilPenerima === "Lanjut") {
      try {
        const { handleMatchCleanup } = await import("@/lib/matchCleanup");
        await handleMatchCleanup(pemilihanId);
      } catch (cleanupErr) {
        console.error("Failed to run match cleanup for manual input:", cleanupErr);
      }
    }

    // 6. Pusher trigger for taaruf-changed
    try {
      await pusherServer.trigger("taaruf-channel", "taaruf-changed", {
        type: "manual-rr-added",
        pemilihanId,
        pengirimId,
        penerimaId
      });
    } catch (pusherErr) {
      console.error("Pusher manual RR trigger error:", pusherErr);
    }

    return NextResponse.json({ success: true, pemilihanId });
  } catch (error) {
    console.error("POST manual kunjungan error:", error);
    return NextResponse.json({ error: "Gagal menyimpan hasil manual Romantic Room" }, { status: 500 });
  }
}
