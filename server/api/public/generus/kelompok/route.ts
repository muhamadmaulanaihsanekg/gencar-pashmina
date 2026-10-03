export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kelompok } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const desaId = searchParams.get("desaId");
    if (!desaId) return NextResponse.json([]);
    
    const data = await db.select().from(kelompok).where(eq(kelompok.desaId, Number(desaId))).orderBy(kelompok.nama);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil data kelompok" }, { status: 500 });
  }
}
