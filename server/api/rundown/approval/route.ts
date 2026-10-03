export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rundownApproval } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const kegiatanId = searchParams.get("kegiatanId");
    const mandiriKegiatanId = searchParams.get("mandiriKegiatanId");

    let where;
    if (kegiatanId) {
      where = eq(rundownApproval.kegiatanId, kegiatanId);
    } else if (mandiriKegiatanId) {
      where = eq(rundownApproval.mandiriKegiatanId, mandiriKegiatanId);
    } else {
      return NextResponse.json({ error: "ID Kegiatan wajib" }, { status: 400 });
    }

    const data = await db.query.rundownApproval.findFirst({ where });
    return NextResponse.json(data || { statusPengurus: "pending", isSubmitted: 0 });
  } catch (error) {
    console.error("Rundown Approval GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { kegiatanId, mandiriKegiatanId, status, catatan, isSubmitted } = body;

    let where;
    if (kegiatanId) {
      where = eq(rundownApproval.kegiatanId, kegiatanId);
    } else if (mandiriKegiatanId) {
      where = eq(rundownApproval.mandiriKegiatanId, mandiriKegiatanId);
    } else {
      return NextResponse.json({ error: "ID Kegiatan wajib" }, { status: 400 });
    }

    const existing = await db.query.rundownApproval.findFirst({ where });

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (status !== undefined) {
      if (session.role !== "pengurus_daerah" && session.role !== "admin") {
        return NextResponse.json({ error: "Hanya Pengurus Daerah atau Admin yang dapat mengubah status" }, { status: 403 });
      }
      updateData.statusPengurus = status;
      if (catatan !== undefined) updateData.catatanPengurus = catatan;
    }

    if (isSubmitted !== undefined) {
      if (session.role !== "admin_kegiatan" && session.role !== "kmm_daerah" && session.role !== "admin") {
         return NextResponse.json({ error: "Unauthorized to submit" }, { status: 403 });
      }
      updateData.isSubmitted = isSubmitted ? 1 : 0;
    }

    if (existing) {
      await db.update(rundownApproval).set(updateData).where(where);
    } else {
      await db.insert(rundownApproval).values({
        id: uuidv4(),
        kegiatanId: kegiatanId || null,
        mandiriKegiatanId: mandiriKegiatanId || null,
        ...updateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rundown Approval POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}
