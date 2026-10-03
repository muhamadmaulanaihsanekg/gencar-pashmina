export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriPemilihan, generus, mandiri, settings, formPanitiaDanPengurus } from "@/lib/schema";
import { eq, sql, and } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

export async function GET(request: NextRequest) {
    try {
        const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
        const kegiatanId = activeSetting[0]?.value || "";

        if (!kegiatanId) {
            return NextResponse.json([]);
        }

        const g1 = alias(generus, "g1");
        const g2 = alias(generus, "g2");
        const m1 = alias(mandiri, "m1");
        const m2 = alias(mandiri, "m2");

        const calls = await db.select({
            id: mandiriPemilihan.id,
            nama: sql<string>`'Panggilan Taaruf'`,
            status: sql<string>`'Dipanggil'`,
            pemilihNomorUrut: m1.nomorUrut,
            terpilihNomorUrut: m2.nomorUrut,
            pemilihNama: g1.nama,
            terpilihNama: g2.nama,
            pemilihGender: g1.jenisKelamin,
            terpilihGender: g2.jenisKelamin
        })
        .from(mandiriPemilihan)
        .leftJoin(g1, eq(mandiriPemilihan.pengirimId, g1.id))
        .leftJoin(g2, eq(mandiriPemilihan.penerimaId, g2.id))
        .leftJoin(m1, eq(g1.id, m1.generusId))
        .leftJoin(m2, eq(g2.id, m2.generusId))
        .where(
            and(
                eq(mandiriPemilihan.kegiatanId, kegiatanId),
                eq(mandiriPemilihan.status, "Menunggu"),
                eq(mandiriPemilihan.statusTunggu, "dipanggil")
            )
        )
        .orderBy(mandiriPemilihan.createdAt);

        return NextResponse.json(calls);
    } catch (error) {
        console.error("GET public calls error:", error);
        return NextResponse.json({ error: "Gagal mengambil data panggilan" }, { status: 500 });
    }
}
