
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const day = searchParams.get("day");

    if (!year || !month || !day) {
      return NextResponse.json({ error: "Missing date parameters" }, { status: 400 });
    }

    const res = await fetch(`https://api.myquran.com/v2/sholat/jadwal/1301/${year}/${month}/${day}`);
    
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch from API" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in sholat API route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
