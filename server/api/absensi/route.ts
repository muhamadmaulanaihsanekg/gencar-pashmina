export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { absensi, generus, kegiatan, desa, kelompok } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const kegiatanId = searchParams.get("kegiatanId");

    if (!kegiatanId) return NextResponse.json({ error: "kegiatanId diperlukan" }, { status: 400 });

    // Validate access to this kegiatan
    const targetKegiatan = await db.query.kegiatan.findFirst({
      where: eq(kegiatan.id, kegiatanId),
    });

    if (!targetKegiatan) return NextResponse.json({ error: "Kegiatan tidak ditemukan" }, { status: 404 });

    if (session.role === "desa" && targetKegiatan.desaId != session.desaId) {
      return NextResponse.json({ error: "Tidak diizinkan mengakses data desa lain" }, { status: 403 });
    }
    if (session.role === "kelompok") {
      if (targetKegiatan.kelompokId !== null && targetKegiatan.kelompokId != session.kelompokId) {
        return NextResponse.json({ error: "Tidak diizinkan mengakses data kelompok lain" }, { status: 403 });
      }
      if (targetKegiatan.desaId !== null && targetKegiatan.desaId != session.desaId) {
        return NextResponse.json({ error: "Tidak diizinkan mengakses data desa lain" }, { status: 403 });
      }
    }

    const data = await db
      .select({
        id: absensi.id,
        kegiatanId: absensi.kegiatanId,
        generusId: absensi.generusId,
        timestamp: absensi.timestamp,
        keterangan: absensi.keterangan,
        generusNama: generus.nama,
        generusNomorUnik: generus.nomorUnik,
        generusKategori: generus.kategori,
        generusJenisKelamin: generus.jenisKelamin,
        desaId: generus.desaId,
        desaNama: desa.nama,
        kelompokId: generus.kelompokId,
        kelompokNama: kelompok.nama,
      })
      .from(absensi)
      .leftJoin(generus, eq(absensi.generusId, generus.id))
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .where(eq(absensi.kegiatanId, kegiatanId));

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Absensi GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { kegiatanId, generusId: rawGenerusId, keterangan } = body;

    if (!kegiatanId || !rawGenerusId) {
      return NextResponse.json({ error: "kegiatanId dan generusId diperlukan" }, { status: 400 });
    }

    // Validate kegiatan access
    const kegiatanExists = await db.query.kegiatan.findFirst({
      where: eq(kegiatan.id, kegiatanId),
    });
    
    if (!kegiatanExists) {
      return NextResponse.json({ error: "Kegiatan tidak ditemukan" }, { status: 404 });
    }

    // 1. Validasi akses pengguna terhadap kegiatan
    if (session.role === "desa") {
        if (kegiatanExists.desaId && kegiatanExists.desaId != session.desaId) {
            return NextResponse.json({ error: "Tidak diizinkan mencatat absensi desa lain" }, { status: 403 });
        }
    }
    if (session.role === "kelompok") {
        if (kegiatanExists.desaId && kegiatanExists.desaId != session.desaId) {
            return NextResponse.json({ error: "Tidak diizinkan mencatat absensi desa lain" }, { status: 403 });
        }
        if (kegiatanExists.kelompokId && kegiatanExists.kelompokId != session.kelompokId) {
            return NextResponse.json({ error: "Tidak diizinkan mencatat absensi kelompok lain" }, { status: 403 });
        }
    }

    // Resolve generus and validate access
    let resolvedGenerus = await db.query.generus.findFirst({
      where: eq(generus.id, rawGenerusId),
    });
    if (!resolvedGenerus) {
      resolvedGenerus = await db.query.generus.findFirst({
        where: eq(generus.nomorUnik, rawGenerusId),
      });
    }

    if (!resolvedGenerus) {
      return NextResponse.json(
        { error: `Generus tidak ditemukan` },
        { status: 404 }
      );
    }

    // 2. Validasi Generus berdasarkan tingkat kegiatan (Daerah / Desa / Kelompok)
    if (kegiatanExists.kelompokId) {
        // Pengajian Kelompok: Generus harus berasal dari kelompok yang sama dengan kegiatan
        if (resolvedGenerus.kelompokId != kegiatanExists.kelompokId) {
            return NextResponse.json({ error: "Generus ini bukan bagian dari kelompok kegiatan ini" }, { status: 403 });
        }
    } else if (kegiatanExists.desaId) {
        // Pengajian Desa: Generus harus berasal dari desa yang sama dengan kegiatan
        if (resolvedGenerus.desaId != kegiatanExists.desaId) {
            return NextResponse.json({ error: "Generus ini bukan bagian dari desa kegiatan ini" }, { status: 403 });
        }
    }
    // Pengajian Daerah: Bebas, semua generus bisa absen

    const resolvedGenerusId = resolvedGenerus.id;

    const existing = await db.query.absensi.findFirst({
      where: and(eq(absensi.kegiatanId, kegiatanId), eq(absensi.generusId, resolvedGenerusId)),
    });

    if (existing) {
      return NextResponse.json({ error: "Sudah diabsen", existing }, { status: 409 });
    }

    const id = uuidv4();
    await db.insert(absensi).values({
      id,
      kegiatanId,
      generusId: resolvedGenerusId,
      keterangan: keterangan || "hadir",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id, generusNama: resolvedGenerus.nama });
  } catch (error) {
    console.error("Absensi POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan absensi" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id absensi diperlukan" }, { status: 400 });

    const existing = await db.query.absensi.findFirst({
      where: eq(absensi.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Absensi tidak ditemukan" }, { status: 404 });
    }

    // Role-based validation (Admin can delete anything, desa/kelompok restricted)
    if (session.role === "desa" || session.role === "kelompok") {
      const relatedKegiatan = await db.query.kegiatan.findFirst({
        where: eq(kegiatan.id, existing.kegiatanId),
      });
      if (session.role === "desa" && relatedKegiatan?.desaId != session.desaId) {
        return NextResponse.json({ error: "Tidak diizinkan menghapus data desa lain" }, { status: 403 });
      }
      if (session.role === "kelompok") {
        if (relatedKegiatan?.kelompokId !== null && relatedKegiatan?.kelompokId != session.kelompokId) {
          return NextResponse.json({ error: "Tidak diizinkan menghapus data kelompok lain" }, { status: 403 });
        }
        if (relatedKegiatan?.desaId !== null && relatedKegiatan?.desaId != session.desaId) {
          return NextResponse.json({ error: "Tidak diizinkan menghapus data desa lain" }, { status: 403 });
        }
      }
    }

    await db.delete(absensi).where(eq(absensi.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Absensi DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus absensi" }, { status: 500 });
  }
}
