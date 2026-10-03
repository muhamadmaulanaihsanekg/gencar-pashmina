export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artikel } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const data = await db.query.artikel.findFirst({ 
      where: and(eq(artikel.id, id), eq(artikel.tipe, "berita")) 
    });
    if (!data) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    if (data.status !== "published") {
      const session = await getSession();
      if (!session || (session.userId !== data.authorId && !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role))) {
        return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
      }
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const body = await request.json();
    const { judul, konten, ringkasan, status, coverImage } = body;

    const existing = await db.query.artikel.findFirst({ 
      where: and(eq(artikel.id, id), eq(artikel.tipe, "berita")) 
    });
    if (!existing) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    // Only admin can change status
    if (status && !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }

    // Only author or admin can edit content
    if (existing.authorId !== session.userId && !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }

    const updateData: Record<string, string | null | undefined> = {
      updatedAt: new Date().toISOString(),
    };

    if (judul !== undefined) updateData.judul = judul;
    if (konten !== undefined) updateData.konten = konten;
    if (ringkasan !== undefined) updateData.ringkasan = ringkasan;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    
    // If creator edits, reset status to pending
    if (session.role === "creator") {
      updateData.status = "pending";
    }

    if (status !== undefined && ["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      updateData.status = status;
      if (status === "published") {
        updateData.publishedAt = new Date().toISOString();
      }
    }

    await db.update(artikel).set(updateData).where(and(eq(artikel.id, id), eq(artikel.tipe, "berita")));

    const updated = await db.query.artikel.findFirst({ where: eq(artikel.id, id) });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengupdate berita" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const existing = await db.query.artikel.findFirst({ 
      where: and(eq(artikel.id, id), eq(artikel.tipe, "berita")) 
    });
    if (!existing) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    if (existing.authorId !== session.userId && !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }

    await db.delete(artikel).where(and(eq(artikel.id, id), eq(artikel.tipe, "berita")));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus berita" }, { status: 500 });
  }
}
