export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriDaerah, mandiriDesa, mandiriKelompok, settings, mandiriKegiatanDaerah } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, nama, parentId, kota } = body; // type: 'daerah' | 'desa' | 'kelompok'

    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    }

    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const activeKegiatanId = activeSetting[0]?.value;

    if (type === "daerah") {
      let daerahId = null;
      let daerahNama = nama.trim();

      const existing = await db.select()
        .from(mandiriDaerah)
        .where(eq(mandiriDaerah.nama, nama.trim()))
        .limit(1);
      
      if (existing.length > 0) {
        daerahId = existing[0].id;
      } else {
        const result = await db.insert(mandiriDaerah).values({ nama: nama.trim() }).returning({ id: mandiriDaerah.id });
        daerahId = result[0].id;
      }

      if (activeKegiatanId && daerahId) {
        const existingMapping = await db.select()
          .from(mandiriKegiatanDaerah)
          .where(and(
            eq(mandiriKegiatanDaerah.daerahId, daerahId),
            eq(mandiriKegiatanDaerah.kegiatanId, activeKegiatanId)
          ))
          .limit(1);
        
        if (existingMapping.length === 0) {
          const { v4: uuidv4 } = require("uuid");
          await db.insert(mandiriKegiatanDaerah).values({
            id: uuidv4(),
            kegiatanId: activeKegiatanId,
            daerahId: daerahId,
            isActive: 0, // Pending verification
          });
        }
      }

      return NextResponse.json({ id: daerahId, nama: daerahNama });
    }

    if (type === "desa") {
      let daerahId = parentId;
      if (!daerahId && kota) {
        const d = await db.select().from(mandiriDaerah).where(eq(mandiriDaerah.nama, kota.trim())).limit(1);
        if (d.length > 0) {
          daerahId = d[0].id;
        } else {
          const newD = await db.insert(mandiriDaerah).values({ nama: kota.trim() }).returning({ id: mandiriDaerah.id });
          daerahId = newD[0].id;
        }
      }

      if (!daerahId) {
        return NextResponse.json({ error: "Daerah induk tidak ditemukan" }, { status: 400 });
      }

      const existing = await db.select()
        .from(mandiriDesa)
        .where(and(
          eq(mandiriDesa.nama, nama.trim()),
          eq(mandiriDesa.mandiriDaerahId, Number(daerahId))
        ))
        .limit(1);
      if (existing.length > 0) {
        return NextResponse.json({ id: existing[0].id, nama: existing[0].nama });
      }

      const result = await db.insert(mandiriDesa).values({
        nama: nama.trim(),
        mandiriDaerahId: Number(daerahId)
      }).returning({ id: mandiriDesa.id });

      return NextResponse.json({ id: result[0].id, nama: nama.trim() });
    }

    if (type === "kelompok") {
      if (!parentId) {
        return NextResponse.json({ error: "Desa induk diperlukan" }, { status: 400 });
      }

      const existing = await db.select()
        .from(mandiriKelompok)
        .where(and(
          eq(mandiriKelompok.nama, nama.trim()),
          eq(mandiriKelompok.mandiriDesaId, Number(parentId))
        ))
        .limit(1);
      if (existing.length > 0) {
        return NextResponse.json({ id: existing[0].id, nama: existing[0].nama });
      }

      const result = await db.insert(mandiriKelompok).values({
        nama: nama.trim(),
        mandiriDesaId: Number(parentId)
      }).returning({ id: mandiriKelompok.id });

      return NextResponse.json({ id: result[0].id, nama: nama.trim() });
    }

    return NextResponse.json({ error: "Tipe wilayah tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("Public Wilayah Create error:", error);
    return NextResponse.json({ error: "Gagal menyimpan wilayah baru" }, { status: 500 });
  }
}
