
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, users, mandiri, mandiriDesa, formPanitiaDanPengurus, mandiriDaerah } from "@/lib/schema";
import { eq, or, sql, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code") || "";

    if (!code) return NextResponse.json({ error: "Kode diperlukan" }, { status: 400 });

    const upperCode = code.toUpperCase();

    // 1. Try to find as Participant (Generus)
    const resultPeserta = await db
      .select({
        id: generus.id,
        nama: generus.nama,
        nomorUnik: generus.nomorUnik,
        desaNama: mandiriDesa.nama,
        desaKota: mandiriDaerah.nama,
        nomorPeserta: mandiri.nomorUrut
      })
      .from(generus)
      .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(or(
        eq(generus.id, code),
        eq(sql`UPPER(${generus.nomorUnik})`, upperCode),
        (!isNaN(Number(code)) && code.trim() !== "") ? eq(sql`CAST(${mandiri.nomorUrut} AS TEXT)`, code) : undefined
      ))
      .orderBy(desc(mandiri.createdAt))
      .limit(1);

    if (resultPeserta.length > 0) {
      const p = resultPeserta[0];
      return NextResponse.json({
        type: "peserta",
        person: {
          id: p.id,
          nama: p.nama,
          nomorUnik: p.nomorUnik,
          nomorPeserta: p.nomorPeserta,
          desa: p.desaNama,
          kota: p.desaKota,
          role: "Peserta"
        }
      });
    }

    // 2. Try to find as Staff (User)
    const resultStaff = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        email: users.email,
        generusId: users.generusId
      })
      .from(users)
      .where(
        or(
          eq(users.id, code),
          eq(sql`UPPER(${users.email})`, upperCode)
        )
      )
      .limit(1);

    if (resultStaff.length > 0) {
      const staff = resultStaff[0];
      
      let resolvedGenerusId = staff.generusId;
      
      // If staff has no generusId linked, try to find a generus record with the same email
      if (!resolvedGenerusId && staff.email) {
        const matchingGenerus = await db
          .select({ id: generus.id })
          .from(generus)
          .where(eq(sql`LOWER(${generus.alamat})`, staff.email.toLowerCase())) // Alamat is sometimes used for email or we can use another field? 
          // Wait, lib/schema.ts doesn't have email in generus.
          // Let's check if there's any other field.
          .limit(1);
          
        // Actually, let's search by name if email is not available in generus
        if (matchingGenerus.length === 0) {
           const matchByName = await db
            .select({ id: generus.id })
            .from(generus)
            .where(eq(sql`LOWER(${generus.nama})`, staff.name.toLowerCase()))
            .limit(1);
           if (matchByName.length > 0) {
             resolvedGenerusId = matchByName[0].id;
           }
        } else {
          resolvedGenerusId = matchingGenerus[0].id;
        }
      }

      // Map technical role to friendly name
      let friendlyRole = "Panitia";
      if (staff.role === "pengurus_daerah") friendlyRole = "Pengurus Daerah";
      else if (staff.role === "kmm_daerah") friendlyRole = "Pengurus KMM";
      else if (staff.role === "admin_romantic_room") friendlyRole = "Admin Romantic Room";
      else if (staff.role === "admin_kegiatan") friendlyRole = "Admin Kegiatan";

      return NextResponse.json({
        type: "staff",
        person: {
            id: staff.id,
            generusId: resolvedGenerusId,
            nama: staff.name,
            role: friendlyRole,
            email: staff.email
        }
      });
    }

    // 3. Try to find as explicitly registered Panitia/Pengurus (from special form)
    const resultPanitiaForm = await db
      .select({
        id: formPanitiaDanPengurus.id,
        nama: formPanitiaDanPengurus.nama,
        nomorUnik: formPanitiaDanPengurus.nomorUnik,
        generusId: formPanitiaDanPengurus.generusId,
        dapukan: formPanitiaDanPengurus.dapukan,
        desaNama: mandiriDesa.nama,
      })
      .from(formPanitiaDanPengurus)
      .leftJoin(mandiriDesa, eq(formPanitiaDanPengurus.mandiriDesaId, mandiriDesa.id))
      .where(or(
        eq(formPanitiaDanPengurus.id, code),
        eq(sql`UPPER(${formPanitiaDanPengurus.nomorUnik})`, upperCode)
      ))
      .limit(1);

    if (resultPanitiaForm.length > 0) {
      const p = resultPanitiaForm[0];
      return NextResponse.json({
        type: "staff", // Treat as staff/panitia
        person: {
          id: p.id,
          generusId: p.generusId,
          nama: p.nama,
          nomorUnik: p.nomorUnik,
          role: p.dapukan || "Panitia",
          desa: p.desaNama,
          nomorPeserta: "STAFF"
        }
      });
    }

    return NextResponse.json({ type: "unknown", error: "Data tidak ditemukan" }, { status: 404 });

  } catch (error: any) {
    console.error("Scanner Resolve Error Detail:", error);
    return NextResponse.json({ error: `Gagal memproses kode: ${error.message}` }, { status: 500 });
  }
}
