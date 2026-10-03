// Polyfill setImmediate for Edge Runtime
if (typeof globalThis.setImmediate === 'undefined') {
  (globalThis as any).setImmediate = (fn: any, ...args: any[]) => setTimeout(fn, 0, ...args);
}
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, generus } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { registerSchema } from "@/lib/validation";
import { encryptPasswordSymmetric } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      const firstError = (result.error as any).errors[0]?.message || "Input tidak valid";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, password, desaId, kelompokId, jenisKelamin, kategoriUsia, kategori, namaOrtu, tempatLahir, tanggalLahir, noTelp, noTelpOrtu, alamat, foto } = result.data;

    // 2. Check if Email already has an account
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    // 3. Create User
    const passwordHash = bcrypt.hashSync(password, 12);
    const id = uuidv4();
    const assignedRole = kategori === "Usia Mandiri" ? "usia_mandiri" : "generus";

    // Auto-create Generus profile
    const generusId = uuidv4();
    const prefix = assignedRole === "generus" ? "G" : "P";
    const nomorUnik = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

    await db.insert(generus).values({
      id: generusId,
      nomorUnik,
      nama: name,
      jenisKelamin: jenisKelamin === "P" ? "P" : "L",
      kategoriUsia: (kategoriUsia || "Mandiri") as any,
      kategori: kategori as any,
      namaOrtu: namaOrtu,
      tempatLahir: tempatLahir,
      tanggalLahir: tanggalLahir,
      alamat: alamat,
      noTelp: noTelp,
      noTelpOrtu: noTelpOrtu,
      desaId: Number(desaId),
      kelompokId: Number(kelompokId),
      isGenerus: 1, // Ensure it appears in Data Generus
      foto: foto || null,
    });

    await db.insert(users).values({
      id,
      name,
      email: email.toLowerCase(),
      passwordHash,
      passwordPlain: encryptPasswordSymmetric(password),
      role: assignedRole as any,
      desaId: Number(desaId),
      kelompokId: Number(kelompokId),
      generusId: generusId,
    });

    return NextResponse.json({ success: true, nomorUnik });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
