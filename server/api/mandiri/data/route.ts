export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, generus, mandiri, mandiriDesa, mandiriKelompok, mandiriDaerah } from "@/lib/schema";
import { eq, and, or, like, sql, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "pengurus_daerah", "kmm_daerah", "admin_keuangan"];
    if (!allowedRoles.includes(session.role)) {
       return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Optimized Data Query
    const dataQuery = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        generusId: users.generusId,
        mandiriDesaNama: mandiriDesa.nama,
        mandiriDesaKota: mandiriDaerah.nama,
        mandiriKelompokNama: mandiriKelompok.nama,
        createdAt: users.createdAt,
        nomorUnik: generus.nomorUnik,
      })
      .from(users)
      .innerJoin(generus, eq(users.generusId, generus.id))
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(mandiriDesa, eq(users.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .leftJoin(mandiriKelompok, eq(users.mandiriKelompokId, mandiriKelompok.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt));

    // Optimized Count Query
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .innerJoin(mandiri, eq(users.generusId, mandiri.generusId));

    const [data, countResult] = await Promise.all([
      dataQuery,
      countQuery.where(whereClause)
    ]);

    return NextResponse.json({
      data,
      total: Number(countResult[0]?.count || 0),
      page,
      limit,
    }, {
      headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" }
    });
  } catch (error) {
    console.error("Mandiri Data GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data akun mandiri" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "pengurus_daerah", "kmm_daerah"];
    if (!allowedRoles.includes(session.role)) {
       return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { id, name, email } = await request.json();

    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();

    await db.update(users).set(updateData).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mandiri Data PUT error:", error);
    return NextResponse.json({ error: "Gagal mengupdate akun" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "pengurus_daerah", "kmm_daerah"];
    if (!allowedRoles.includes(session.role)) {
       return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    // We only delete the user account, keeping the generus and mandiri record
    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mandiri Data DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus akun" }, { status: 500 });
  }
}
