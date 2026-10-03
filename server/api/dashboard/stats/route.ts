export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, kegiatan, artikel, users } from "@/lib/schema";
import { eq, sql, and, or, isNull, not } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Build filters based on role
    const desaFilter = session.role === "desa" && session.desaId ? eq(generus.desaId, session.desaId) : undefined;
    const kelompokFilter = session.role === "kelompok" && session.kelompokId ? eq(generus.kelompokId, session.kelompokId) : undefined;
    const generusFilter = desaFilter || kelompokFilter;

    // Exclude special roles from reports
    const roleExcludeFilter = or(
      isNull(users.role),
      and(
        not(eq(users.role, "admin")),
        not(eq(users.role, "pengurus_daerah")),
        not(eq(users.role, "kmm_daerah")),
        not(eq(users.role, "creator"))
      )
    );

    const finalGenerusFilter = generusFilter 
      ? and(generusFilter, roleExcludeFilter, eq(generus.isGenerus, 1)) 
      : and(roleExcludeFilter, eq(generus.isGenerus, 1));

    let artikelAuthorConditions = [];
    if (["desa", "kelompok", "creator"].includes(session.role)) {
      if (session.desaId && (session.role === "desa" || session.role === "creator")) {
        artikelAuthorConditions.push(eq(users.desaId, session.desaId));
      }
      if (session.kelompokId && (session.role === "kelompok" || session.role === "creator")) {
        artikelAuthorConditions.push(eq(users.kelompokId, session.kelompokId));
      }
    }
    const artikelAuthorFilter = artikelAuthorConditions.length > 0 ? and(...artikelAuthorConditions) : undefined;

    const [generusCount, kegiatanCount, artikelCount, userCount, marriedCount, notMarriedCount] = await Promise.all([
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` }).from(generus).leftJoin(users, eq(generus.id, users.generusId)).where(finalGenerusFilter),
      db.select({ count: sql<number>`count(*)` }).from(kegiatan),
      db.select({ count: sql<number>`count(*)` })
        .from(artikel)
        .leftJoin(users, eq(artikel.authorId, users.id))
        .where(
          artikelAuthorFilter 
            ? and(eq(artikel.status, "published"), artikelAuthorFilter)
            : eq(artikel.status, "published")
        ),
      ["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)
        ? db.select({ count: sql<number>`count(*)` }).from(users)
        : Promise.resolve([{ count: 0 }]),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.statusNikah, "Menikah"))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.statusNikah, "Belum Menikah"))),
    ]);

    return NextResponse.json({
      generus: Number(generusCount[0].count),
      kegiatan: Number(kegiatanCount[0].count),
      artikel: Number(artikelCount[0].count),
      users: Number(userCount[0].count),
      married: Number(marriedCount[0].count),
      notMarried: Number(notMarriedCount[0].count),
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Gagal mengambil statistik" }, { status: 500 });
  }
}
