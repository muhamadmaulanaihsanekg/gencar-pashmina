export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKuisioner, mandiriPemilihan, mandiri, generus } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { pemilihanId, namaPnkb, noHpPnkb, tanggapan, rekomendasi, nomorUnik, token } = body;

        const session = await getSession();
        let pengisiId = session?.generusId;

        if (!session && nomorUnik && token) {
             const m = await db.select({ generusId: mandiri.generusId })
                .from(mandiri)
                .innerJoin(generus, eq(mandiri.generusId, generus.id))
                .where(and(eq(generus.nomorUnik, nomorUnik), eq(mandiri.lastSessionToken, token)))
                .limit(1);
            if (m.length > 0) pengisiId = m[0].generusId;
        }

        if (!pengisiId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (!tanggapan || !rekomendasi) {
            return NextResponse.json({ error: "Mohon isi semua field kuisioner" }, { status: 400 });
        }

        const id = uuidv4();
        await db.insert(mandiriKuisioner).values({
            id,
            pemilihanId,
            pengisiId: pengisiId!,
            namaPnkb,
            noHpPnkb,
            tanggapan,
            rekomendasi
        });

        // If pemilihanId exists, mark selection as "Selesai"
        if (pemilihanId) {
            await db.update(mandiriPemilihan).set({ status: "Selesai" }).where(eq(mandiriPemilihan.id, pemilihanId));
        }

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("POST kuisioner error:", error);
        return NextResponse.json({ error: "Gagal menyimpan kuisioner" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
            return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
        }

        const data = await db.select().from(mandiriKuisioner);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
    }
}
