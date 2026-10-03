export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { generus, desa, kelompok, users, mandiri, mandiriDesa, settings, mandiriKegiatan, mandiriDaerah, timGambuh, mandiriKelompok } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession, setSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    console.log("Profile API - Session:", session);
    let currentGenerusId = session?.generusId;

    if (!session) {
        // Independent Participant check via headers
        const headerUnik = request.headers.get("x-nomor-unik");
        const headerToken = request.headers.get("x-session-token");

        if (headerUnik && headerToken) {
            const m = await db.select({ generusId: mandiri.generusId })
                .from(mandiri)
                .innerJoin(generus, eq(mandiri.generusId, generus.id))
                .where(and(eq(generus.nomorUnik, headerUnik), eq(mandiri.lastSessionToken, headerToken)))
                .limit(1);
            if (m.length > 0) currentGenerusId = m[0].generusId;
        }

        if (!currentGenerusId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    if (!currentGenerusId) {
      if (!session || !["admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "creator", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "admin_pdkt", "tim_pnkb_gambuh"].includes(session.role)) {
        return NextResponse.json({ error: "Akun Anda belum terhubung dengan data profil generus" }, { status: 403 });
      }

      // Fallback: Ambil data dari tabel users (baru atau lama) jika tidak punya generusId (khusus pengurus/admin)
      let userData = await db
        .select({
          id: users.id,
          nama: users.name,
          email: users.email,
          role: users.role,
          desaId: users.desaId,
          kelompokId: users.kelompokId,
          desaNama: desa.nama,
          kelompokNama: kelompok.nama,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(desa, eq(users.desaId, desa.id))
        .leftJoin(kelompok, eq(users.kelompokId, kelompok.id))
        .where(eq(users.id, session.userId))
        .limit(1);

      // Jika tidak ada di tabel users, cek di users_old
      if (userData.length === 0) {
          const { users } = await import("@/lib/schema");
          const oldData = await db
            .select({
              id: users.id,
              nama: users.name,
              email: users.email,
              role: users.role,
              desaId: users.desaId,
              kelompokId: users.kelompokId,
              desaNama: desa.nama,
              kelompokNama: kelompok.nama,
              createdAt: users.createdAt,
            })
            .from(users)
            .leftJoin(desa, eq(users.desaId, desa.id))
            .leftJoin(kelompok, eq(users.kelompokId, kelompok.id))
            .where(eq(users.id, session.userId))
            .limit(1);
          
          if (oldData.length > 0) {
              userData = oldData as any;
          }
      }

      if (userData.length === 0) {
        console.log("Profile API - User data not found for session user ID in both users and users_old:", session.userId);
        return NextResponse.json({ error: "Data user tidak ditemukan" }, { status: 404 });
      }

      const u = userData[0];

      // --- Tim PNKB & Ibu Gambuh: ambil biodata dari tabel timGambuh ---
      if (["tim_pnkb", "tim_pnkb_gambuh"].includes(u.role)) {
        // Cari kegiatan aktif
        const activeKegSetting = await db.query.settings.findFirst({
          where: eq(settings.key, "mandiri_active_kegiatan_id")
        });
        const activeKegiatanId = activeKegSetting?.value || null;

        // Cari record timGambuh berdasarkan nama user + kegiatan aktif
        let tgData: any = null;
        if (activeKegiatanId) {
          const tgResults = await db.select({
            id: timGambuh.id,
            nama: timGambuh.nama,
            umur: timGambuh.umur,
            noTelp: timGambuh.noTelp,
            tipe: timGambuh.tipe,
            daerahId: timGambuh.daerahId,
            desaId: timGambuh.desaId,
            kelompokId: timGambuh.kelompokId,
            daerahNama: mandiriDaerah.nama,
            desaNama: mandiriDesa.nama,
            kelompokNama: mandiriKelompok.nama,
            createdAt: timGambuh.createdAt,
          })
          .from(timGambuh)
          .leftJoin(mandiriDaerah, eq(timGambuh.daerahId, mandiriDaerah.id))
          .leftJoin(mandiriDesa, eq(timGambuh.desaId, mandiriDesa.id))
          .leftJoin(mandiriKelompok, eq(timGambuh.kelompokId, mandiriKelompok.id))
          .where(and(
            eq(timGambuh.nama, u.nama),
            eq(timGambuh.kegiatanId, activeKegiatanId)
          ))
          .limit(1);
          tgData = tgResults[0] || null;
        }

        // Jika tidak ditemukan di kegiatan aktif, coba cari tanpa filter kegiatan
        if (!tgData) {
          const tgFallback = await db.select({
            id: timGambuh.id,
            nama: timGambuh.nama,
            umur: timGambuh.umur,
            noTelp: timGambuh.noTelp,
            tipe: timGambuh.tipe,
            daerahId: timGambuh.daerahId,
            desaId: timGambuh.desaId,
            kelompokId: timGambuh.kelompokId,
            daerahNama: mandiriDaerah.nama,
            desaNama: mandiriDesa.nama,
            kelompokNama: mandiriKelompok.nama,
            createdAt: timGambuh.createdAt,
          })
          .from(timGambuh)
          .leftJoin(mandiriDaerah, eq(timGambuh.daerahId, mandiriDaerah.id))
          .leftJoin(mandiriDesa, eq(timGambuh.desaId, mandiriDesa.id))
          .leftJoin(mandiriKelompok, eq(timGambuh.kelompokId, mandiriKelompok.id))
          .where(eq(timGambuh.nama, u.nama))
          .limit(1);
          tgData = tgFallback[0] || null;
        }

        const jenisKelamin = tgData?.tipe === "Ibu Gambuh" || tgData?.tipe === "Penunggu Ibu Gambuh" ? "P" : "L";

        return NextResponse.json({
          id: u.id,
          nomorUnik: "OFFICIAL-" + u.id.split("-")[0].toUpperCase(),
          nama: tgData?.nama || u.nama,
          tempatLahir: "-",
          tanggalLahir: "-",
          jenisKelamin: jenisKelamin,
          kategoriUsia: "Bekerja",
          alamat: "-",
          noTelp: tgData?.noTelp || "-",
          pendidikan: "-",
          pekerjaan: tgData?.tipe || u.role.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          statusNikah: "Menikah",
          desaId: u.desaId,
          kelompokId: u.kelompokId,
          desaNama: tgData?.desaNama || u.desaNama || "Daerah",
          kelompokNama: tgData?.kelompokNama || u.kelompokNama || "Daerah",
          kota: tgData?.daerahNama || null,
          mandiriDesaNama: tgData?.desaNama || null,
          role: u.role,
          isInPdkt: true,
          createdAt: u.createdAt,
          // Data biodata lengkap dari timGambuh
          timGambuhId: tgData?.id || null,
          umur: tgData?.umur || null,
          tipeTimGambuh: tgData?.tipe || null,
          tgDaerahId: tgData?.daerahId || null,
          tgDesaId: tgData?.desaId || null,
          tgKelompokId: tgData?.kelompokId || null,
        }, {
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        });
      }

      return NextResponse.json({
        id: u.id,
        nomorUnik: "OFFICIAL-" + u.id.split("-")[0].toUpperCase(),
        nama: u.nama,
        tempatLahir: "-",
        tanggalLahir: "-",
        jenisKelamin: null, // Tidak diketahui - admin tanpa data generus
        kategoriUsia: "Bekerja",
        alamat: "-",
        noTelp: "-",
        pendidikan: "-",
        pekerjaan: u.role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        statusNikah: "Menikah",
        desaId: u.desaId,
        kelompokId: u.kelompokId,
        desaNama: u.desaNama || "Daerah",
        kelompokNama: u.kelompokNama || "Daerah",
        role: u.role,
        isInPdkt: true,
        createdAt: u.createdAt,
      }, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      });
    }

    const data = await db
      .select({
        id: generus.id,
        nomorUnik: generus.nomorUnik,
        nama: generus.nama,
        tempatLahir: generus.tempatLahir,
        tanggalLahir: generus.tanggalLahir,
        jenisKelamin: generus.jenisKelamin,
        kategoriUsia: generus.kategoriUsia,
        alamat: generus.alamat,
        noTelp: generus.noTelp,
        pendidikan: generus.pendidikan,
        pekerjaan: generus.pekerjaan,
        statusNikah: generus.statusNikah,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        suku: generus.suku,
        foto: generus.foto,
        instagram: generus.instagram,
        desaId: generus.desaId,
        kelompokId: generus.kelompokId,
        namaOrtu: generus.namaOrtu,
        noTelpOrtu: generus.noTelpOrtu,
        kategori: generus.kategori,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
        mandiriDesaNama: mandiriDesa.nama,
        kota: mandiriDaerah.nama,
        createdAt: generus.createdAt,
      })
      .from(generus)
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(eq(generus.id, currentGenerusId))
      .limit(1);

    if (data.length === 0) {
      console.log("Profile API - Generus data not found for ID:", currentGenerusId);
      return NextResponse.json({ error: "Data profil tidak ditemukan" }, { status: 404 });
    }

    // Fetch active activity
    const activeSetting = await db.query.settings.findFirst({
        where: eq(settings.key, "mandiri_active_kegiatan_id")
    });
    const activeKegiatanId = activeSetting?.value || null;

    const mandiriData = activeKegiatanId 
        ? await db.query.mandiri.findFirst({ 
            where: and(
                eq(mandiri.generusId, currentGenerusId),
                eq(mandiri.kegiatanId, activeKegiatanId)
            )
          })
        : await db.query.mandiri.findFirst({ where: eq(mandiri.generusId, currentGenerusId) });

    // Include the current session role and PDKT status in the response
    const profile = {
      ...data[0],
      role: session?.role || "peserta",
      nomorUrut: mandiriData?.nomorUrut || null,
      isInPdkt: !!mandiriData || (session && ["admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "admin_pdkt", "tim_pnkb_gambuh"].includes(session.role))
    };

    // Nonaktifkan cache agar data selalu fresh setelah update
    return NextResponse.json(profile, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.generusId) {
      if (!["admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "creator", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "tim_pnkb_gambuh"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const { nama, desaId, kelompokId } = body;

      let updatedTg: any = null;

      // --- Tim PNKB & Ibu Gambuh: update biodata di tabel timGambuh ---
      if (["tim_pnkb", "tim_pnkb_gambuh"].includes(session.role)) {
        const { timGambuhId, umur, noTelp, tipeTimGambuh, tgDaerahId, tgDesaId, tgKelompokId } = body;

        if (timGambuhId) {
          // Update existing timGambuh record
          const tgUpdate: any = {};
          if (nama !== undefined) tgUpdate.nama = nama;
          if (umur !== undefined) tgUpdate.umur = umur ? Number(umur) : null;
          if (noTelp !== undefined) tgUpdate.noTelp = noTelp;
          if (tipeTimGambuh !== undefined) tgUpdate.tipe = tipeTimGambuh;
          if (tgDaerahId !== undefined) tgUpdate.daerahId = tgDaerahId ? Number(tgDaerahId) : null;
          if (tgDesaId !== undefined) tgUpdate.desaId = tgDesaId ? Number(tgDesaId) : null;
          if (tgKelompokId !== undefined) tgUpdate.kelompokId = tgKelompokId ? Number(tgKelompokId) : null;
          tgUpdate.updatedAt = new Date().toISOString();

          if (Object.keys(tgUpdate).length > 0) {
            await db.update(timGambuh).set(tgUpdate).where(eq(timGambuh.id, timGambuhId));
          }
        }

        // Fetch updated timGambuh data untuk dikembalikan ke frontend
        if (timGambuhId) {
          const tgResults = await db.select({
            id: timGambuh.id,
            nama: timGambuh.nama,
            umur: timGambuh.umur,
            noTelp: timGambuh.noTelp,
            tipe: timGambuh.tipe,
            daerahId: timGambuh.daerahId,
            desaId: timGambuh.desaId,
            kelompokId: timGambuh.kelompokId,
            daerahNama: mandiriDaerah.nama,
            desaNama: mandiriDesa.nama,
            kelompokNama: mandiriKelompok.nama,
          })
          .from(timGambuh)
          .leftJoin(mandiriDaerah, eq(timGambuh.daerahId, mandiriDaerah.id))
          .leftJoin(mandiriDesa, eq(timGambuh.desaId, mandiriDesa.id))
          .leftJoin(mandiriKelompok, eq(timGambuh.kelompokId, mandiriKelompok.id))
          .where(eq(timGambuh.id, timGambuhId))
          .limit(1);
          updatedTg = tgResults[0] || null;
        }
      }

      // Sync nama ke tabel users untuk role apapun
      if (nama) {
        await db.update(users).set({ name: nama }).where(eq(users.id, session.userId));
        await setSession({ ...session, name: nama });
      }

      // Create a new generus record for this admin/pengurus if they don't have one
      // This allows them to have a full profile with photo, birthdate, etc.
      const newGenerusId = uuidv4();
      const nomorUnik = `${session.role === "admin" ? "ADM" : "OFF"}-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Get user's current desa/kelompok if not provided
      const userRecord = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
      const finalDesaId = Number(desaId || userRecord?.desaId || 1);
      const finalKelompokId = Number(kelompokId || userRecord?.kelompokId || 1);

      await db.insert(generus).values({
        id: newGenerusId,
        nomorUnik,
        nama: nama || session.name,
        tempatLahir: body.tempatLahir || "-",
        tanggalLahir: body.tanggalLahir || "-",
        jenisKelamin: body.jenisKelamin || "L",
        kategoriUsia: body.kategoriUsia || "Bekerja",
        alamat: body.alamat || "-",
        noTelp: body.noTelp || "-",
        pendidikan: body.pendidikan || "-",
        pekerjaan: body.pekerjaan || session.role.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        statusNikah: body.statusNikah || "Menikah",
        hobi: body.hobi || "-",
        makananMinumanFavorit: body.makananMinumanFavorit || "-",
        suku: body.suku || "-",
        foto: body.foto || "",
        desaId: finalDesaId,
        kelompokId: finalKelompokId,
        createdBy: session.userId,
      });

      // Link it to the user
      await db.update(users).set({ generusId: newGenerusId, name: nama || session.name }).where(eq(users.id, session.userId));

      // Update session cookie with new generusId and name
      await setSession({ ...session, generusId: newGenerusId, name: nama || session.name });

      // Fetch the full data we just created to return to frontend
      const updatedData = await db
        .select({
          id: generus.id,
          nomorUnik: generus.nomorUnik,
          nama: generus.nama,
          tempatLahir: generus.tempatLahir,
          tanggalLahir: generus.tanggalLahir,
          jenisKelamin: generus.jenisKelamin,
          kategoriUsia: generus.kategoriUsia,
          alamat: generus.alamat,
          noTelp: generus.noTelp,
          pendidikan: generus.pendidikan,
          pekerjaan: generus.pekerjaan,
          statusNikah: generus.statusNikah,
          hobi: generus.hobi,
          makananMinumanFavorit: generus.makananMinumanFavorit,
          suku: generus.suku,
          foto: generus.foto,
          instagram: generus.instagram,
          desaNama: desa.nama,
          kelompokNama: kelompok.nama,
          mandiriDesaNama: mandiriDesa.nama,
          kota: mandiriDaerah.nama,
          createdAt: generus.createdAt,
        })
        .from(generus)
        .leftJoin(desa, eq(generus.desaId, desa.id))
        .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
        .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
        .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
        .where(eq(generus.id, newGenerusId))
        .limit(1);

      return NextResponse.json({ 
        success: true, 
        data: { 
          ...updatedData[0], 
          role: session.role,
          timGambuhId: updatedTg?.id || null,
          umur: updatedTg?.umur || null,
          tipeTimGambuh: updatedTg?.tipe || null,
          tgDaerahId: updatedTg?.daerahId || null,
          tgDesaId: updatedTg?.desaId || null,
          tgKelompokId: updatedTg?.kelompokId || null,
        } 
      });
    }

    const body = await request.json();
    const { nama, tempatLahir, tanggalLahir, jenisKelamin, kategoriUsia, alamat, noTelp, pendidikan, pekerjaan, statusNikah, hobi, makananMinumanFavorit, suku, foto, instagram, namaOrtu, noTelpOrtu, kategori, desaId, kelompokId } = body;

    let updatedTg: any = null;

    if (["tim_pnkb", "tim_pnkb_gambuh"].includes(session.role)) {
      const { timGambuhId, umur, tipeTimGambuh, tgDaerahId, tgDesaId, tgKelompokId } = body;

      if (timGambuhId) {
        // Update existing timGambuh record
        const tgUpdate: any = {};
        if (nama !== undefined) tgUpdate.nama = nama;
        if (umur !== undefined) tgUpdate.umur = umur ? Number(umur) : null;
        if (noTelp !== undefined) tgUpdate.noTelp = noTelp;
        if (tipeTimGambuh !== undefined) tgUpdate.tipe = tipeTimGambuh;
        if (tgDaerahId !== undefined) tgUpdate.daerahId = tgDaerahId ? Number(tgDaerahId) : null;
        if (tgDesaId !== undefined) tgUpdate.desaId = tgDesaId ? Number(tgDesaId) : null;
        if (tgKelompokId !== undefined) tgUpdate.kelompokId = tgKelompokId ? Number(tgKelompokId) : null;
        tgUpdate.updatedAt = new Date().toISOString();

        if (Object.keys(tgUpdate).length > 0) {
          await db.update(timGambuh).set(tgUpdate).where(eq(timGambuh.id, timGambuhId));
        }

        // Fetch updated timGambuh data
        const tgResults = await db.select({
          id: timGambuh.id,
          nama: timGambuh.nama,
          umur: timGambuh.umur,
          noTelp: timGambuh.noTelp,
          tipe: timGambuh.tipe,
          daerahId: timGambuh.daerahId,
          desaId: timGambuh.desaId,
          kelompokId: timGambuh.kelompokId,
          daerahNama: mandiriDaerah.nama,
          desaNama: mandiriDesa.nama,
          kelompokNama: mandiriKelompok.nama,
        })
        .from(timGambuh)
        .leftJoin(mandiriDaerah, eq(timGambuh.daerahId, mandiriDaerah.id))
        .leftJoin(mandiriDesa, eq(timGambuh.desaId, mandiriDesa.id))
        .leftJoin(mandiriKelompok, eq(timGambuh.kelompokId, mandiriKelompok.id))
        .where(eq(timGambuh.id, timGambuhId))
        .limit(1);
        updatedTg = tgResults[0] || null;
      }
    }

    await db
      .update(generus)
      .set({
        nama,
        tempatLahir,
        tanggalLahir,
        jenisKelamin,
        kategoriUsia,
        alamat,
        noTelp,
        pendidikan,
        pekerjaan,
        statusNikah,
        hobi,
        makananMinumanFavorit,
        suku,
        foto,
        instagram,
        namaOrtu,
        noTelpOrtu,
        kategori,
        desaId: desaId ? Number(desaId) : null,
        kelompokId: kelompokId ? Number(kelompokId) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(generus.id, session.generusId));

    // Sinkronkan nama ke tabel users jika berubah
    if (nama) {
      await db.update(users).set({ name: nama }).where(eq(users.generusId, session.generusId));
      // Update session cookie with new name
      await setSession({ ...session, name: nama });
    }

    // Kembalikan data terbaru agar frontend bisa update state langsung tanpa fetch ulang
    const updated = await db
      .select({
        id: generus.id,
        nomorUnik: generus.nomorUnik,
        nama: generus.nama,
        tempatLahir: generus.tempatLahir,
        tanggalLahir: generus.tanggalLahir,
        jenisKelamin: generus.jenisKelamin,
        kategoriUsia: generus.kategoriUsia,
        alamat: generus.alamat,
        noTelp: generus.noTelp,
        pendidikan: generus.pendidikan,
        pekerjaan: generus.pekerjaan,
        statusNikah: generus.statusNikah,
        hobi: generus.hobi,
        makananMinumanFavorit: generus.makananMinumanFavorit,
        suku: generus.suku,
        foto: generus.foto,
        instagram: generus.instagram,
        desaId: generus.desaId,
        kelompokId: generus.kelompokId,
        namaOrtu: generus.namaOrtu,
        noTelpOrtu: generus.noTelpOrtu,
        kategori: generus.kategori,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
        mandiriDesaNama: mandiriDesa.nama,
        kota: mandiriDaerah.nama,
        createdAt: generus.createdAt,
      })
      .from(generus)
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(eq(generus.id, session.generusId))
      .limit(1);

    const baseData = updated[0] ?? null;
    let finalData: any = baseData;
    if (baseData && updatedTg) {
       finalData = {
         ...baseData,
         timGambuhId: updatedTg.id,
         umur: updatedTg.umur,
         tipeTimGambuh: updatedTg.tipe,
         tgDaerahId: updatedTg.daerahId,
         tgDesaId: updatedTg.desaId,
         tgKelompokId: updatedTg.kelompokId,
       };
    }

    return NextResponse.json({ success: true, data: finalData });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Gagal mengupdate profil" }, { status: 500 });
  }
}
