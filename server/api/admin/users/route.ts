
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, desa, kelompok, generus, mandiri } from "@/lib/schema";
import { eq, or, like, sql, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { encryptPasswordSymmetric } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const roleParam = searchParams.get("role");
    const desaIdParam = searchParams.get("desaId");
    const kelompokIdParam = searchParams.get("kelompokId");
    const statusNikahParam = searchParams.get("statusNikah");
    const kategoriUsiaParam = searchParams.get("kategoriUsia");

    const conditions = [];
    if (search) {
      conditions.push(or(
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`)
      ));
    }
    if (roleParam) {
      conditions.push(eq(users.role, roleParam as any));
    }
    if (desaIdParam) {
      conditions.push(eq(users.desaId, Number(desaIdParam)));
    }
    if (kelompokIdParam) {
      conditions.push(eq(users.kelompokId, Number(kelompokIdParam)));
    }
    if (statusNikahParam && statusNikahParam !== "all") {
      conditions.push(eq(generus.statusNikah, statusNikahParam as any));
    }
    if (kategoriUsiaParam && kategoriUsiaParam !== "all") {
      conditions.push(eq(generus.kategoriUsia, kategoriUsiaParam as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const isAll = searchParams.get("all") === "true";

    // EXPORT MODE: High Speed
    if (isAll) {
      const data = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          desaNama: desa.nama,
          kelompokNama: kelompok.nama,
        })
        .from(users)
        .leftJoin(generus, eq(users.generusId, generus.id))
        .leftJoin(desa, eq(users.desaId, desa.id))
        .leftJoin(kelompok, eq(users.kelompokId, kelompok.id))
        .where(whereClause)
        .orderBy(users.name);

      if (searchParams.get("format") === "csv") {
        const csvHeader = "Nama Lengkap,Desa,Kelompok,Email,Password Default\n";
        const csvRows = data.map(u => 
          `"${u.name.replace(/"/g, '""')}","${(u.desaNama || "-").replace(/"/g, '""')}","${(u.kelompokNama || "-").replace(/"/g, '""')}","${u.email.replace(/"/g, '""')}","generusjb2"`
        ).join("\n");

        const filename = `Data_User_Admin_${Date.now()}.csv`;
        return new Response(csvHeader + csvRows, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }

      return NextResponse.json({ data, total: data.length, page: 1, limit: data.length }, {
        headers: { "Cache-Control": "private, max-age=60" }
      });
    }

    // LIST MODE: Paginated (Optimized Parallel Execution)
    const dataQuery = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        desaId: users.desaId,
        kelompokId: users.kelompokId,
        createdAt: users.createdAt,
        generusNomorUnik: generus.nomorUnik,
        isMandiri: sql<number>`CASE WHEN ${mandiri.id} IS NOT NULL THEN 1 ELSE 0 END`,
        mandiriStatus: mandiri.statusMandiri,
        mandiriNomorUrut: mandiri.nomorUrut
      })
      .from(users)
      .leftJoin(generus, eq(users.generusId, generus.id))
      .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
      .where(whereClause)
      .orderBy(users.name)
      .limit(limit)
      .offset(offset);

    let countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
    if (statusNikahParam || kategoriUsiaParam) {
      countQuery = countQuery.leftJoin(generus, eq(users.generusId, generus.id)) as any;
    }
    countQuery = countQuery.where(whereClause) as any;

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    
    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({ data, total, page, limit }, {
      headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, role, desaId, kelompokId, name, email, password } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    let generusId = user.generusId;

    const needsGenerusProfile = ["generus", "peserta", "creator", "usia_mandiri"].includes(role);
    if (needsGenerusProfile && !generusId) {
      generusId = uuidv4();
      const prefix = role === "creator" ? "C" : role === "peserta" ? "P" : "G";
      const nomorUnik = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
      
      let finalDesaId = desaId ? Number(desaId) : user.desaId;
      let finalKelompokId = kelompokId ? Number(kelompokId) : user.kelompokId;

      if (!finalDesaId || !finalKelompokId) {
        const firstDesa = await db.query.desa.findFirst();
        if (firstDesa) {
          finalDesaId = finalDesaId || firstDesa.id;
          const firstKelompok = await db.query.kelompok.findFirst({
            where: eq(kelompok.desaId, firstDesa.id)
          });
          if (firstKelompok) finalKelompokId = finalKelompokId || firstKelompok.id;
        }
      }

      await db.insert(generus).values({
        id: generusId,
        nomorUnik,
        nama: user.name,
        jenisKelamin: "L", // Default, user can update later
        kategoriUsia: "SMA", // Default
        desaId: finalDesaId || 1, // Final fallback to 1 as last resort
        kelompokId: finalKelompokId || 1,
        createdBy: session.userId,
      });
    }

    const updatePayload: any = { 
      role: role || user.role, 
      generusId 
    };

    if (desaId !== undefined) updatePayload.desaId = desaId ? Number(desaId) : null;
    if (kelompokId !== undefined) updatePayload.kelompokId = kelompokId ? Number(kelompokId) : null;
    if (name) updatePayload.name = name;
    if (email) updatePayload.email = email.toLowerCase();
    if (password) {
      updatePayload.passwordHash = await bcrypt.hash(password, 12);
      updatePayload.passwordPlain = encryptPasswordSymmetric(password);
    }

    await db.update(users).set(updatePayload).where(eq(users.id, id));
    
    // Sinkronkan ke generus jika user memiliki generusId
    if (generusId) {
      const updateData: any = { nama: user.name };
      const gDesaId = desaId ? Number(desaId) : user.desaId;
      const gKelompokId = kelompokId ? Number(kelompokId) : user.kelompokId;
      
      if (gDesaId) updateData.desaId = gDesaId;
      if (gKelompokId) updateData.kelompokId = gKelompokId;

      await db
        .update(generus)
        .set(updateData)
        .where(eq(generus.id, generusId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
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
    const role = searchParams.get("role");
    
    if (id) {
      await db.delete(users).where(eq(users.id, id));
      return NextResponse.json({ success: true });
    } else if (role) {
      await db.delete(users).where(eq(users.role, role as any));
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "ID atau Role diperlukan" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, password, role, desaId, kelompokId } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Nama, email, password, dan role wajib diisi" }, { status: 400 });
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();

    // Auto-create Generus profile if role implies it, but here we can just create a basic profile for everyone or conditionally.
    // For simplicity, let's create a generus profile if the role is generus, kelompok, desa, or pengurus_daerah, like in auth/register.
    // Actually, maybe we shouldn't force generus creation for every single role like creator/admin.
    let generusId = null;
    const isGenerusRole = ["generus", "kelompok", "desa", "pengurus_daerah", "usia_mandiri"].includes(role);
    
    if (isGenerusRole) {
        generusId = uuidv4();
        const prefix = role === "generus" ? "G" : "P";
        const nomorUnik = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

        await db.insert(generus).values({
          id: generusId,
          nomorUnik,
          nama: name,
          jenisKelamin: "L", // Defaulting to L
          kategoriUsia: "SMA", // Default
          desaId: Number(desaId) || null,
          kelompokId: Number(kelompokId) || null,
          isGenerus: 1, 
        });
    }

    await db.insert(users).values({
      id,
      name,
      email: email.toLowerCase(),
      passwordHash,
      passwordPlain: encryptPasswordSymmetric(password),
      role: role,
      desaId: Number(desaId) || null,
      kelompokId: Number(kelompokId) || null,
      generusId: generusId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
