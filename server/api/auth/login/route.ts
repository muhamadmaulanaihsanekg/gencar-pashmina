// Polyfill setImmediate for Edge Runtime
if (typeof globalThis.setImmediate === 'undefined') {
  (globalThis as any).setImmediate = (fn: any, ...args: any[]) => setTimeout(fn, 0, ...args);
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { setSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { sanitizeString, detectPromptInjection } from "@/lib/sanitize";

// Rate limiter in-memory sederhana untuk mencegah serangan Brute Force.
// (Disarankan menggunakan Redis/Upstash untuk Next.js serverless di production)
const rateLimit = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMillis = 15 * 60 * 1000; // 15 menit
  
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMillis });
    return true;
  }
  
  const record = rateLimit.get(ip)!;
  if (now > record.resetTime) {
    // Reset limit
    rateLimit.set(ip, { count: 1, resetTime: now + windowMillis });
    return true;
  }
  
  if (record.count >= 5) { // Maksimal 5 percobaan gagal/berhasil per 15 menit
    return false;
  }
  
  record.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();

    // 1. Zod schema validation
    const parsed = loginSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstError = (parsed.error as any).issues?.[0]?.message || (parsed.error as any).errors?.[0]?.message || "Input tidak valid";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // 1.5 Rate Limiting (Pencegahan Brute-Force)
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit." }, { status: 429 });
    }

    // 2. Prompt injection detection (hanya cek email agar user dengan password unik tidak terblokir)
    if (detectPromptInjection(email)) {
      return NextResponse.json({ error: "Input ditolak" }, { status: 400 });
    }

    // 3. Sanitize email
    const cleanEmail = sanitizeString(email).toLowerCase();

    const user = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    // Generic error message to prevent user enumeration
    if (!user) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const validPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    await setSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      desaId: user.desaId,
      kelompokId: user.kelompokId,
      generusId: user.generusId,
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
