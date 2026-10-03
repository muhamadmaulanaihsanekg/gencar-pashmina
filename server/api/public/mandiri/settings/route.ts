export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings, mandiriKegiatan, kegiatan } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || "mandiri_registration_deadline";

    // Priority for Mandiri Kegiatan (Automatic)
    if (key === "mandiri_registration_title") {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      let kegiatanId = activeSetting[0]?.value || "";
      if (kegiatanId) {
        const active = await db.select({ value: mandiriKegiatan.judul }).from(mandiriKegiatan).where(eq(mandiriKegiatan.id, kegiatanId)).limit(1);
        if (active[0]?.value) return NextResponse.json({ key, value: active[0].value });
      }
      const latest = await db.select({ value: mandiriKegiatan.judul }).from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
      if (latest[0]?.value) return NextResponse.json({ key, value: latest[0].value });
    }

    if (key === "mandiri_registration_location") {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      let kegiatanId = activeSetting[0]?.value || "";
      if (kegiatanId) {
        const active = await db.select({ value: mandiriKegiatan.lokasi }).from(mandiriKegiatan).where(eq(mandiriKegiatan.id, kegiatanId)).limit(1);
        if (active[0]?.value) return NextResponse.json({ key, value: active[0].value });
      }
      const latest = await db.select({ value: mandiriKegiatan.lokasi }).from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
      if (latest[0]?.value) return NextResponse.json({ key, value: latest[0].value });
    }

    if (key === "mandiri_registration_description") {
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      let kegiatanId = activeSetting[0]?.value || "";
      if (kegiatanId) {
        const active = await db.select({ value: mandiriKegiatan.deskripsi }).from(mandiriKegiatan).where(eq(mandiriKegiatan.id, kegiatanId)).limit(1);
        if (active[0]?.value) return NextResponse.json({ key, value: active[0].value });
      }
      const latest = await db.select({ value: mandiriKegiatan.deskripsi }).from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
      if (latest[0]?.value) return NextResponse.json({ key, value: latest[0].value });
    }

    const data = await db.select().from(settings).where(eq(settings.key, key));

    // Fallbacks for Mandiri if no Kegiatan found
    if (key === "mandiri_registration_title" && !data[0]?.value) {
      return NextResponse.json({ key, value: "Peserta Mandiri" });
    }

    if (key === "mandiri_registration_description" && !data[0]?.value) {
      return NextResponse.json({ key, value: "" });
    }

    // Fallbacks for Generus
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
