import { NextRequest, NextResponse } from "next/server";

// Max file size: 5 MB (in bytes)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types for photo uploads
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/jpg", "image/pjpeg",
  "image/png", "image/x-png",
  "image/webp",
  "image/heic", "image/heif", "image/heic-sequence",
  "application/octet-stream" // Fallback for some mobile uploads
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

type Env = { BUCKET?: R2Bucket; R2_PUBLIC_URL?: string };

function getEnv(): Env {
  return ((globalThis as unknown as { __env?: Env }).__env ?? {}) as Env;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as any;

    if (!file || typeof file === "string" || !file.size) {
      return NextResponse.json({ error: "Tidak ada file yang diunggah" }, { status: 400 });
    }

    // Validate MIME type or Extension
    const fileType = String(file.type || "").toLowerCase();
    const fileName = String(file.name || "").toLowerCase();
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(fileType);
    const isAllowedExt = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (!isAllowedMime && !isAllowedExt) {
      return NextResponse.json(
        { error: `Tipe file tidak didukung: ${file.type || "unknown"}. Gunakan JPG, PNG, atau WEBP.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal 5 MB.` },
        { status: 400 }
      );
    }

    const { BUCKET, R2_PUBLIC_URL } = getEnv();
    if (!BUCKET) {
      return NextResponse.json(
        { error: "Penyimpanan media tidak tersedia (binding R2 BUCKET tidak ada)" },
        { status: 503 }
      );
    }

    const ext = (fileName.match(/\.[a-z0-9]+$/) || [".jpg"])[0];
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    const key = `uploads/${uniqueFilename}`;

    await BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || "image/jpeg",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const origin = host ? `${proto}://${host}` : "https://pashmina.gencar.my.id";

    // R2_PUBLIC_URL dipakai bila bucket punya custom domain terverifikasi.
    // Default: file disajikan langsung oleh Worker di domain pashmina lewat /api/files/<key>.
    let url: string;
    if (R2_PUBLIC_URL && !R2_PUBLIC_URL.includes("media.gencar.my.id")) {
      url = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
    } else {
      url = `${origin}/api/files/${key}`;
    }

    return NextResponse.json({
      success: true,
      url,
      public_id: key,
    });
  } catch (error: any) {
    console.error("R2 upload error:", error);
    return NextResponse.json(
      { error: "Gagal mengupload foto. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
