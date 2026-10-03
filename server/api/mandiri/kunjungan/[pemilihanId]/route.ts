
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKunjungan, mandiriPemilihan } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const ALLOWED_ROLES = ["admin", "admin_romantic_room", "tim_pnkb_gambuh"];

// PATCH — edit hasil OR return to queue
export async function PATCH(
  request: NextRequest,
  { params }: { params: { pemilihanId: string } }
) {
  try {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "return_to_queue") {
      await db.update(mandiriPemilihan)
        .set({
          status: "Menunggu",
          statusTunggu: "antrean",
          hasilPengirim: null,
          hasilPenerima: null,
          assignedCallerId: null,
          assignedCaller2Id: null,
          assignedGuardId: null,
        })
        .where(eq(mandiriPemilihan.id, params.pemilihanId));

      await db.delete(mandiriKunjungan)
        .where(eq(mandiriKunjungan.pemilihanId, params.pemilihanId));

      return NextResponse.json({ success: true });
    }

    const { hasilPengirim, hasilPenerima, roomId, assignedCallerId, assignedCaller2Id, assignedGuardId, statusWaPengirim, statusWaPenerima } = body;

    const valid = ["Lanjut", "Ragu-ragu", "Tidak Lanjut", "Menunggu"];
    if (hasilPengirim && !valid.includes(hasilPengirim)) {
      return NextResponse.json({ error: "Nilai hasil pemilih tidak valid" }, { status: 400 });
    }
    if (hasilPenerima && !valid.includes(hasilPenerima)) {
      return NextResponse.json({ error: "Nilai hasil terpilih tidak valid" }, { status: 400 });
    }

    const pemilihanUpdate: any = {};
    if (hasilPengirim !== undefined) pemilihanUpdate.hasilPengirim = hasilPengirim === "Menunggu" ? null : hasilPengirim;
    if (hasilPenerima !== undefined) pemilihanUpdate.hasilPenerima = hasilPenerima === "Menunggu" ? null : hasilPenerima;
    if (assignedCallerId !== undefined) pemilihanUpdate.assignedCallerId = assignedCallerId || null;
    if (assignedCaller2Id !== undefined) pemilihanUpdate.assignedCaller2Id = assignedCaller2Id || null;
    if (assignedGuardId !== undefined) pemilihanUpdate.assignedGuardId = assignedGuardId || null;
    if (statusWaPengirim !== undefined) pemilihanUpdate.statusWaPengirim = statusWaPengirim || null;
    if (statusWaPenerima !== undefined) pemilihanUpdate.statusWaPenerima = statusWaPenerima || null;

    if (Object.keys(pemilihanUpdate).length > 0) {
      await db.update(mandiriPemilihan)
        .set(pemilihanUpdate)
        .where(eq(mandiriPemilihan.id, params.pemilihanId));
    }

    // Clean up matched participants if both chose 'Lanjut'
    if (hasilPengirim === "Lanjut" && hasilPenerima === "Lanjut") {
      try {
        const { handleMatchCleanup } = await import("@/lib/matchCleanup");
        await handleMatchCleanup(params.pemilihanId);
      } catch (cleanupErr) {
        console.error("Failed to run match cleanup in kunjungan:", cleanupErr);
      }
    }

    if (roomId) {
      await db.update(mandiriKunjungan)
        .set({ roomId })
        .where(eq(mandiriKunjungan.pemilihanId, params.pemilihanId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH kunjungan error:", error);
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
  }
}

// DELETE — hapus permanen: kunjungan + pemilihan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { pemilihanId: string } }
) {
  try {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hapus semua kunjungan terkait pemilihan ini
    await db.delete(mandiriKunjungan)
      .where(eq(mandiriKunjungan.pemilihanId, params.pemilihanId));

    // Hapus pemilihan itu sendiri
    await db.delete(mandiriPemilihan)
      .where(eq(mandiriPemilihan.id, params.pemilihanId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE kunjungan error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
