export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { desa } from "@/lib/schema";

export async function GET() {
  try {
    const data = await db.select().from(desa).orderBy(desa.nama);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil data desa" }, { status: 500 });
  }
}
