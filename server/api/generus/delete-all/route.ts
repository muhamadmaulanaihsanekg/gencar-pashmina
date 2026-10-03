import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, absensi, users } from "@/lib/schema";
import { sql, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    // Only allow Admin to delete ALL data
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Hanya Admin yang dapat menghapus seluruh data." }, { status: 401 });
    }

    console.log("Starting full data reset for Generus...");

    await db.transaction(async (tx) => {
      // 1. Delete all attendance records (absensi) because they depend on generus
      await tx.delete(absensi);

      // 2. Delete all generus records
      // This will automatically delete associated users if onDelete: cascade is working
      // But to be safe and thorough, we'll delete them.
      await tx.delete(generus);
      
      // Note: Users linked to generus will be deleted by the foreign key constraint (cascade)
    });

    revalidatePath("/(dashboard)/generus", "page");
    revalidatePath("/(dashboard)/dashboard", "page");

    return NextResponse.json({ 
      success: true, 
      message: "Seluruh data generus dan absensi telah berhasil dibersihkan." 
    });

  } catch (error) {
    console.error("Delete all error:", error);
    return NextResponse.json({ error: "Gagal menghapus data." }, { status: 500 });
  }
}
