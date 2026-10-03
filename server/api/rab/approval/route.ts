import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rabApproval } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "admin_keuangan", "creator"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kegiatanId = searchParams.get("kegiatanId");
    const mandiriKegiatanId = searchParams.get("mandiriKegiatanId");

    let whereClause;
    if (kegiatanId) {
      whereClause = eq(rabApproval.kegiatanId, kegiatanId);
    } else if (mandiriKegiatanId) {
      whereClause = eq(rabApproval.mandiriKegiatanId, mandiriKegiatanId);
    } else {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const approval = await db.select().from(rabApproval).where(whereClause).get();
    return NextResponse.json(approval || { statusPengurus: "pending", statusAdmin: "pending" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "admin_keuangan", "creator"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { kegiatanId, mandiriKegiatanId, status, catatan, isSubmitted } = body;

    if (isSubmitted === undefined && !status && (!kegiatanId && !mandiriKegiatanId)) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let whereClause;
    if (kegiatanId) {
      whereClause = eq(rabApproval.kegiatanId, kegiatanId);
    } else {
      whereClause = eq(rabApproval.mandiriKegiatanId, mandiriKegiatanId);
    }

    const existing = await db.select().from(rabApproval).where(whereClause).get();

    const data: any = {
      updatedAt: new Date().toISOString(),
    };

    if (isSubmitted !== undefined) {
      if (!["admin_keuangan", "creator", "admin", "pengurus_daerah"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized to submit" }, { status: 401 });
      }
      data.isSubmitted = isSubmitted ? 1 : 0;
      // If submitted, ensure status stays pending or reset to pending if previously rejected (optional logic)
    }

    if (status) {
      if (session.role === "pengurus_daerah") {
        data.statusPengurus = status;
        data.catatanPengurus = catatan;
      } else if (session.role === "admin") {
        data.statusAdmin = status;
        data.catatanAdmin = catatan;
      }
    }

    if (existing) {
      await db.update(rabApproval).set(data).where(eq(rabApproval.id, existing.id));
    } else {
      await db.insert(rabApproval).values({
        id: nanoid(),
        kegiatanId: kegiatanId || null,
        mandiriKegiatanId: mandiriKegiatanId || null,
        ...data,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
