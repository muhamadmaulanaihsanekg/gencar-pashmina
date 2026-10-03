export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, users, desa, kelompok, absensi, mandiri, mandiriDesa, mandiriKelompok, mandiriDaerah } from "@/lib/schema";
import { eq, or } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;

    // Gunakan SELECT + JOIN agar desaNama & kelompokNama ikut dikembalikan
    const rows = await db
      .select({
        id: generus.id,
        nomorUnik: generus.nomorUnik,
        nama: generus.nama,
        tempatLahir: generus.tempatLahir,
        tanggalLahir: generus.tanggalLahir,
        jenisKelamin: generus.jenisKelamin,
        kategoriUsia: generus.kategoriUsia,
        kategori: generus.kategori,
        namaOrtu: generus.namaOrtu,
        alamat: generus.alamat,
        noTelp: generus.noTelp,
        noTelpOrtu: generus.noTelpOrtu,
        pendidikan: generus.pendidikan,
        pekerjaan: generus.pekerjaan,
        statusNikah: generus.statusNikah,
        desaId: generus.desaId,
        kelompokId: generus.kelompokId,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        suku: generus.suku,
        foto: generus.foto,
        instagram: generus.instagram,
        kriteriaPasangan: generus.kriteriaPasangan,
        role: users.role,
        createdAt: generus.createdAt,
        nomorUrut: mandiri.nomorUrut,
        mandiriDesaNama: mandiriDesa.nama,
        mandiriKelompokNama: mandiriKelompok.nama,
        kota: mandiriDaerah.nama,
      })
      .from(generus)
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(or(eq(generus.id, id), eq(generus.nomorUnik, id)))
      .limit(1);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

    const data = rows[0];

    // Access control
    if ((session.role === "kelompok") && session.kelompokId && data.kelompokId !== session.kelompokId) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }
    if ((session.role === "desa") && session.desaId && !session.kelompokId && data.desaId !== session.desaId) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }

    // no-store agar modal edit tidak pernah mendapat data lama dari cache
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Generus GET[id] error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}


export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const existingResult = await db.select().from(generus).where(or(eq(generus.id, id), eq(generus.nomorUnik, id))).limit(1);
    const existing = existingResult[0];
    if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    const targetId = existing.id;

    if ((session.role === "kelompok") && session.kelompokId && existing.kelompokId !== session.kelompokId) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }
    if ((session.role === "desa") && session.desaId && !session.kelompokId && existing.desaId !== session.desaId) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      nama, tempatLahir, tanggalLahir, jenisKelamin, kategoriUsia, 
      alamat, noTelp, noTelpOrtu, pendidikan, pekerjaan, statusNikah, 
      desaId, kelompokId, mandiriDesaId, mandiriKelompokId,
      hobi, makananMinumanFavorit, suku, foto, instagram, namaOrtu, kategori,
      kriteriaPasangan
    } = body;

    await db
      .update(generus)
      .set({
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
        statusNikah,
        desaId: desaId ? Number(desaId) : null,
        kelompokId: kelompokId ? Number(kelompokId) : null,
        mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
        mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
        hobi,
        makananMinumanFavorit,
        suku,
        foto,
        instagram,
        kriteriaPasangan,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(generus.id, targetId));

    // Sinkronkan nama, desaId, kelompokId, dan EMAIL ke tabel users
    const { email: customEmail, password: customPassword } = body;
    const updateData: any = { 
      name: nama,
      desaId: desaId ? Number(desaId) : null,
      kelompokId: kelompokId ? Number(kelompokId) : null,
      mandiriDesaId: mandiriDesaId ? Number(mandiriDesaId) : null,
      mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null,
    };

    if (customEmail) {
       updateData.email = customEmail.toLowerCase();
    }
    if (customPassword) {
       const bcrypt = await import("bcryptjs");
       updateData.passwordHash = await bcrypt.hash(customPassword, 10);
    }

    await db.update(users).set(updateData).where(eq(users.generusId, targetId));

    // Kembalikan data terbaru (dengan join desa & kelompok) agar frontend langsung sinkron
    const updated = await db
      .select({
        id: generus.id,
        nomorUnik: generus.nomorUnik,
        nama: generus.nama,
        jenisKelamin: generus.jenisKelamin,
        kategoriUsia: generus.kategoriUsia,
        kategori: generus.kategori,
        namaOrtu: generus.namaOrtu,
        tempatLahir: generus.tempatLahir,
        tanggalLahir: generus.tanggalLahir,
        alamat: generus.alamat,
        noTelp: generus.noTelp,
        noTelpOrtu: generus.noTelpOrtu,
        pendidikan: generus.pendidikan,
        pekerjaan: generus.pekerjaan,
        statusNikah: generus.statusNikah,
        desaId: generus.desaId,
        kelompokId: generus.kelompokId,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        suku: generus.suku,
        foto: generus.foto,
        instagram: generus.instagram,
        role: users.role,
        createdAt: generus.createdAt,
      })
      .from(generus)
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .where(eq(generus.id, targetId))
      .limit(1);

    return NextResponse.json({ success: true, data: updated[0] ?? null });
  } catch (error) {
    console.error("Generus PUT error:", error);
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const existingResult = await db.select().from(generus).where(or(eq(generus.id, id), eq(generus.nomorUnik, id))).limit(1);
    const existing = existingResult[0];
    if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    const targetId = existing.id; // Use real UUID for later operations

    if ((session.role === "kelompok") && session.kelompokId && existing.kelompokId !== session.kelompokId) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }
    if ((session.role === "desa") && session.desaId && !session.kelompokId && existing.desaId !== session.desaId) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }

    // FIX: Delete related records first because sqlite foreign keys without ON DELETE CASCADE will throw 500 error
    await db.delete(absensi).where(eq(absensi.generusId, targetId));
    
    // Sinkronisasi hapus generusId di tabel users (atau delete user-nya tergantung kebutuhan, di sini set null / biarkan cascade jika ada)
    // Di schema users: generusId: text("generus_id").references(() => generus.id, { onDelete: "cascade" })
    
    await db.delete(generus).where(eq(generus.id, targetId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Generus DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
