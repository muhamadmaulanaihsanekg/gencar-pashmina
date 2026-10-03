import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, desa, kelompok, mandiri, users } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

function generateNomorUnik() {
  const prefix = "GNR";
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${num}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nama, tempatLahir, tanggalLahir, jenisKelamin, kategoriUsia, alamat, noTelp, noTelpOrtu, 
      pendidikan, pekerjaan, statusNikah, desaId, kelompokId, 
      hobi, makananMinumanFavorit, suku, foto, namaOrtu, kategori,
      email, password 
    } = body;

    if (!nama || !jenisKelamin || !kategoriUsia || !desaId || !email || !password || !tempatLahir || !tanggalLahir || !namaOrtu || !noTelp || !noTelpOrtu || !alamat || !foto) {
      return NextResponse.json({ error: "Semua data wajib diisi secara lengkap" }, { status: 400 });
    }

    // 1. Email Uniqueness Check
    const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase())
    });
    if (existingEmail) {
        return NextResponse.json({ error: `Email "${email}" sudah digunakan oleh akun lain. Gunakan email lain.` }, { status: 400 });
    }

    // 2. Duplicate Generus Check
    const duplicate = await db.query.generus.findFirst({
        where: and(
            eq(generus.nama, nama),
            tanggalLahir ? eq(generus.tanggalLahir, tanggalLahir) : undefined
        )
    });
    
    if (duplicate) {
        // Check if already in Mandiri
        const isMandiri = await db.query.mandiri.findFirst({ where: eq(mandiri.generusId, duplicate.id) });
        
        // Mark as 'isGenerus' ONLY if NOT in Mandiri
        if (!isMandiri) {
          await db.update(generus).set({ isGenerus: 1 }).where(eq(generus.id, duplicate.id));
        }
        
        // If they don't have a user account, create one (like in the new flow)
        const checkUser = await db.query.users.findFirst({ where: eq(users.generusId, duplicate.id) });
        if (!checkUser) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.insert(users).values({
                id: uuidv4(),
                name: nama,
                email: email.toLowerCase(),
                passwordHash: hashedPassword,
                role: "generus",
                generusId: duplicate.id,
                desaId: Number(desaId),
                kelompokId: kelompokId ? Number(kelompokId) : null,
            });
        }
        
        return NextResponse.json({ success: true, id: duplicate.id, nomorUnik: duplicate.nomorUnik });
    }

    let nomorUnik = generateNomorUnik();
    while (await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) })) {
      nomorUnik = generateNomorUnik();
    }

    const generusId = uuidv4();
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insert into generus
    await db.insert(generus).values({
      id: generusId,
      nomorUnik,
      nama,
      tempatLahir,
      tanggalLahir,
      jenisKelamin,
      kategoriUsia,
      kategori,
      namaOrtu,
      alamat,
      noTelp,
      noTelpOrtu,
      pendidikan,
      pekerjaan,
      statusNikah: statusNikah || "Belum Menikah",
      desaId: Number(desaId),
      kelompokId: kelompokId ? Number(kelompokId) : null,
      hobi,
      makananMinumanFavorit,
      suku,
      foto,
      createdBy: "FORM_GENERUS",
      isGenerus: 1, // Fresh new generic member
    });

    // 4. Insert into users (Account Creation)
    await db.insert(users).values({
        id: userId,
        name: nama,
        email: email.toLowerCase(),
        passwordHash: hashedPassword,
        role: "generus", // Default role for general members
        generusId: generusId,
        desaId: Number(desaId),
        kelompokId: kelompokId ? Number(kelompokId) : null,
    });

    return NextResponse.json({ success: true, id: generusId, nomorUnik });
  } catch (error: any) {
    console.error("Public Generus Registration error:", error);
    return NextResponse.json({ error: "Gagal memproses pendaftaran" }, { status: 500 });
  }
}
