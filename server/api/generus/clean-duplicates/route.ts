import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, users, absensi } from "@/lib/schema";
import { eq, inArray, sql, count, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "pengurus_daerah")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find potential duplicates: same name, desa_id, and kelompok_id
    const potentialDuplicates = await db.run(sql`
      SELECT g.id, g.nama, g.nomor_unik as nomorUnik, g.no_telp as noTelp, 
             d.nama as desaNama, k.nama as kelompokNama, g.created_at as createdAt
      FROM generus g
      LEFT JOIN desa d ON g.desa_id = d.id
      LEFT JOIN kelompok k ON g.kelompok_id = k.id
      WHERE (g.nama, g.desa_id, g.kelompok_id) IN (
        SELECT nama, desa_id, kelompok_id 
        FROM generus 
        GROUP BY nama, desa_id, kelompok_id 
        HAVING count(*) > 1
      )
      ORDER BY g.nama ASC, g.created_at ASC
    `);

    const members = potentialDuplicates.rows as any[];
    
    // Group them for the UI
    const groupsMap = new Map<string, any[]>();
    for (const m of members) {
      const key = `${m.nama.toLowerCase().trim()}|${m.desaNama}|${m.kelompokNama}`;
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(m);
    }

    const data = Array.from(groupsMap.entries()).map(([key, items]) => {
      const parts = key.split('|');
      return {
        type: "Nama & Lokasi Sama",
        value: `${parts[0]} (${parts[1]} - ${parts[2]})`,
        items
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Preview duplicates error:", error);
    return NextResponse.json({ error: "Gagal mengambil data duplikat." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "pengurus_daerah")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting hyper-optimized duplicate cleanup...");

    // 1. Find all members of groups that have duplicates in ONE query
    const potentialDuplicates = await db.run(sql`
      SELECT id, nama, desa_id as desaId, kelompok_id as kelompokId, foto, created_at as createdAt 
      FROM generus 
      WHERE (nama, desa_id, kelompok_id) IN (
        SELECT nama, desa_id, kelompok_id 
        FROM generus 
        GROUP BY nama, desa_id, kelompok_id 
        HAVING count(*) > 1
      )
    `);

    const members = potentialDuplicates.rows as any[];
    if (members.length === 0) {
      return NextResponse.json({ success: true, message: "Tidak ditemukan data duplikat.", cleanedCount: 0 });
    }

    const memberIds = members.map(m => m.id);

    // 2. Fetch all linked data for potential duplicates in one go
    const [linkedUsers, absensiCounts] = await Promise.all([
      db.select({ id: users.id, generusId: users.generusId }).from(users).where(inArray(users.generusId, memberIds)),
      db.select({ generusId: absensi.generusId, cnt: count() }).from(absensi).where(inArray(absensi.generusId, memberIds)).groupBy(absensi.generusId)
    ]);

    // 3. Group and process in memory
    const groups = new Map<string, any[]>();
    for (const m of members) {
      const key = `${m.nama.toLowerCase().trim()}|${m.desaId}|${m.kelompokId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }

    let cleanedCount = 0;
    const toDeleteIds: string[] = [];
    const reassignUsers: { oldId: string, keepId: string }[] = [];
    const reassignAbsensi: { oldId: string, keepId: string }[] = [];

    for (const [key, groupMembers] of Array.from(groups.entries())) {
      if (groupMembers.length <= 1) continue;

      const sorted = groupMembers.sort((a, b) => {
        const hasUserA = linkedUsers.some(u => u.generusId === a.id) ? 1 : 0;
        const hasUserB = linkedUsers.some(u => u.generusId === b.id) ? 1 : 0;
        if (hasUserA !== hasUserB) return hasUserB - hasUserA;

        const absA = (absensiCounts.find(ac => ac.generusId === a.id) as any)?.cnt || 0;
        const absB = (absensiCounts.find(ac => ac.generusId === b.id) as any)?.cnt || 0;
        if (absA !== absB) return absB - absA;

        const hasFotoA = a.foto ? 1 : 0;
        const hasFotoB = b.foto ? 1 : 0;
        if (hasFotoA !== hasFotoB) return hasFotoB - hasFotoA;

        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });

      const keep = sorted[0];
      const duplicates = sorted.slice(1);
      
      for (const d of duplicates) {
        reassignUsers.push({ oldId: d.id, keepId: keep.id });
        reassignAbsensi.push({ oldId: d.id, keepId: keep.id });
        toDeleteIds.push(d.id);
        cleanedCount++;
      }
    }

    // 4. Batch update and delete in as few queries as possible using transaction
    await db.transaction(async (tx) => {
      // For each target keepId, we do one bulk update for its duplicates
      const userUpdatesByKeep = new Map<string, string[]>();
      reassignUsers.forEach(r => {
        if (!userUpdatesByKeep.has(r.keepId)) userUpdatesByKeep.set(r.keepId, []);
        userUpdatesByKeep.get(r.keepId)!.push(r.oldId);
      });

      for (const [keepId, oldIds] of Array.from(userUpdatesByKeep.entries())) {
        await tx.update(users).set({ generusId: keepId }).where(inArray(users.generusId, oldIds));
      }

      const absUpdatesByKeep = new Map<string, string[]>();
      reassignAbsensi.forEach(r => {
        if (!absUpdatesByKeep.has(r.keepId)) absUpdatesByKeep.set(r.keepId, []);
        absUpdatesByKeep.get(r.keepId)!.push(r.oldId);
      });

      for (const [keepId, oldIds] of Array.from(absUpdatesByKeep.entries())) {
        await tx.update(absensi).set({ generusId: keepId }).where(inArray(absensi.generusId, oldIds));
      }

      if (toDeleteIds.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < toDeleteIds.length; i += chunkSize) {
          const chunk = toDeleteIds.slice(i, i + chunkSize);
          await tx.delete(generus).where(inArray(generus.id, chunk));
        }
      }
    });

    revalidatePath("/(dashboard)/generus", "page");
    const duration = Date.now() - startTime;
    console.log(`Hyper-Optimization: Cleanup took ${duration}ms`);

    return NextResponse.json({ 
      success: true, 
      message: `${cleanedCount} data duplikat berhasil dibersihkan dalam ${duration}ms.`,
      cleanedCount,
      duration 
    });

  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Gagal membersihkan data." }, { status: 500 });
  }
}
