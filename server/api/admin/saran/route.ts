export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saranMasukan } from "@/lib/schema";
import { eq, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await db.select().from(saranMasukan).where(ne(saranMasukan.untuk, "Romantic Room")).orderBy(saranMasukan.createdAt);
    return NextResponse.json(data.reverse());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data saran/masukan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    await db.delete(saranMasukan).where(eq(saranMasukan.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus data saran/masukan" }, { status: 500 });
  }
}
