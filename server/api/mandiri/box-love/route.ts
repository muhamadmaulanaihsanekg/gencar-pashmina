
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings, generus, mandiri, mandiriDesa, mandiriPemilihan, mandiriKegiatan, mandiriAbsensi, mandiriDaerah } from "@/lib/schema";
import { eq, and, or, like, sql, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

import { pusherServer } from "@/lib/pusher";

// GET: Check Box Love status + search participants
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Action: get Box Love status (public, no auth)
    if (action === "status") {
      const data = await db.select().from(settings).where(eq(settings.key, "box_love_status"));
      return NextResponse.json({ value: data[0]?.value || "closed" });
    }

    // Action: search participants for Box Love popup
    if (action === "search") {
      const search = (searchParams.get("q") || "").trim();
      const jenisKelamin = searchParams.get("jenisKelamin") || "all";
      const nomorUnikReq = searchParams.get("nomorUnik");
      const tokenReq = searchParams.get("token");

      // Get the active kegiatan from settings
      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      const kegiatanId = activeSetting[0]?.value || "";

      // Validate user session via token
      if (nomorUnikReq && tokenReq && kegiatanId) {
        const m = await db.select({ generusId: mandiri.generusId })
          .from(mandiri)
          .innerJoin(generus, eq(mandiri.generusId, generus.id))
          .where(and(eq(generus.nomorUnik, nomorUnikReq), eq(mandiri.kegiatanId, kegiatanId), eq(mandiri.lastSessionToken, tokenReq)))
          .limit(1);
        if (m.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      } else {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!kegiatanId) return NextResponse.json([]);

      const conditions: any[] = [];

      if (search) {
        const isNumeric = /^\d+$/.test(search);
        if (isNumeric) {
          conditions.push(
            or(
              eq(mandiri.nomorUrut, Number(search)),
              like(generus.nama, `%${search}%`)
            )
          );
        } else {
          conditions.push(
            or(
              like(generus.nama, `%${search}%`),
              like(mandiriDaerah.nama, `%${search}%`),
              like(mandiriDesa.nama, `%${search}%`)
            )
          );
        }
      }

      if (jenisKelamin === "L" || jenisKelamin === "P") {
        conditions.push(eq(generus.jenisKelamin, jenisKelamin as "L" | "P"));
      }

      // Only show attended
      conditions.push(eq(mandiriAbsensi.kegiatanId, kegiatanId));

      const finalWhere = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db.select({
        id: generus.id,
        nama: generus.nama,
        foto: generus.foto,
        jenisKelamin: generus.jenisKelamin,
        nomorUrut: mandiri.nomorUrut,
        nomorUnik: generus.nomorUnik,
        mandiriDesaNama: mandiriDesa.nama,
        mandiriDesaKota: mandiriDaerah.nama,
      })
        .from(generus)
        .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
        .innerJoin(mandiriAbsensi, eq(generus.id, mandiriAbsensi.generusId))
        .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
        .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
        .where(finalWhere)
        .orderBy(mandiri.nomorUrut)
        .limit(10);

      return NextResponse.json(results);
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("Box Love GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

// POST: Toggle Box Love status (admin only) OR submit Box Love selection (participant)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Admin Toggle
    if (action === "toggle") {
      const session = await getSession();
      if (!session || !["admin", "kmm_daerah", "admin_romantic_room", "pengurus_daerah", "tim_pnkb"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const current = await db.select().from(settings).where(eq(settings.key, "box_love_status"));
      const newStatus = current[0]?.value === "open" ? "closed" : "open";

      if (current.length > 0) {
        await db.update(settings).set({ value: newStatus, updatedAt: new Date().toISOString() }).where(eq(settings.key, "box_love_status"));
      } else {
        await db.insert(settings).values({ key: "box_love_status", value: newStatus });
      }

      try {
        await pusherServer.trigger("taaruf-channel", "box-love-status-changed", { status: newStatus });
      } catch (err) {
        console.error("Pusher toggle box-love-status error:", err);
      }

      return NextResponse.json({ success: true, value: newStatus });
    }

    // Participant Submit Box Love
    if (action === "submit") {
      const { nomorUnik, token, targetId } = body;

      // Validate token
      let pengirimId: string | null = null;
      let pengirimJenisKelamin: string | null = null;
      
      const session = await getSession();
      if (session) {
        pengirimId = session.generusId || null;
      }

      const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
      const kegiatanId = activeSetting[0]?.value || "";

      if (!pengirimId && nomorUnik && token && kegiatanId) {
        const m = await db.select({
          generusId: mandiri.generusId,
          jenisKelamin: generus.jenisKelamin
        })
          .from(mandiri)
          .innerJoin(generus, eq(mandiri.generusId, generus.id))
          .where(and(eq(generus.nomorUnik, nomorUnik), eq(mandiri.kegiatanId, kegiatanId), eq(mandiri.lastSessionToken, token)))
          .limit(1);
        if (m.length > 0) {
          pengirimId = m[0].generusId;
          pengirimJenisKelamin = m[0].jenisKelamin ?? null;
        }
      }

      if (!pengirimId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (!targetId) return NextResponse.json({ error: "Target tidak valid" }, { status: 400 });
      if (pengirimId === targetId) return NextResponse.json({ error: "Tidak dapat memilih diri sendiri" }, { status: 400 });

      // Check existing
      const existing = await db.query.mandiriPemilihan.findFirst({
        where: and(eq(mandiriPemilihan.pengirimId, pengirimId), eq(mandiriPemilihan.penerimaId, targetId))
      });
      if (existing) return NextResponse.json({ error: "Anda sudah memilih peserta ini" }, { status: 400 });

      // Insert into mandiriPemilihan (same as Romantic Room queue)
      const id = uuidv4();
      await db.insert(mandiriPemilihan).values({
        id,
        pengirimId,
        penerimaId: targetId,
        status: "Menunggu"
      });

      // Optimization: Return updated selections
      const updatedSelections = await db.select({
        id: mandiriPemilihan.id,
        status: mandiriPemilihan.status,
        penerimaId: mandiriPemilihan.penerimaId,
        createdAt: mandiriPemilihan.createdAt,
        penerimaNama: generus.nama,
        penerimaNo: generus.nomorUnik,
        penerimaNoUrut: mandiri.nomorUrut
      })
      .from(mandiriPemilihan)
      .innerJoin(generus, eq(mandiriPemilihan.penerimaId, generus.id))
      .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
      .where(eq(mandiriPemilihan.pengirimId, pengirimId))
      .orderBy(desc(mandiriPemilihan.createdAt));

      return NextResponse.json({ success: true, id, selections: updatedSelections });
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("Box Love POST error:", error);
    return NextResponse.json({ error: "Gagal memproses permintaan" }, { status: 500 });
  }
}
