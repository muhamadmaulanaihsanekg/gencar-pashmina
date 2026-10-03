import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, desa, kelompok, users } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { encryptPasswordSymmetric } from "@/lib/crypto";

function generateNomorUnik() {
  const prefix = "GNR";
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${num}`;
}

const mapGender = (v: any) => {
  if (!v) return "L";
  const str = String(v).toLowerCase().trim();
  if (str.startsWith("p") || str.includes("perempuan") || str.includes("wanita")) return "P";
  return "L";
};

const mapStatusNikah = (v: any) => {
  if (!v) return "Belum Menikah";
  const str = String(v).toLowerCase().trim();
  if (str.includes("menikah") && !str.includes("belum")) return "Menikah";
  return "Belum Menikah";
};

// Flexible column matching
const getVal = (row: any, keys: string[]) => {
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const found = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase());
    if (found !== undefined) return row[found];
  }
  return null;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Data import kosong atau format tidak sesuai" }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    const desaCache = new Map<string, number>();
    const kelompokCache = new Map<string, number>();

    const getOrCreateDesa = async (name: string) => {
      let normalized = name.trim();
      if (normalized.toLowerCase().startsWith("desa ")) {
        normalized = normalized.substring(5).trim();
      }
      
      if (desaCache.has(normalized)) return desaCache.get(normalized)!;

      let record = await db.query.desa.findFirst({ where: eq(desa.nama, normalized) });
      if (!record) {
        const inserted = await db.insert(desa).values({ nama: normalized }).returning();
        record = inserted[0];
      }
      
      desaCache.set(normalized, record!.id);
      return record!.id;
    };

    const getOrCreateKelompok = async (name: string, dId: number) => {
      const normalized = name.trim();
      const cacheKey = `${dId}:${normalized}`;
      if (kelompokCache.has(cacheKey)) return kelompokCache.get(cacheKey)!;

      let record = await db.query.kelompok.findFirst({ 
        where: and(eq(kelompok.nama, normalized), eq(kelompok.desaId, dId)) 
      });
      
      if (!record) {
        const inserted = await db.insert(kelompok).values({ nama: normalized, desaId: dId }).returning();
        record = inserted[0];
      }

      kelompokCache.set(cacheKey, record!.id);
      return record!.id;
    };

    for (const item of items) {
      try {
        const val = (keys: string[]) => getVal(item, keys);
        
        const namaRaw = val(["nama", "fullname", "nama lengkap"]);
        const emailRaw = val(["email", "mail", "posel"]);
        const passRaw = val(["password", "kata sandi"]);
        const jkRaw = val(["jenis kelamin", "jk", "gender", "sex"]);
        const kategoriRaw = val(["kategori usia", "kategori", "usia", "category"]);
        const desaRaw = val(["desa", "village"]);
        const kelompokRaw = val(["kelompok", "group"]);
        
        if (!namaRaw) {
          results.failed++;
          results.errors.push("Baris dilewati: Nama tidak ditemukan");
          continue;
        }

        let dId = session.desaId || null;
        let kId = session.kelompokId || null;

        if (desaRaw && kelompokRaw) {
          dId = await getOrCreateDesa(String(desaRaw));
          if (dId) {
            kId = await getOrCreateKelompok(String(kelompokRaw), dId);
          }
        }

        if (!dId || !kId) {
          results.failed++;
          results.errors.push(`Baris "${namaRaw}": Desa/Kelompok tidak terdeteksi`);
          continue;
        }

        let nomorUnik = generateNomorUnik();
        let existing = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) });
        while (existing) {
          nomorUnik = generateNomorUnik();
          existing = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) });
        }

        const id = uuidv4();
        await db.insert(generus).values({
          id,
          nomorUnik,
          nama: String(namaRaw),
          jenisKelamin: mapGender(jkRaw),
          kategoriUsia: (String(kategoriRaw || "Bekerja")) as any,
          tempatLahir: String(val(["tempat lahir", "tempat", "birthplace"]) || ""),
          tanggalLahir: String(val(["tanggal lahir", "tgl lahir", "dob", "birthday"]) || ""),
          alamat: String(val(["alamat", "address"]) || ""),
          noTelp: String(val(["no telp", "notelp", "phone", "whatsapp", "wa"]) || ""),
          pendidikan: String(val(["pendidikan", "education"]) || ""),
          pekerjaan: String(val(["pekerjaan", "job", "work"]) || ""),
          statusNikah: mapStatusNikah(val(["status nikah", "status", "marriage"])),
          desaId: dId,
          kelompokId: kId,
          hobi: String(val(["hobi", "hobby"]) || ""),
          makananMinumanFavorit: String(val(["makanan", "makanan favorit", "food"]) || ""),
          suku: String(val(["suku", "tribe"]) || ""),
          createdBy: "IMPORT_AUTO",
          isGenerus: 1,
        });

        // --- AUTOMATIC USER ACCOUNT CREATION ---
        let email = emailRaw ? String(emailRaw).toLowerCase().trim() : `${nomorUnik.toLowerCase()}@gencar.com`;
        const passwordPlain = passRaw ? String(passRaw) : nomorUnik;
        const passwordHash = await bcrypt.hash(passwordPlain, 10);

        // Ensure email uniqueness for the account
        let checkEmail = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (checkEmail) {
            email = `${uuidv4().substring(0, 8)}_${email}`;
        }

        await db.insert(users).values({
            id: uuidv4(),
            name: String(namaRaw),
            email: email,
            passwordHash,
            role: "generus",
            generusId: id,
            desaId: dId,
            kelompokId: kId,
        });

        results.success++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Gagal pada "${item.nama || 'Tanpa Nama'}": ${e.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${results.success} data generus & akun berhasil diimport.`,
      details: results
    });
  } catch (error: any) {
    console.error("Generus Bulk Import error:", error);
    return NextResponse.json({ error: "Gagal memproses file import secara massal" }, { status: 500 });
  }
}
