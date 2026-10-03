export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus } from "@/lib/schema";
import { eq, or, like, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Search generus by name or nomorUnik for QR scan
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (!q) return NextResponse.json([]);

    const conditions: any[] = [
      or(
        like(generus.nama, `%${q}%`),
        like(generus.nomorUnik, `%${q}%`)
      )
    ];

    if (session.role === "desa" && session.desaId) {
      conditions.push(eq(generus.desaId, session.desaId));
    } else if (session.role === "kelompok" && session.kelompokId) {
      conditions.push(eq(generus.kelompokId, session.kelompokId));
    }

    const data = await db
      .select()
      .from(generus)
      .where(and(...conditions))
      .limit(10);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Search generus error:", error);
    return NextResponse.json({ error: "Gagal mencari data" }, { status: 500 });
  }
}
