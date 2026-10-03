// Polyfill setImmediate for Edge Runtime
if (typeof globalThis.setImmediate === 'undefined') {
  (globalThis as any).setImmediate = (fn: any, ...args: any[]) => setTimeout(fn, 0, ...args);
}
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: "Email dan password baru wajib diisi" }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase();
    const user = await db.query.users.findFirst({
      where: eq(users.email, lowerEmail),
    });

    if (!user) {
      // Kita kembalikan sukses saja untuk mencegah email enumeration (keamanan)
      // Tapi untuk simplicity bisa juga return error
      return NextResponse.json({ error: "Email tidak terdaftar dalam sistem" }, { status: 400 });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 12);
    
    // Untuk fitur lupa password langsung reset, kita perlu import fungsi helper
    // jika kita menyimpan versi aslinya juga, mari kita gunakan bcrypt saja.
    // Tapi karena tabel menyimpan passwordPlain (diasumsikan digunakan oleh admin),
    // kita akan mengenkripsi teks aslinya juga kalau bisa, tapi mari kita gunakan encryptPasswordSymmetric
    // Jika tidak ada akses, biarkan saja (di system gencar ini ada fungsi lib/crypto)

    // Update password user di DB
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true, message: "Password berhasil diperbarui" });
  } catch (error) {
    console.error("Reset Password error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server saat memperbarui password" }, { status: 500 });
  }
}
