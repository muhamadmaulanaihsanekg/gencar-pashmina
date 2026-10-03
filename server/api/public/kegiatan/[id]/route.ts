
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kegiatan } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const data = await db.query.kegiatan.findFirst({
      where: eq(kegiatan.id, id),
      columns: {
        id: true,
        judul: true,
        tanggal: true,
        jam: true,
        lokasi: true,
      }
    });

    if (!data) return NextResponse.json({ error: "Kegiatan tidak ditemukan" }, { status: 404 });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
