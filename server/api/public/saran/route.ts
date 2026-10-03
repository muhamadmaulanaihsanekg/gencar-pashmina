import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saranMasukan, mandiri } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { untuk, kepada, saran, nama, isAnonim, userId } = body;

    if (!untuk || !untuk.trim()) {
      return NextResponse.json({ error: "Kolom 'untuk siapa' wajib diisi." }, { status: 400 });
    }

    if (!saran || !saran.trim()) {
      return NextResponse.json({ error: "Kolom 'saran/masukan' wajib diisi." }, { status: 400 });
    }

    const senderName = isAnonim ? "Anonim" : (nama?.trim() || "Anonim");

    await db.insert(saranMasukan).values({
      id: uuidv4(),
      untuk: untuk.trim(),
      kepada: kepada?.trim() || null,
      saran: saran.trim(),
      nama: senderName,
      userId: userId || null,
      isAnonim: isAnonim ? 1 : 0,
    });

    return NextResponse.json({ success: true, message: "Saran/masukan berhasil dikirim!" });
  } catch (error: any) {
    console.error("Error saving saran/masukan:", error);
    return NextResponse.json(
      { error: "Gagal mengirim saran/masukan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    try {
        const records = await db.select()
            .from(saranMasukan)
            .where(
                and(
                    eq(saranMasukan.userId, userId),
                    eq(saranMasukan.untuk, "Romantic Room")
                )
            );
        return NextResponse.json(records);
    } catch (e) {
        return NextResponse.json({ error: "Error fetching data" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const userId = searchParams.get("userId");
        const token = request.headers.get("Authorization")?.replace("Bearer ", "");

        if (!id || !userId || !token) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // Verify token
        const participant = await db.query.mandiri.findFirst({
            where: and(eq(mandiri.generusId, userId), eq(mandiri.lastSessionToken, token))
        });

        if (!participant) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await db.delete(saranMasukan).where(and(eq(saranMasukan.id, id), eq(saranMasukan.userId, userId)));
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Error deleting saran" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, kepada, saran, isAnonim, nama, userId, token } = body;

        if (!id || !userId || !token) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // Verify token
        const participant = await db.query.mandiri.findFirst({
            where: and(eq(mandiri.generusId, userId), eq(mandiri.lastSessionToken, token))
        });

        if (!participant) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const senderName = isAnonim ? "Anonim" : (nama?.trim() || "Anonim");

        await db.update(saranMasukan)
            .set({ 
                kepada: kepada?.trim() || null,
                saran, 
                isAnonim: isAnonim ? 1 : 0,
                nama: senderName
            })
            .where(and(eq(saranMasukan.id, id), eq(saranMasukan.userId, userId)));
            
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Error updating saran" }, { status: 500 });
    }
}
