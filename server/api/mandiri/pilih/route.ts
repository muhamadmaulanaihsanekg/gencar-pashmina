
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriPemilihan, users, generus, mandiriAntrean, mandiri, formPanitiaDanPengurus, mandiriDesa, mandiriAbsensi, mandiriKegiatan, settings, mandiriDaerah, mandiriKunjungan } from "@/lib/schema";
import { eq, and, or, count, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { pusherServer } from "@/lib/pusher";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const nomorUnikReq = searchParams.get("nomorUnik");
        const tokenReq = searchParams.get("token");

        let currentGenerusId: string | null = null;
        let isAdmin = false;

        const session = await getSession();
        if (session) {
            currentGenerusId = session.generusId || null;
            isAdmin = ["admin", "kmm_daerah", "admin_romantic_room", "pengurus_daerah", "tim_pnkb", "tim_pnkb_gambuh"].includes(session.role);
        }

        // If not logged in but has token, verify token
        const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
        const kegiatanId = activeSetting[0]?.value || "";

        if (!currentGenerusId && nomorUnikReq && tokenReq && kegiatanId) {
            const m = await db.select({ generusId: mandiri.generusId, lastSessionToken: mandiri.lastSessionToken })
                .from(mandiri)
                .innerJoin(generus, eq(mandiri.generusId, generus.id))
                .where(and(eq(generus.nomorUnik, nomorUnikReq), eq(mandiri.kegiatanId, kegiatanId)))
                .limit(1);
            if (m.length > 0 && m[0].lastSessionToken && m[0].lastSessionToken === tokenReq) {
                currentGenerusId = m[0].generusId;
            }
        }

        if (!currentGenerusId && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (isAdmin && searchParams.get("all") === "true") {
            let adminKegiatanId = searchParams.get("kegiatanId") || "";
            if (!adminKegiatanId) {
                adminKegiatanId = kegiatanId;
            }

            const g1 = alias(generus, "g1");
            const g2 = alias(generus, "g2");
            const m1 = alias(mandiri, "m1");
            const m2 = alias(mandiri, "m2");
            const pan1 = alias(formPanitiaDanPengurus, "pan1");
            const pan2 = alias(formPanitiaDanPengurus, "pan2");
            const md1 = alias(mandiriDesa, "md1");
            const md2 = alias(mandiriDesa, "md2");
            const mda1 = alias(mandiriDaerah, "mda1");
            const mda2 = alias(mandiriDaerah, "mda2");
            const abs1 = alias(mandiriAbsensi, "abs1");
            const abs2 = alias(mandiriAbsensi, "abs2");

            const allSelections = await db.select({
                id: mandiriPemilihan.id,
                status: mandiriPemilihan.status,
                statusTunggu: mandiriPemilihan.statusTunggu,
                createdAt: mandiriPemilihan.createdAt,
                pengirimNama: g1.nama,
                pengirimNo: g1.nomorUnik,
                pengirimNomorUrut: m1.nomorUrut,
                pengirimStatus: sql<string>`CASE WHEN ${pan1.id} IS NOT NULL THEN 'Panitia' ELSE 'Peserta' END`,
                pengirimKota: mda1.nama,
                pengirimDesa: md1.nama,
                penerimaNama: g2.nama,
                penerimaNo: g2.nomorUnik,
                penerimaNomorUrut: m2.nomorUrut,
                penerimaStatus: sql<string>`CASE WHEN ${pan2.id} IS NOT NULL THEN 'Panitia' ELSE 'Peserta' END`,
                penerimaKota: mda2.nama,
                penerimaDesa: md2.nama,
                pengirimWa: sql<string>`COALESCE(${g1.noTelp}, ${pan1.noTelp})`,
                penerimaWa: sql<string>`COALESCE(${g2.noTelp}, ${pan2.noTelp})`,
                pengirimJenisKelamin: g1.jenisKelamin,
                penerimaJenisKelamin: g2.jenisKelamin,
                pengirimTanggalLahir: g1.tanggalLahir,
                penerimaTanggalLahir: g2.tanggalLahir,
                pengirimKeterangan: abs1.keterangan,
                penerimaKeterangan: abs2.keterangan
            })
            .from(mandiriPemilihan)
            .innerJoin(g1, eq(mandiriPemilihan.pengirimId, g1.id))
            .innerJoin(g2, eq(mandiriPemilihan.penerimaId, g2.id))
            .leftJoin(m1, eq(g1.id, m1.generusId))
            .leftJoin(m2, eq(g2.id, m2.generusId))
            .leftJoin(pan1, eq(g1.id, pan1.generusId))
            .leftJoin(pan2, eq(g2.id, pan2.generusId))
            .leftJoin(md1, eq(sql`COALESCE(${g1.mandiriDesaId}, ${pan1.mandiriDesaId})`, md1.id))
            .leftJoin(md2, eq(sql`COALESCE(${g2.mandiriDesaId}, ${pan2.mandiriDesaId})`, md2.id))
            .leftJoin(mda1, eq(md1.mandiriDaerahId, mda1.id))
            .leftJoin(mda2, eq(md2.mandiriDaerahId, mda2.id))
            .leftJoin(abs1, and(eq(g1.id, abs1.generusId), eq(abs1.kegiatanId, adminKegiatanId)))
            .leftJoin(abs2, and(eq(g2.id, abs2.generusId), eq(abs2.kegiatanId, adminKegiatanId)))
            .where(eq(mandiriPemilihan.kegiatanId, adminKegiatanId))
            .orderBy(desc(mandiriPemilihan.createdAt));

            return NextResponse.json(allSelections);
        }

        const targetPengirimId = searchParams.get("pengirimId") || currentGenerusId;
        if (!targetPengirimId) return NextResponse.json({ error: "Identitas tidak ditemukan" }, { status: 400 });


        const selections = await db.select({
            id: mandiriPemilihan.id,
            status: mandiriPemilihan.status,
            statusTunggu: mandiriPemilihan.statusTunggu,
            penerimaId: mandiriPemilihan.penerimaId,
            createdAt: mandiriPemilihan.createdAt,
            penerimaNama: generus.nama,
            penerimaNo: generus.nomorUnik,
            penerimaNoUrut: mandiri.nomorUrut
        })
        .from(mandiriPemilihan)
        .innerJoin(generus, eq(mandiriPemilihan.penerimaId, generus.id))
        .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
        .where(and(
            eq(mandiriPemilihan.pengirimId, targetPengirimId),
            eq(mandiriPemilihan.kegiatanId, kegiatanId)
        ))
        .orderBy(desc(mandiriPemilihan.createdAt));

        return NextResponse.json(selections);
    } catch (error) {
        console.error("GET selection error:", error);
        return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { targetId, nomorUnik, token } = body;

        let pengirimId: string | null = null;

        const session = await getSession();
        if (session) {
            pengirimId = session.generusId || null;
        }

        const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
        const kegiatanId = activeSetting[0]?.value || "";

        // Token validation for independent participants
        if (!pengirimId && nomorUnik && token && kegiatanId) {
            // Try exact token match first
            const m = await db.select({ generusId: mandiri.generusId, lastSessionToken: mandiri.lastSessionToken })
                .from(mandiri)
                .innerJoin(generus, eq(mandiri.generusId, generus.id))
                .where(and(eq(generus.nomorUnik, nomorUnik), eq(mandiri.kegiatanId, kegiatanId)))
                .limit(1);
            if (m.length > 0 && m[0].lastSessionToken && m[0].lastSessionToken === token) {
                pengirimId = m[0].generusId;
            }
        }

        if (!pengirimId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!targetId) return NextResponse.json({ error: "Target pilihan tidak valid" }, { status: 400 });
        if (pengirimId === targetId) return NextResponse.json({ error: "Tidak dapat memilih diri sendiri" }, { status: 400 });

        if (kegiatanId) {
            const pengirimAbs = await db.select({ keterangan: mandiriAbsensi.keterangan })
                .from(mandiriAbsensi)
                .where(and(eq(mandiriAbsensi.generusId, pengirimId), eq(mandiriAbsensi.kegiatanId, kegiatanId)))
                .limit(1);
            
            if (pengirimAbs.length === 0) {
                return NextResponse.json({ error: "Anda harus melakukan absensi terlebih dahulu sebelum dapat memilih" }, { status: 400 });
            } else if (pengirimAbs[0].keterangan === "pulang" || pengirimAbs[0].keterangan === "izin" || pengirimAbs[0].keterangan === "alpha") {
                return NextResponse.json({ error: "Status kehadiran Anda tidak mengizinkan untuk memilih" }, { status: 400 });
            }

            const targetAbs = await db.select({ keterangan: mandiriAbsensi.keterangan })
                .from(mandiriAbsensi)
                .where(and(eq(mandiriAbsensi.generusId, targetId), eq(mandiriAbsensi.kegiatanId, kegiatanId)))
                .limit(1);
                
            if (targetAbs.length === 0) {
                return NextResponse.json({ error: "Peserta yang Anda pilih belum melakukan absensi" }, { status: 400 });
            } else if (targetAbs[0].keterangan === "pulang" || targetAbs[0].keterangan === "izin" || targetAbs[0].keterangan === "alpha") {
                return NextResponse.json({ error: "Status kehadiran peserta yang Anda pilih tidak mengizinkan untuk dipilih" }, { status: 400 });
            }
        }

        // Check if there is an existing handshake selection (either direction) that has not been rejected
        const existingHandshake = await db.query.mandiriPemilihan.findFirst({
            where: and(
                eq(mandiriPemilihan.kegiatanId, kegiatanId),
                or(
                    and(
                        eq(mandiriPemilihan.pengirimId, pengirimId),
                        eq(mandiriPemilihan.penerimaId, targetId)
                    ),
                    and(
                        eq(mandiriPemilihan.pengirimId, targetId),
                        eq(mandiriPemilihan.penerimaId, pengirimId)
                    )
                ),
                sql`${mandiriPemilihan.status} != 'Ditolak'` // Block Menunggu, Diterima, Selesai
            )
        });
        if (existingHandshake) {
            let errorMsg = "Anda sudah memilih peserta ini";
            if (existingHandshake.pengirimId === targetId) {
                errorMsg = "Peserta ini sudah memilih Anda, atau Anda berdua sudah pernah dipasangkan";
            } else if (existingHandshake.status === "Selesai") {
                errorMsg = "Anda berdua sudah pernah dipasangkan sebelumnya";
            }
            return NextResponse.json({ error: errorMsg }, { status: 400 });
        }

        // Count active selections from this sender (max 3, including completed/used calls)
        const activeCount = await db.select({ value: count() }).from(mandiriPemilihan)
            .where(and(
                eq(mandiriPemilihan.pengirimId, pengirimId), 
                eq(mandiriPemilihan.kegiatanId, kegiatanId),
                or(eq(mandiriPemilihan.status, "Menunggu"), eq(mandiriPemilihan.status, "Diterima"), eq(mandiriPemilihan.status, "Selesai"))
            ));
        
        const countVal = Number(activeCount[0]?.value || 0);
        if (countVal >= 3) {
             return NextResponse.json({ error: "Anda telah mencapai batas maksimum 3 pemilihan" }, { status: 403 });
        }

        // Count how many times the target has been selected by others (max 5)
        const targetActiveCount = await db.select({ value: count() }).from(mandiriPemilihan)
            .where(and(
                eq(mandiriPemilihan.penerimaId, targetId), 
                eq(mandiriPemilihan.kegiatanId, kegiatanId),
                or(eq(mandiriPemilihan.status, "Menunggu"), eq(mandiriPemilihan.status, "Diterima"), eq(mandiriPemilihan.status, "Selesai"))
            ));
        
        const targetCountVal = Number(targetActiveCount[0]?.value || 0);
        if (targetCountVal >= 5) {
             return NextResponse.json({ error: "Peserta ini sudah mencapai batas maksimum terpilih (5 kali)" }, { status: 403 });
        }

        const id = uuidv4();
        await db.insert(mandiriPemilihan).values({
            id,
            pengirimId,
            penerimaId: targetId,
            kegiatanId,
            status: "Menunggu"
        });

        // Optimization: Return the updated selections list directly
        const updatedSelections = await db.select({
            id: mandiriPemilihan.id,
            status: mandiriPemilihan.status,
            penerimaId: mandiriPemilihan.penerimaId,
            createdAt: mandiriPemilihan.createdAt,
            penerimaNama: generus.nama,
            penerimaNo: generus.nomorUnik,
            penerimaNoUrut: mandiri.nomorUrut
        })
        .from(mandiriPemilihan)
        .innerJoin(generus, eq(mandiriPemilihan.penerimaId, generus.id))
        .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
        .where(and(
            eq(mandiriPemilihan.pengirimId, pengirimId),
            eq(mandiriPemilihan.kegiatanId, kegiatanId)
        ))
        .orderBy(desc(mandiriPemilihan.createdAt));

        // Trigger Pusher update
        try {
            await pusherServer.trigger("taaruf-channel", "taaruf-changed", {
                type: "create",
                pengirimId,
                penerimaId: targetId,
            });
        } catch (pusherErr) {
            console.error("Pusher trigger error:", pusherErr);
        }

        return NextResponse.json({ success: true, id, selections: updatedSelections });
    } catch (error) {
        console.error("POST selection error:", error);
        return NextResponse.json({ error: "Gagal memproses pilihan" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const targetId = searchParams.get("targetId");
        const idReq = searchParams.get("id");
        const nomorUnik = searchParams.get("nomorUnik");
        const token = searchParams.get("token");

        let pengirimId: string | null = null;

        const session = await getSession();
        if (session) {
            pengirimId = session.generusId || null;
            const isAdmin = ["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "tim_pnkb_gambuh", "admin_romantic_room"].includes(session.role);
            if (idReq && isAdmin) {
                await db.delete(mandiriPemilihan).where(eq(mandiriPemilihan.id, idReq));
                await db.delete(mandiriKunjungan).where(eq(mandiriKunjungan.pemilihanId, idReq));
                try {
                    await pusherServer.trigger("taaruf-channel", "taaruf-changed", {
                        type: "delete",
                        pemilihanId: idReq
                    });
                } catch (e) {}
                return NextResponse.json({ success: true });
            }
        }

        // Token validation for independent participants
        const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
        const kegiatanId = activeSetting[0]?.value || "";

        if (!pengirimId && nomorUnik && token && kegiatanId) {
            const m = await db.select({ generusId: mandiri.generusId, lastSessionToken: mandiri.lastSessionToken })
                .from(mandiri)
                .innerJoin(generus, eq(mandiri.generusId, generus.id))
                .where(and(eq(generus.nomorUnik, nomorUnik), eq(mandiri.kegiatanId, kegiatanId)))
                .limit(1);
            if (m.length > 0 && m[0].lastSessionToken && m[0].lastSessionToken === token) {
                pengirimId = m[0].generusId;
            }
        }

        if (!pengirimId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!targetId) return NextResponse.json({ error: "Target pilihan tidak valid" }, { status: 400 });


        const selection = await db.query.mandiriPemilihan.findFirst({
            where: and(
                eq(mandiriPemilihan.pengirimId, pengirimId), 
                eq(mandiriPemilihan.penerimaId, targetId),
                eq(mandiriPemilihan.kegiatanId, kegiatanId)
            )
        });

        if (!selection) return NextResponse.json({ error: "Data pilihan tidak ditemukan" }, { status: 404 });
        
        if (selection.status !== "Menunggu") {
            return NextResponse.json({ error: "Pilihan yang sudah diproses oleh admin tidak dapat dibatalkan" }, { status: 400 });
        }

        await db.delete(mandiriPemilihan)
            .where(and(
                eq(mandiriPemilihan.pengirimId, pengirimId), 
                eq(mandiriPemilihan.penerimaId, targetId),
                eq(mandiriPemilihan.kegiatanId, kegiatanId)
            ));

        const updatedSelections = await db.select({
            id: mandiriPemilihan.id,
            status: mandiriPemilihan.status,
            penerimaId: mandiriPemilihan.penerimaId,
            createdAt: mandiriPemilihan.createdAt,
            penerimaNama: generus.nama,
            penerimaNo: generus.nomorUnik,
            penerimaNoUrut: mandiri.nomorUrut
        })
        .from(mandiriPemilihan)
        .innerJoin(generus, eq(mandiriPemilihan.penerimaId, generus.id))
        .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
        .where(and(
            eq(mandiriPemilihan.pengirimId, pengirimId),
            eq(mandiriPemilihan.kegiatanId, kegiatanId)
        ))
        .orderBy(desc(mandiriPemilihan.createdAt));

        // Trigger Pusher update
        try {
            await pusherServer.trigger("taaruf-channel", "taaruf-changed", {
                type: "delete",
                pengirimId,
                penerimaId: targetId,
            });
        } catch (pusherErr) {
            console.error("Pusher trigger error:", pusherErr);
        }

        return NextResponse.json({ success: true, selections: updatedSelections });
    } catch (error) {
        console.error("DELETE selection error:", error);
        return NextResponse.json({ error: "Gagal membatalkan pilihan" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const isAdmin = ["admin", "kmm_daerah", "admin_romantic_room", "pengurus_daerah", "tim_pnkb"].includes(session.role);
        if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const body = await request.json();
        const { pemilihanId, statusTunggu } = body;

        if (!pemilihanId || !statusTunggu) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // Enforce maximum capacity of 5 pairs in the waiting room
        if (statusTunggu === "dipanggil") {
            const selObj = await db.query.mandiriPemilihan.findFirst({
                where: eq(mandiriPemilihan.id, pemilihanId)
            });
            if (selObj?.kegiatanId) {
                const currentWaiting = await db.select({ id: mandiriPemilihan.id })
                    .from(mandiriPemilihan)
                    .where(and(
                        eq(mandiriPemilihan.kegiatanId, selObj.kegiatanId),
                        eq(mandiriPemilihan.status, "Menunggu"),
                        eq(mandiriPemilihan.statusTunggu, "dipanggil")
                    ));
                if (currentWaiting.length >= 5) {
                    return NextResponse.json({ error: "Ruang Tunggu sudah penuh (maksimal 5 pasang)" }, { status: 400 });
                }
            }
        }

        // Update selection statusTunggu
        await db.update(mandiriPemilihan)
            .set({ statusTunggu })
            .where(eq(mandiriPemilihan.id, pemilihanId));

        // If statusTunggu is 'dipanggil', send WhatsApp notifications via Fonnte to both participants
        if (statusTunggu === "dipanggil") {
            try {
                const selection = await db.query.mandiriPemilihan.findFirst({
                    where: eq(mandiriPemilihan.id, pemilihanId)
                });

                if (selection) {
                    // Fetch pengirim details
                    const pengirimData = await db.select({
                        nama: generus.nama,
                        noTelp: generus.noTelp,
                        nomorUrut: mandiri.nomorUrut
                    })
                    .from(generus)
                    .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
                    .where(eq(generus.id, selection.pengirimId))
                    .limit(1);

                    // Fetch penerima details
                    const penerimaData = await db.select({
                        nama: generus.nama,
                        noTelp: generus.noTelp,
                        nomorUrut: mandiri.nomorUrut
                    })
                    .from(generus)
                    .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
                    .where(eq(generus.id, selection.penerimaId))
                    .limit(1);

                    const pengirim = pengirimData[0];
                    const penerima = penerimaData[0];


                    const waPromises: Promise<any>[] = [];
                    if (pengirim && pengirim.noTelp) {
                        const msgToPengirim = `*PANGGILAN TAARUF*\n\nKepada: *${pengirim.nama}* (#${pengirim.nomorUrut || '-'})\nInstruksi: Amal shalihnya segera merapat ke *Titik Tunggu Utama*.\n\nCatatan: Mohon tetap berada di titik tunggu agar memudahkan panitia untuk menjemput dan mengarahkan Anda menuju ruang taaruf.\n\nAlhamdulillah jazakumullahu khaira.`;
                        waPromises.push(sendWhatsApp(pengirim.noTelp, msgToPengirim));
                    }

                    if (penerima && penerima.noTelp) {
                        const msgToPenerima = `*PANGGILAN TAARUF*\n\nKepada: *${penerima.nama}* (#${penerima.nomorUrut || '-'})\nInstruksi: Amal shalihnya segera merapat ke *Titik Tunggu Utama*.\n\nCatatan: Mohon tetap berada di titik tunggu agar memudahkan panitia untuk menjemput dan mengarahkan Anda menuju ruang taaruf.\n\nAlhamdulillah jazakumullahu khaira.`;
                        waPromises.push(sendWhatsApp(penerima.noTelp, msgToPenerima));
                    }

                    await Promise.allSettled(waPromises);
                }
            } catch (notifyErr) {
                console.error("Failed to send waiting room WA notification:", notifyErr);
            }
        }

        // Trigger Pusher websocket event
        try {
            let pengirimNama = "";
            let pengirimNoUrut = "";
            let penerimaNama = "";
            let penerimaNoUrut = "";

            const selection = await db.query.mandiriPemilihan.findFirst({
                where: eq(mandiriPemilihan.id, pemilihanId)
            });

            if (selection) {
                const g1Data = await db.select({ nama: generus.nama, nomorUrut: mandiri.nomorUrut })
                    .from(generus)
                    .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
                    .where(eq(generus.id, selection.pengirimId))
                    .limit(1);
                const g2Data = await db.select({ nama: generus.nama, nomorUrut: mandiri.nomorUrut })
                    .from(generus)
                    .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
                    .where(eq(generus.id, selection.penerimaId))
                    .limit(1);
                
                if (g1Data.length > 0) {
                    pengirimNama = g1Data[0].nama;
                    pengirimNoUrut = String(g1Data[0].nomorUrut || "");
                }
                if (g2Data.length > 0) {
                    penerimaNama = g2Data[0].nama;
                    penerimaNoUrut = String(g2Data[0].nomorUrut || "");
                }
            }

            await pusherServer.trigger("taaruf-channel", "taaruf-changed", {
                type: "update-status-tunggu",
                pemilihanId,
                statusTunggu,
                pengirimNama,
                pengirimNoUrut,
                penerimaNama,
                penerimaNoUrut
            });
        } catch (pusherErr) {
            console.error("Pusher trigger error:", pusherErr);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH selection error:", error);
        return NextResponse.json({ error: "Gagal memproses status" }, { status: 500 });
    }
}
