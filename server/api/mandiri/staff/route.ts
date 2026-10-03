import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timGambuh, settings } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !["admin", "admin_romantic_room", "tim_pnkb"].includes(session.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        let kegiatanId = searchParams.get("kegiatanId") || "";

        if (!kegiatanId) {
            const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
            kegiatanId = activeSetting[0]?.value || "";
        }

        if (!kegiatanId) {
            return NextResponse.json([]);
        }

        // Fetch all staff members from tim_gambuh table where tipe is PNKB
        const staff = await db.select({
            id: timGambuh.id,
            name: timGambuh.nama,
            role: timGambuh.tipe, // map tipe to "role" in frontend
        })
        .from(timGambuh)
        .where(and(
            inArray(timGambuh.tipe, ["PNKB", "Tim Penunggu", "Ibu Gambuh"]),
            eq(timGambuh.kegiatanId, kegiatanId)
        ))
        .orderBy(timGambuh.nama);

        return NextResponse.json(staff);
    } catch (error) {
        console.error("GET staff error:", error);
        return NextResponse.json({ error: "Gagal mengambil data staf" }, { status: 500 });
    }
}
