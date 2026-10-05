export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings, mandiriKegiatan, kegiatan } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || "mandiri_registration_deadline";
    
    // Fetch manual setting
    const data = await db.select().from(settings).where(eq(settings.key, key));
    
    // Fallback logic for Mandiri
    if (key === "mandiri_registration_title" && !data[0]?.value) {
        const latest = await db.select({ value: mandiriKegiatan.judul }).from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
        return NextResponse.json({ key, value: latest[0]?.value || "Peserta Mandiri" });
    }
    if (key === "mandiri_registration_description" && !data[0]?.value) {
        const latest = await db.select({ value: mandiriKegiatan.deskripsi }).from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
        return NextResponse.json({ key, value: latest[0]?.value || "" });
    }
    if (key === "mandiri_registration_location" && !data[0]?.value) {
        const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
        const targetId = activeSetting[0]?.value;
        if (targetId) {
            const active = await db.select({ value: mandiriKegiatan.lokasi }).from(mandiriKegiatan).where(eq(mandiriKegiatan.id, targetId)).limit(1);
            if (active[0]?.value) return NextResponse.json({ key, value: active[0].value });
        }
        const latest = await db.select({ value: mandiriKegiatan.lokasi }).from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
        return NextResponse.json({ key, value: latest[0]?.value || "" });
    }

    // Fallback logic for Generus
    if (key === "generus_registration_title" && !data[0]?.value) {
        const latest = await db.select({ value: kegiatan.judul }).from(kegiatan).orderBy(desc(kegiatan.tanggal)).limit(1);
        return NextResponse.json({ key, value: latest[0]?.value || "Daftar Peserta" });
    }
    if (key === "generus_registration_description" && !data[0]?.value) {
        const latest = await db.select({ value: kegiatan.deskripsi }).from(kegiatan).orderBy(desc(kegiatan.tanggal)).limit(1);
        return NextResponse.json({ key, value: latest[0]?.value || "" });
    }
    
    return NextResponse.json(data[0] || { key, value: "" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { key, value } = await request.json();
    if (!key) return NextResponse.json({ error: "Key diperlukan" }, { status: 400 });
    
    // Upsert Settings
    const existing = await db.select().from(settings).where(eq(settings.key, key));
    if (existing.length > 0) {
      await db.update(settings).set({ value, updatedAt: new Date().toISOString() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }

    // Synchronization logic for Kegiatan
    if (key.startsWith("generus_registration_")) {
        const field = key.replace("generus_registration_", "");
        const latestArr = await db.select().from(kegiatan).orderBy(desc(kegiatan.tanggal)).limit(1);
        if (latestArr[0]) {
            const updateField = field === "title" ? { judul: value } : field === "description" ? { deskripsi: value } : null;
            if (updateField) {
                await db.update(kegiatan).set(updateField).where(eq(kegiatan.id, latestArr[0].id));
            }
        }
    } else if (key.startsWith("mandiri_registration_")) {
        const field = key.replace("mandiri_registration_", "");
        const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
        const activeKegiatanId = activeSetting[0]?.value;
        let targetActivityId = activeKegiatanId;
        if (!targetActivityId) {
            const latestArr = await db.select().from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
            targetActivityId = latestArr[0]?.id;
        }
        if (targetActivityId) {
            const updateField =
              field === "title"
                ? { judul: value }
                : field === "description"
                  ? { deskripsi: value }
                  : field === "location"
                    ? { lokasi: value }
                    : null;
            if (updateField) {
                await db.update(mandiriKegiatan).set(updateField).where(eq(mandiriKegiatan.id, targetActivityId));
            }
        }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan settings" }, { status: 500 });
  }
}
