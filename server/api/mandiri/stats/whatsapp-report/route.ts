
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
    mandiriAbsensi, 
    mandiriKegiatan, 
    formPanitiaDanPengurus, 
    generus, 
    mandiriDesa,
    mandiriPemilihan,
    mandiriAntrean,
    mandiri,
    settings,
    mandiriDaerah
} from "@/lib/schema";
import { eq, desc, and, sql, or, count } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !["admin", "kmm_daerah", "admin_romantic_room", "pengurus_daerah", "tim_pnkb"].includes(session.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get the active activity from settings
        const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
        const kegiatanId = activeSetting[0]?.value || "";

        if (!kegiatanId) {
            return NextResponse.json({ error: "No active activity found" }, { status: 404 });
        }

        const latestActivity = await db.select().from(mandiriKegiatan).where(eq(mandiriKegiatan.id, kegiatanId)).limit(1);
        if (latestActivity.length === 0) {
            return NextResponse.json({ error: "Active activity not found in database" }, { status: 404 });
        }

        // 2. Get all unique cities (Kota) from mandiriDaerah
        const cities = await db
            .select({ nama: mandiriDaerah.nama })
            .from(mandiriDaerah)
            .orderBy(mandiriDaerah.nama);
        
        const reports = [];

        for (const city of cities) {
            // Stats for this city
            
            // a. Participants attendance (Only those in the 'mandiri' table in this city)
            const participantsAttendance = await db
                .select({ 
                    count: sql<number>`count(distinct ${generus.id})`,
                    male: sql<number>`count(distinct case when ${generus.jenisKelamin} = 'L' then ${generus.id} end)`,
                    female: sql<number>`count(distinct case when ${generus.jenisKelamin} = 'P' then ${generus.id} end)`
                })
                .from(mandiriAbsensi)
                .innerJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
                .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
                .innerJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
                .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
                .where(and(
                    eq(mandiriAbsensi.kegiatanId, kegiatanId),
                    eq(mandiriDaerah.nama, city.nama)
                ));

            // b. Committee attendance (in this city)
            const committeeAttendance = await db
                .select({ 
                    count: sql<number>`count(distinct ${formPanitiaDanPengurus.id})`,
                    male: sql<number>`count(distinct case when ${formPanitiaDanPengurus.jenisKelamin} = 'L' then ${formPanitiaDanPengurus.id} end)`,
                    female: sql<number>`count(distinct case when ${formPanitiaDanPengurus.jenisKelamin} = 'P' then ${formPanitiaDanPengurus.id} end)`
                })
                .from(mandiriAbsensi)
                .innerJoin(formPanitiaDanPengurus, eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId))
                .innerJoin(mandiriDesa, eq(formPanitiaDanPengurus.mandiriDesaId, mandiriDesa.id))
                .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
                .where(and(
                    eq(mandiriAbsensi.kegiatanId, kegiatanId),
                    eq(mandiriDaerah.nama, city.nama)
                ));

            // c. Romantic Room Results (in this city)
            const pemilihanResults = await db
                .select({
                    id: mandiriPemilihan.id,
                    h1: mandiriPemilihan.hasilPengirim,
                    h2: mandiriPemilihan.hasilPenerima,
                })
                .from(mandiriPemilihan)
                .leftJoin(generus, or(eq(mandiriPemilihan.pengirimId, generus.id), eq(mandiriPemilihan.penerimaId, generus.id)))
                .innerJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
                .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
                .where(and(
                    eq(mandiriPemilihan.status, "Selesai"),
                    eq(mandiriDaerah.nama, city.nama)
                ))
                .groupBy(mandiriPemilihan.id);

            const rrStats = {
                lanjutLanjut: 0,
                tidakLanjutLanjut: 0,
                tidakLanjutTidakLanjut: 0,
                raguRaguRaguRagu: 0,
                raguRaguLanjut: 0,
                raguRaguTidakLanjut: 0
            };

            pemilihanResults.forEach(p => {
                const h1 = p.h1;
                const h2 = p.h2;

                if (h1 === "Lanjut" && h2 === "Lanjut") rrStats.lanjutLanjut++;
                else if ((h1 === "Lanjut" && h2 === "Tidak Lanjut") || (h1 === "Tidak Lanjut" && h2 === "Lanjut")) rrStats.tidakLanjutLanjut++;
                else if (h1 === "Tidak Lanjut" && h2 === "Tidak Lanjut") rrStats.tidakLanjutTidakLanjut++;
                else if (h1 === "Ragu-ragu" && h2 === "Ragu-ragu") rrStats.raguRaguRaguRagu++;
                else if ((h1 === "Ragu-ragu" && h2 === "Lanjut") || (h1 === "Lanjut" && h2 === "Ragu-ragu")) rrStats.raguRaguLanjut++;
                else if ((h1 === "Ragu-ragu" && h2 === "Tidak Lanjut") || (h1 === "Tidak Lanjut" && h2 === "Ragu-ragu")) rrStats.raguRaguTidakLanjut++;
            });

            // d. Menunggu Antrean (in this city) - Using mandiriPemilihan (Pairs)
            const waitingCount = await db
                .select({ count: sql<number>`count(distinct ${mandiriPemilihan.id})` })
                .from(mandiriPemilihan)
                .leftJoin(generus, or(eq(mandiriPemilihan.pengirimId, generus.id), eq(mandiriPemilihan.penerimaId, generus.id)))
                .innerJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
                .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
                .where(and(
                    eq(mandiriPemilihan.status, "Menunggu"),
                    eq(mandiriDaerah.nama, city.nama)
                ));

            reports.push({
                kota: city.nama,
                pesertaHadir: participantsAttendance[0].count || 0,
                pesertaLaki: participantsAttendance[0].male || 0,
                pesertaPerempuan: participantsAttendance[0].female || 0,
                panitiaHadir: committeeAttendance[0].count || 0,
                panitiaLaki: committeeAttendance[0].male || 0,
                panitiaPerempuan: committeeAttendance[0].female || 0,
                rr: rrStats,
                menungguAntrean: waitingCount[0].count || 0
            });
        }

        // Calculate Grand Totals
        // For waiting queue grand total, we need to count unique pemilihan records with status "Menunggu"
        const globalWaitingCount = await db
            .select({ count: count() })
            .from(mandiriPemilihan)
            .where(eq(mandiriPemilihan.status, "Menunggu"));

        const grandTotal = {
            pesertaHadir: reports.reduce((acc, r) => acc + r.pesertaHadir, 0),
            panitiaHadir: reports.reduce((acc, r) => acc + r.panitiaHadir, 0),
            menungguAntrean: globalWaitingCount[0].count || 0
        };

        return NextResponse.json({ 
            kegiatan: latestActivity[0].judul,
            reports,
            grandTotal
        });

    } catch (error) {
        console.error("WhatsApp report error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
