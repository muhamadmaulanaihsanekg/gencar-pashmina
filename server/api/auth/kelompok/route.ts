export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kelompok } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const desaId = searchParams.get("desaId");

    if (!desaId) {
      return NextResponse.json({ error: "desaId diperlukan" }, { status: 400 });
    }

    const kelompokList = await db
      .select()
      .from(kelompok)
      .where(eq(kelompok.desaId, Number(desaId)))
      .orderBy(kelompok.nama);

    return NextResponse.json(kelompokList, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Kelompok fetch error:", error);
    return NextResponse.json({ error: "Gagal mengambil data kelompok" }, { status: 500 });
  }
}
