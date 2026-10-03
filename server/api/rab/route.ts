export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rab, kegiatan, mandiriKegiatan } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const kegiatanId = searchParams.get("kegiatanId");
    const mandiriKegiatanId = searchParams.get("mandiriKegiatanId");

    let query = db.select().from(rab);
    
    if (kegiatanId) {
      query = query.where(eq(rab.kegiatanId, kegiatanId)) as any;
    } else if (mandiriKegiatanId) {
      query = query.where(eq(rab.mandiriKegiatanId, mandiriKegiatanId)) as any;
    } else {
      // If no ID provided, return empty or all (though usually we want it filtered)
      return NextResponse.json([]);
    }

    const data = await query;
    return NextResponse.json(data);
  } catch (error) {
    console.error("RAB GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_keuangan", "admin_romantic_room", "admin_kegiatan", "desa", "kelompok", "creator"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { kegiatanId, mandiriKegiatanId, item, volume, satuan, hargaSatuan, keterangan } = body;

    if (!item || !volume || !satuan || !hargaSatuan) {
      return NextResponse.json({ error: "Item, volume, satuan, dan harga satuan wajib diisi" }, { status: 400 });
    }

    const id = uuidv4();
    const totalHarga = Number(volume) * Number(hargaSatuan);

    await db.insert(rab).values({
      id,
      kegiatanId: kegiatanId || null,
      mandiriKegiatanId: mandiriKegiatanId || null,
      item,
      volume: Number(volume),
      satuan,
      hargaSatuan: Number(hargaSatuan),
      totalHarga,
      keterangan,
    });

    return NextResponse.json({ success: true, id, totalHarga });
  } catch (error) {
    console.error("RAB POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}
