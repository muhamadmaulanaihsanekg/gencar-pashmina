export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(null);
  return NextResponse.json({
    userId: session.userId,
    name: session.name,
    email: session.email,
    role: session.role,
    desaId: session.desaId,
    kelompokId: session.kelompokId,
  });
}
