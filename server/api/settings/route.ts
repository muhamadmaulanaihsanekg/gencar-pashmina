export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKegiatan, settings } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  console.log(`[API_SETTINGS] GET from IP: ${ip}, UA: ${userAgent}`);
  try {
    // Explicitly select columns to avoid potential schema mismatch or reserved word issues
    const data = await db
      .select({ 
        key: settings.key, 
        value: settings.value, 
        updatedAt: settings.updatedAt 
      })
      .from(settings);

    // Convert to object for easier use
    const settingsObj: Record<string, string | null> = {};
    data.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    // Priority for Mandiri if Activity exists
    const activeKegiatanId = settingsObj["mandiri_active_kegiatan_id"];
    let activeKegiatan = null;
    if (activeKegiatanId) {
      const result = await db
        .select({ judul: mandiriKegiatan.judul, deskripsi: mandiriKegiatan.deskripsi, lokasi: mandiriKegiatan.lokasi })
        .from(mandiriKegiatan)
        .where(eq(mandiriKegiatan.id, activeKegiatanId))
        .limit(1);
      if (result.length > 0) {
        activeKegiatan = result[0];
      }
    }

    if (!activeKegiatan) {
      const latestKegiatan = await db
        .select({ judul: mandiriKegiatan.judul, deskripsi: mandiriKegiatan.deskripsi, lokasi: mandiriKegiatan.lokasi })
        .from(mandiriKegiatan)
        .orderBy(desc(mandiriKegiatan.tanggal))
        .limit(1);
      if (latestKegiatan.length > 0) {
        activeKegiatan = latestKegiatan[0];
      }
    }

    if (activeKegiatan) {
      if (activeKegiatan.judul) {
        settingsObj["mandiri_registration_title"] = activeKegiatan.judul;
      }
      if (activeKegiatan.deskripsi) {
        settingsObj["mandiri_registration_description"] = activeKegiatan.deskripsi;
      }
      if (activeKegiatan.lokasi && !settingsObj["mandiri_registration_location"]) {
        settingsObj["mandiri_registration_location"] = activeKegiatan.lokasi;
      }
    }

    return NextResponse.json(settingsObj, {
      headers: { 
        "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
        "X-Debug-Status": "success"
      },
    });
  } catch (error: any) {
    console.error("Settings GET error:", error);
    // Log more details if it's a Drizzle error
    if (error.name === "DrizzleQueryError") {
      console.error("Failed Query:", error.query);
      console.error("Params:", error.params);
    }
    return NextResponse.json(
      { error: "Gagal mengambil pengaturan", details: error.message }, 
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key) return NextResponse.json({ error: "Key wajib diisi" }, { status: 400 });

    const existing = await db.query.settings.findFirst({ where: eq(settings.key, key) });

    if (existing) {
      await db.update(settings).set({ value, updatedAt: new Date().toISOString() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
