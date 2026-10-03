export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriDaerah, mandiriKegiatanDaerah } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const kegiatanId = searchParams.get("kegiatanId");

    let data;
    if (kegiatanId) {
      data = await db
        .select({
          id: mandiriDaerah.id,
          nama: mandiriDaerah.nama,
          isActive: sql<number>`COALESCE(${mandiriKegiatanDaerah.isActive}, 0)`.mapWith(Number),
        })
        .from(mandiriDaerah)
        .leftJoin(
          mandiriKegiatanDaerah,
          and(
            eq(mandiriKegiatanDaerah.daerahId, mandiriDaerah.id),
            eq(mandiriKegiatanDaerah.kegiatanId, kegiatanId)
          )
        )
        .orderBy(mandiriDaerah.nama);
    } else {
      data = await db
        .select({
          id: mandiriDaerah.id,
          nama: mandiriDaerah.nama,
          isActive: sql<number>`0`.mapWith(Number)
        })
        .from(mandiriDaerah)
        .orderBy(mandiriDaerah.nama);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data daerah" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { nama, kegiatanId } = body;
    if (!nama || !nama.trim()) return NextResponse.json({ error: "Nama daerah wajib diisi" }, { status: 400 });
    const insertedDaerah = await db.insert(mandiriDaerah).values({ nama: nama.trim() }).returning({ id: mandiriDaerah.id });
    
    if (kegiatanId && insertedDaerah && insertedDaerah.length > 0) {
      await db.insert(mandiriKegiatanDaerah).values({
        id: uuidv4(),
        kegiatanId: kegiatanId,
        daerahId: insertedDaerah[0].id,
        isActive: 1,
      });
    }
    return NextResponse.json({ success: true, data: insertedDaerah });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan data daerah" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { id, nama, kegiatanId, isActive } = body;

    // Toggle active status for a specific kegiatan
    if (kegiatanId !== undefined && isActive !== undefined) {
      if (!id) return NextResponse.json({ error: "ID daerah diperlukan" }, { status: 400 });
      
      const existing = await db
        .select()
        .from(mandiriKegiatanDaerah)
        .where(and(
          eq(mandiriKegiatanDaerah.kegiatanId, kegiatanId),
          eq(mandiriKegiatanDaerah.daerahId, Number(id))
        ))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(mandiriKegiatanDaerah)
          .set({ isActive: isActive ? 1 : 0 })
          .where(eq(mandiriKegiatanDaerah.id, existing[0].id));
      } else {
        await db.insert(mandiriKegiatanDaerah).values({
          id: uuidv4(),
          kegiatanId,
          daerahId: Number(id),
          isActive: isActive ? 1 : 0,
        });
      }
      return NextResponse.json({ success: true });
    }

    if (!id || !nama || !nama.trim()) return NextResponse.json({ error: "ID dan nama daerah wajib diisi" }, { status: 400 });
    await db.update(mandiriDaerah).set({ nama: nama.trim() }).where(eq(mandiriDaerah.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengupdate data daerah" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    
    await db.delete(mandiriDaerah).where(eq(mandiriDaerah.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus data daerah" }, { status: 500 });
  }
}
