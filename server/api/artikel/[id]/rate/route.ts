import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artikel } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";



export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const rating = Number(body.rating);

    if (isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    // Get current rating to return it
    const updated = await db.update(artikel)
      .set({
        ratingSum: sql`${artikel.ratingSum} + ${rating}`,
        ratingCount: sql`${artikel.ratingCount} + 1`
      })
      .where(eq(artikel.id, id))
      .returning({
        ratingSum: artikel.ratingSum,
        ratingCount: artikel.ratingCount
      });

    if (updated.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ratingSum: updated[0].ratingSum,
      ratingCount: updated[0].ratingCount
    });
  } catch (error) {
    console.error("Error rating article:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
