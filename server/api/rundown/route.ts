export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rundown } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const kegiatanId = searchParams.get("kegiatanId");
    const mandiriKegiatanId = searchParams.get("mandiriKegiatanId");

    let query = db.select().from(rundown).orderBy(asc(rundown.waktu));
    
    if (kegiatanId) {
      query = query.where(eq(rundown.kegiatanId, kegiatanId)) as any;
    } else if (mandiriKegiatanId) {
      query = query.where(eq(rundown.mandiriKegiatanId, mandiriKegiatanId)) as any;
    } else {
      return NextResponse.json([]);
    }

    const data = await query;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Rundown GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin_kegiatan", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { kegiatanId, mandiriKegiatanId, waktu, agenda, pic, keterangan } = body;

    if (!waktu || !agenda) {
      return NextResponse.json({ error: "Waktu dan agenda wajib diisi" }, { status: 400 });
    }

    const id = uuidv4();

    await db.insert(rundown).values({
      id,
      kegiatanId: kegiatanId || null,
      mandiriKegiatanId: mandiriKegiatanId || null,
      waktu,
      agenda,
      pic,
      keterangan,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Rundown POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}
