export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { desa } from "@/lib/schema";

export async function GET() {
  try {
    const desaList = await db.select().from(desa).orderBy(desa.nama);
    return NextResponse.json(desaList, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Desa fetch error:", error);
    return NextResponse.json({ error: "Gagal mengambil data desa" }, { status: 500 });
  }
}
