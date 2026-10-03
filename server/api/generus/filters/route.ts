
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiriDesa, mandiri, mandiriKelompok, mandiriDaerah } from "@/lib/schema";
import { sql, eq, isNotNull, exists } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Fetch unique pendidikan from registered participants (data pendaftar)
    const pendidikanResult = await db
      .select({ value: generus.pendidikan })
      .from(generus)
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .where(isNotNull(generus.pendidikan))
      .groupBy(generus.pendidikan);
    
    const pendidikan = pendidikanResult
      .map(r => {
        if (!r.value) return "";
        // Extract level (jenjang)
        // 1. Trim and uppercase
        let val = r.value.trim().toUpperCase();
        
        // 2. Handle common patterns like S1, D3, etc. at the start
        // Try to capture patterns like S1, D3, SMA, SMK, etc.
        const jenjangMatch = val.match(/^(S\s*[1-3]|D\s*[1-4]|SMA|SMK|SMP|SD|MI|MTS|MA|TK|PAUD)/i);
        
        if (jenjangMatch) {
          // Normalize: remove spaces or dots between S/D and number
          return jenjangMatch[0].replace(/[\s\.]/g, '');
        }
        
        // 3. Fallback: Take first word before space, dash, or paren
        const parts = val.split(/[\s\-\(\),]+/);
        return parts[0];
      })
      .filter(v => v !== "")
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .sort((a, b) => {
        // Logical sort order for Indonesian education
        const order = ["PAUD", "TK", "SD", "MI", "SMP", "MTS", "SMA", "MA", "SMK", "D1", "D2", "D3", "D4", "S1", "S2", "S3"];
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

    const daerahResult = await db
      .select({ 
        id: mandiriDaerah.id,
        nama: mandiriDaerah.nama,
      })
      .from(mandiriDaerah)
      .orderBy(mandiriDaerah.nama);

    const desaResult = await db
      .select({ 
        id: mandiriDesa.id,
        nama: mandiriDesa.nama,
        daerahId: mandiriDesa.mandiriDaerahId,
      })
      .from(mandiriDesa)
      .orderBy(mandiriDesa.nama);

    const kelompokResult = await db
      .select({ 
        id: mandiriKelompok.id,
        nama: mandiriKelompok.nama,
        desaId: mandiriKelompok.mandiriDesaId,
      })
      .from(mandiriKelompok)
      .orderBy(mandiriKelompok.nama);

    // 3. Official Desa from database
    const { desa: officialDesaTable } = await import("@/lib/schema");
    const desaResultActual = await db
      .select({ id: officialDesaTable.id, nama: officialDesaTable.nama })
      .from(officialDesaTable)
      .innerJoin(generus, eq(generus.desaId, officialDesaTable.id))
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .groupBy(officialDesaTable.id, officialDesaTable.nama)
      .orderBy(officialDesaTable.nama);

    return NextResponse.json({
      pendidikan,
      daerahs: daerahResult,
      desas: desaResult,
      kelompoks: kelompokResult
    });
  } catch (error) {
    console.error("Filters GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
