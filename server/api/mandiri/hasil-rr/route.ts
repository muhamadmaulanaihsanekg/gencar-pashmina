import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriPemilihan, generus, mandiri, mandiriKunjungan, settings } from "@/lib/schema";
import { eq, ne, and, or, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { pusherServer } from "@/lib/pusher";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const generusId = searchParams.get("generusId");

        if (!generusId) {
            return NextResponse.json({ error: "Missing generusId" }, { status: 400 });
        }

        const gPengirim = alias(generus, "g1");
        const gPenerima = alias(generus, "g2");
        const mPenerima = alias(mandiri, "m2");
        const mPengirim = alias(mandiri, "m1");

        const records = await db.select({
            id: mandiriPemilihan.id,
            status: mandiriPemilihan.status,
            statusTunggu: mandiriPemilihan.statusTunggu,
            pengirimId: mandiriPemilihan.pengirimId,
            penerimaId: mandiriPemilihan.penerimaId,
            hasilPengirim: mandiriPemilihan.hasilPengirim,
            hasilPenerima: mandiriPemilihan.hasilPenerima,
            pengirimNama: gPengirim.nama,
            penerimaNama: gPenerima.nama,
            pengirimNoUrut: mPengirim.nomorUrut,
            penerimaNoUrut: mPenerima.nomorUrut,
            createdAt: mandiriPemilihan.createdAt
        })
        .from(mandiriPemilihan)
        .innerJoin(gPengirim, eq(mandiriPemilihan.pengirimId, gPengirim.id))
        .innerJoin(gPenerima, eq(mandiriPemilihan.penerimaId, gPenerima.id))
        .leftJoin(mPengirim, eq(gPengirim.id, mPengirim.generusId))
        .leftJoin(mPenerima, eq(gPenerima.id, mPenerima.generusId))
        .where(
            and(
                ne(mandiriPemilihan.status, "Ditolak"),
                or(
                    eq(mandiriPemilihan.pengirimId, generusId),
                    eq(mandiriPemilihan.penerimaId, generusId),
                    eq(mandiriPemilihan.assignedGuardId, generusId),
                    eq(mandiriPemilihan.assignedCallerId, generusId),
                    eq(mandiriPemilihan.assignedCaller2Id, generusId)
                )
            )
        )
        .orderBy(desc(mandiriPemilihan.createdAt));

        return NextResponse.json(records);
    } catch (e) {
        console.error("GET hasil-rr error:", e);
        return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, targetId, generusId, hasil, kegiatanId: reqKegiatanId } = body;

        if ((!id && !targetId) || !generusId || !hasil) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        let targetRecordId = id;
        let record: any = null;

        if (targetRecordId) {
            record = await db.query.mandiriPemilihan.findFirst({
                where: eq(mandiriPemilihan.id, targetRecordId)
            });
        } else if (targetId) {
            // Find existing selection between these two participants (in either direction)
            record = await db.query.mandiriPemilihan.findFirst({
                where: and(
                    ne(mandiriPemilihan.status, "Ditolak"),
                    or(
                        and(eq(mandiriPemilihan.pengirimId, generusId), eq(mandiriPemilihan.penerimaId, targetId)),
                        and(eq(mandiriPemilihan.pengirimId, targetId), eq(mandiriPemilihan.penerimaId, generusId))
                    )
                )
            });

            if (record) {
                targetRecordId = record.id;
            } else {
                targetRecordId = crypto.randomUUID();
                let defaultKegiatanId = reqKegiatanId || "";
                if (!defaultKegiatanId) {
                    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
                    defaultKegiatanId = activeSetting[0]?.value || "";
                }

                await db.insert(mandiriPemilihan).values({
                    id: targetRecordId,
                    pengirimId: generusId,
                    penerimaId: targetId,
                    kegiatanId: defaultKegiatanId,
                    status: "Menunggu",
                    statusTunggu: "antrean",
                    hasilPengirim: hasil,
                    createdAt: sql`(datetime('now'))`
                });

                record = {
                    id: targetRecordId,
                    pengirimId: generusId,
                    penerimaId: targetId,
                    kegiatanId: defaultKegiatanId,
                    status: "Menunggu",
                    statusTunggu: "antrean",
                    hasilPengirim: hasil
                };
            }
        }

        if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (record.pengirimId === generusId) {
            await db.update(mandiriPemilihan).set({ hasilPengirim: hasil }).where(eq(mandiriPemilihan.id, targetRecordId));
        } else if (record.penerimaId === generusId) {
            await db.update(mandiriPemilihan).set({ hasilPenerima: hasil }).where(eq(mandiriPemilihan.id, targetRecordId));
        } else {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Check if both results are now filled
        const updatedRecord = await db.query.mandiriPemilihan.findFirst({
            where: eq(mandiriPemilihan.id, targetRecordId)
        });

        const hasFinished = updatedRecord && 
            updatedRecord.hasilPengirim && 
            updatedRecord.hasilPengirim !== "Menunggu" && 
            updatedRecord.hasilPenerima && 
            updatedRecord.hasilPenerima !== "Menunggu";

        if (hasFinished) {
            // 1. Mark the pemilihan as "Selesai"
            await db.update(mandiriPemilihan)
                .set({ status: "Selesai", statusTunggu: "selesai" })
                .where(eq(mandiriPemilihan.id, targetRecordId));

            // Log visit history
            try {
                const existingVisit = await db.query.mandiriKunjungan.findFirst({
                    where: eq(mandiriKunjungan.pemilihanId, targetRecordId)
                });
                if (!existingVisit) {
                    await db.insert(mandiriKunjungan).values([
                        { id: crypto.randomUUID(), generusId: updatedRecord.pengirimId, pemilihanId: targetRecordId, kegiatanId: updatedRecord.kegiatanId },
                        { id: crypto.randomUUID(), generusId: updatedRecord.penerimaId, pemilihanId: targetRecordId, kegiatanId: updatedRecord.kegiatanId }
                    ]);
                }
            } catch (kunjunganErr) {
                console.error("Failed to insert visit log:", kunjunganErr);
            }

            // 2. Clean up matches if both chose "Lanjut"
            if (updatedRecord.hasilPengirim === "Lanjut" && updatedRecord.hasilPenerima === "Lanjut") {
                try {
                    const { handleMatchCleanup } = await import("@/lib/matchCleanup");
                    await handleMatchCleanup(targetRecordId);
                } catch (cleanupErr) {
                    console.error("Failed to run match cleanup:", cleanupErr);
                }
            }
        }

        try {
            await pusherServer.trigger("taaruf-channel", "taaruf-changed", {
                type: "hasil-rr-updated",
                pemilihanId: targetRecordId,
                generusId
            });
        } catch (pusherErr) {
            console.error("Pusher hasil-rr trigger error:", pusherErr);
        }

        return NextResponse.json({ success: true, finished: !!hasFinished });
    } catch (e) {
        console.error("POST hasil-rr error:", e);
        return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
    }
}
