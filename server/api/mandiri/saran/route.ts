import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saranMasukan } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const records = await db.select()
            .from(saranMasukan)
            .where(eq(saranMasukan.untuk, "Romantic Room"))
            .orderBy(desc(saranMasukan.createdAt));
        
        return NextResponse.json(records);
    } catch (error) {
        console.error("GET saran error:", error);
        return NextResponse.json({ error: "Gagal mengambil data saran" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        // In a real app we'd verify session role here, assuming middleware handles it or we'd import getServerSession.
        await db.delete(saranMasukan).where(eq(saranMasukan.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Gagal menghapus saran" }, { status: 500 });
    }
}
