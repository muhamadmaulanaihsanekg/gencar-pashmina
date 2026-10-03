
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiri, mandiriDesa, mandiriKelompok, mandiriDaerah, settings } from "@/lib/schema";
import { eq, isNotNull, and, sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reqKegiatanId = searchParams.get("kegiatanId");
    
    let kegiatanId = reqKegiatanId;
    if (kegiatanId === "semua" || kegiatanId === "all" || kegiatanId === "undefined" || kegiatanId === "null") {
      kegiatanId = "";
    } else if (!kegiatanId) {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      kegiatanId = activeSetting[0]?.value || "";
    }

    // Fetch unique pendidikan from registered participants (data pendaftar) depending on kegiatan
    const pendidikanResult = await db
      .select({ value: generus.pendidikan })
      .from(generus)
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .where(kegiatanId ? and(isNotNull(generus.pendidikan), eq(mandiri.kegiatanId, kegiatanId)) : isNotNull(generus.pendidikan))
      .groupBy(generus.pendidikan);
    
    const pendidikan = pendidikanResult
      .map(r => {
        if (!r.value) return "";
        let val = r.value.trim().toUpperCase();
        
        // Match common patterns like S1, D3, SMA, etc.
        const jenjangMatch = val.match(/^(S\s*[1-3]|D\s*[1-4]|SMA|SMK|SMP|SD|MI|MTS|MA|TK|PAUD)/i);
        
        if (jenjangMatch) {
          return jenjangMatch[0].replace(/[\s\.]/g, '');
        }
        
        const parts = val.split(/[\s\-\(\),]+/);
        return parts[0];
      })
      .filter(v => v !== "")
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .sort((a, b) => {
        const order = ["PAUD", "TK", "SD", "MI", "SMP", "MTS", "SMA", "MA", "SMK", "D1", "D2", "D3", "D4", "S1", "S2", "S3"];
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

    // Helper for clustering text
    const clusterText = (data: any[], key: string) => {
      const map = new Map<string, string>();
      data.forEach(r => {
        if (!r[key]) return;
        // split by common separators if needed, or just normalize
        const vals = r[key].split(/[\/,;]/);
        vals.forEach((v: string) => {
          let trimmed = v.trim();
          if (!trimmed) return;
          // Normalize for comparison
          let normalized = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
          if (!normalized) return;
          // Keep the first formatted version we see
          if (!map.has(normalized)) {
            // Capitalize first letter of each word
            const formatted = trimmed.replace(/\b\w/g, l => l.toUpperCase());
            map.set(normalized, formatted);
          }
        });
      });
      return Array.from(map.values()).sort();
    };

    // Fetch all needed textual fields in one go
    const textDataResult = await db
      .select({ 
        pekerjaan: generus.pekerjaan,
        kriteriaPasangan: generus.kriteriaPasangan,
        hobi: generus.hobi,
        makanan: generus.makananMinumanFavorit,
        suku: generus.suku,
        tanggalLahir: generus.tanggalLahir
      })
      .from(generus)
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .where(kegiatanId ? eq(mandiri.kegiatanId, kegiatanId) : sql`1=1`);

    const pekerjaan = clusterText(textDataResult, "pekerjaan");
    const kriteriaPasangan = clusterText(textDataResult, "kriteriaPasangan");
    const hobi = clusterText(textDataResult, "hobi");
    const makanan = clusterText(textDataResult, "makanan");
    const suku = clusterText(textDataResult, "suku");

    // Calculate unique Umur
    const umurSet = new Set<number>();
    textDataResult.forEach(r => {
      if (r.tanggalLahir) {
        const birthDate = new Date(r.tanggalLahir);
        if (!isNaN(birthDate.getTime())) {
          const age = new Date().getFullYear() - birthDate.getFullYear();
          if (age > 0 && age < 100) umurSet.add(age);
        }
      }
    });
    const umur = Array.from(umurSet).sort((a, b) => a - b);

    const kotaResult = await db
      .select({ 
        kota: mandiriDaerah.nama 
      })
      .from(mandiriDesa)
      .innerJoin(generus, eq(generus.mandiriDesaId, mandiriDesa.id))
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(kegiatanId ? eq(mandiri.kegiatanId, kegiatanId) : sql`1=1`)
      .groupBy(mandiriDaerah.nama)
      .orderBy(mandiriDaerah.nama);

    const kota = kotaResult.map(r => r.kota).filter(Boolean);

    // Fetch unique mandiriDesa (Wilayah/Desa Mandiri) from registered participants
    const wilayahResult = await db
      .select({ 
        id: mandiriDesa.id, 
        nama: mandiriDesa.nama,
        kota: mandiriDaerah.nama
      })
      .from(mandiriDesa)
      .innerJoin(generus, eq(generus.mandiriDesaId, mandiriDesa.id))
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(kegiatanId ? eq(mandiri.kegiatanId, kegiatanId) : sql`1=1`)
      .groupBy(mandiriDesa.id, mandiriDesa.nama, mandiriDaerah.nama)
      .orderBy(mandiriDesa.nama);

    // Fetch unique kelompok
    const kelompokResult = await db
      .select({ 
        id: mandiriKelompok.id, 
        nama: mandiriKelompok.nama,
        desaId: mandiriDesa.id
      })
      .from(mandiriKelompok)
      .innerJoin(generus, eq(generus.mandiriKelompokId, mandiriKelompok.id))
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .innerJoin(mandiriDesa, eq(mandiriKelompok.mandiriDesaId, mandiriDesa.id))
      .where(kegiatanId ? eq(mandiri.kegiatanId, kegiatanId) : sql`1=1`)
      .groupBy(mandiriKelompok.id, mandiriKelompok.nama, mandiriDesa.id)
      .orderBy(mandiriKelompok.nama);

    return NextResponse.json({
      pendidikan,
      kota,
      wilayah: wilayahResult,
      kelompok: kelompokResult,
      pekerjaan,
      kriteriaPasangan,
      hobi,
      makanan,
      suku,
      umur
    });
  } catch (error) {
    console.error("Public Filters GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
