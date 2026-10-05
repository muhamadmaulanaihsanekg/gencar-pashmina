
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, desa, kelompok, users, mandiri, mandiriDesa, mandiriKelompok, settings, mandiriKegiatan, mandiriAbsensi, mandiriDaerah } from "@/lib/schema";
import { eq, sql, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const nUnik = searchParams.get("nomorUnik");
    
    // 1. Check Public Access Status
    const publicStatus = await db.select().from(settings).where(eq(settings.key, "mandiri_katalog_public_status"));
    const isPublicOpen = publicStatus[0]?.value === "open";

    if (!isPublicOpen) {
      let isAllowed = false;
      try {
        const { getSession } = await import("@/lib/auth");
        const session = await getSession();
        if (session && ["admin", "admin_romantic_room", "tim_pnkb", "tim_pnkb_gambuh"].includes(session.role)) {
          isAllowed = true;
        }
      } catch (e) {}

      if (!isAllowed && nUnik) {
        const participantCheck = await db.select({ id: generus.id }).from(generus).where(eq(generus.nomorUnik, nUnik)).limit(1);
        if (participantCheck.length > 0) {
          isAllowed = true;
        }
      }

      if (!isAllowed) {
        return NextResponse.json({ error: "Katalog sedang tidak dibuka untuk publik." }, { status: 403 });
      }
    }

    // 2. Get active activity to filter by attendance
    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const kegiatanId = activeSetting[0]?.value;

    if (!kegiatanId) {
      return NextResponse.json({ error: "Data tidak ditemukan (Belum absensi)" }, { status: 404 });
    }

    const data = await db
      .select({
        id: generus.id,
        nomorUnik: generus.nomorUnik,
        nama: generus.nama,
        jenisKelamin: generus.jenisKelamin,
        kategoriUsia: generus.kategoriUsia,
        statusNikah: generus.statusNikah,
        suku: generus.suku,
        foto: generus.foto,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
        mandiriDesaNama: mandiriDesa.nama,
        mandiriDesaKota: mandiriDaerah.nama,
        mandiriDesaId: generus.mandiriDesaId,
        mandiriKelompokNama: mandiriKelompok.nama,
        mandiriKelompokId: generus.mandiriKelompokId,
        createdAt: generus.createdAt,
        tempatLahir: generus.tempatLahir,
        tanggalLahir: generus.tanggalLahir,
        pendidikan: generus.pendidikan,
        pekerjaan: generus.pekerjaan,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        role: users.role,
        nomorUrut: mandiri.nomorUrut,
        noTelp: sql<string>`NULL`,
        alamat: generus.alamat,
        instagram: generus.instagram,
        kriteriaPasangan: generus.kriteriaPasangan,
        tinggiBadan: generus.tinggiBadan,
        anakKe: generus.anakKe,
        jumlahSaudara: generus.jumlahSaudara,
        jumlahAnak: generus.jumlahAnak,
      })
      .from(generus)
      .innerJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(mandiriAbsensi, eq(generus.id, mandiriAbsensi.generusId))
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .where(eq(generus.id, id))
      .limit(1);

    if (data.length === 0) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error("Public Detail error:", error);
    return NextResponse.json({ error: "Gagal mengambil data detail" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { nomorUnik, token, nama, tempatLahir, tanggalLahir, jenisKelamin, alamat, suku, pendidikan, pekerjaan, statusNikah, hobi, makananMinumanFavorit, instagram, kriteriaPasangan, mandiriDesaId, mandiriKelompokId, tinggiBadan, anakKe, jumlahSaudara, jumlahAnak } = body;

    if (!nomorUnik || !token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
    const kegiatanId = activeSetting[0]?.value;

    if (!kegiatanId) {
      return NextResponse.json({ error: "No active activity" }, { status: 400 });
    }

    // Verify user ownership
    const user = await db.select({ id: generus.id })
      .from(generus)
      .innerJoin(mandiri, and(eq(generus.id, mandiri.generusId), eq(mandiri.kegiatanId, kegiatanId)))
      .where(and(
        eq(generus.id, id),
        eq(generus.nomorUnik, nomorUnik),
        eq(mandiri.lastSessionToken, token)
      ))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.update(generus).set({
      nama,
      tempatLahir,
      tanggalLahir,
      jenisKelamin,
      alamat,
      suku,
      pendidikan,
      pekerjaan,
      statusNikah,
      hobi,
      makananMinumanFavorit,
      instagram,
      kriteriaPasangan,
      mandiriDesaId: mandiriDesaId || null,
      mandiriKelompokId: mandiriKelompokId || null,
      tinggiBadan: tinggiBadan ? Number(tinggiBadan) : null,
      anakKe: anakKe ? Number(anakKe) : null,
      jumlahSaudara: jumlahSaudara ? Number(jumlahSaudara) : null,
      jumlahAnak: jumlahAnak !== undefined && jumlahAnak !== "" ? Number(jumlahAnak) : 0,
      updatedAt: new Date().toISOString()
    }).where(eq(generus.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}

