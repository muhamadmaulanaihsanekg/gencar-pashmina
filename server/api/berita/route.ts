export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artikel, users } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const session = await getSession();

    let whereClause;
    const isStatusMatch = status ? eq(artikel.status, status as any) : undefined;
    const isTypeMatch = eq(artikel.tipe, "berita");

    if (status === "published") {
      whereClause = and(eq(artikel.status, "published"), isTypeMatch);
    } else if (session && ["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      whereClause = and(isStatusMatch, isTypeMatch);
    } else if (session) {
      whereClause = and(eq(artikel.authorId, session.userId), isTypeMatch);
    } else {
      whereClause = and(eq(artikel.status, "published"), isTypeMatch);
    }

    const data = await db
      .select({
        id: artikel.id,
        judul: artikel.judul,
        ringkasan: artikel.ringkasan,
        tipe: artikel.tipe,
        status: artikel.status,
        authorId: artikel.authorId,
        authorName: users.name,
        publishedAt: artikel.publishedAt,
        createdAt: artikel.createdAt,
      })
      .from(artikel)
      .leftJoin(users, eq(artikel.authorId, users.id))
      .where(whereClause)
      .orderBy(sql`${artikel.createdAt} DESC`);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Berita GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["admin", "pengurus_daerah", "kmm_daerah", "creator", "desa", "kelompok"].includes(session.role)) {
      return NextResponse.json({ error: "Role Anda tidak diizinkan untuk menulis berita" }, { status: 403 });
    }

    const body = await request.json();
    const { judul, konten, ringkasan, coverImage } = body;

    if (!judul || !konten) {
      return NextResponse.json({ error: "Judul dan konten wajib diisi" }, { status: 400 });
    }

    const id = uuidv4();
    await db.insert(artikel).values({
      id,
      judul,
      konten,
      ringkasan,
      coverImage,
      tipe: "berita",
      status: "pending",
      authorId: session.userId,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Berita POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan berita" }, { status: 500 });
  }
}
