export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json([]);
}

export async function POST() {
    return NextResponse.json({ success: true, message: "Modul ruangan telah dihapus" });
}

export async function DELETE() {
    return NextResponse.json({ success: true, message: "Modul ruangan telah dihapus" });
}
