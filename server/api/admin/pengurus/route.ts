
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organisasiPengurus } from "@/lib/schema";
import { eq, asc, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await db
      .select()
      .from(organisasiPengurus)
      .orderBy(asc(organisasiPengurus.urutan), desc(organisasiPengurus.createdAt));
      
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data pengurus" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { nama, dapukan, foto, urutan } = await request.json();
    if (!nama || !dapukan) {
      return NextResponse.json({ error: "Nama dan dapukan wajib diisi" }, { status: 400 });
    }

    const newId = crypto.randomUUID();
    await db.insert(organisasiPengurus).values({
      id: newId,
      nama,
      dapukan,
      foto: foto || null,
      urutan: urutan !== undefined ? Number(urutan) : 0,
    });

    return NextResponse.json({ success: true, id: newId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan data pengurus" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, nama, dapukan, foto, urutan } = await request.json();
    if (!id || !nama || !dapukan) {
      return NextResponse.json({ error: "ID, nama, dan dapukan wajib diisi" }, { status: 400 });
    }

    await db
      .update(organisasiPengurus)
      .set({
        nama,
        dapukan,
        foto: foto || null,
        urutan: urutan !== undefined ? Number(urutan) : 0,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(organisasiPengurus.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memperbarui data pengurus" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    await db.delete(organisasiPengurus).where(eq(organisasiPengurus.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus data pengurus" }, { status: 500 });
  }
}
