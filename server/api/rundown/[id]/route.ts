import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rundown } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !["admin_kegiatan", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { waktu, agenda, pic, keterangan } = body;

    await db.update(rundown)
      .set({ waktu, agenda, pic, keterangan, updatedAt: new Date().toISOString() })
      .where(eq(rundown.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rundown PUT error:", error);
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !["admin_kegiatan", "kmm_daerah", "admin"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await db.delete(rundown).where(eq(rundown.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rundown DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
