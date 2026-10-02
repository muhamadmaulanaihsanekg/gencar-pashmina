
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as any;

    if (!file || typeof file === "string" || !file.size) {
      return NextResponse.json({ error: "Tidak ada file yang diunggah" }, { status: 400 });
    }

    // Validate MIME type or Extension
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
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

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      // Fallback: simpan langsung ke local public/uploads
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fs = await import("fs");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const ext = path.extname(file.name || "") || ".jpg";
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
      const filePath = path.join(uploadDir, uniqueFilename);
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/${uniqueFilename}`,
        public_id: uniqueFilename,
      });
    }

    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const folder = "uploads";
    const transformation = "c_limit,h_800,w_800/q_auto:good";
    
    // Sort parameters alphabetically for signature: folder, timestamp, transformation
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}&transformation=${transformation}${apiSecret}`;
    
    // Generate SHA-1 signature using Edge Crypto
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append("file", file);
    cloudinaryFormData.append("api_key", apiKey);
    cloudinaryFormData.append("timestamp", timestamp);
    cloudinaryFormData.append("signature", signature);
    cloudinaryFormData.append("folder", folder);
    cloudinaryFormData.append("transformation", transformation);
    
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: cloudinaryFormData,
    });

    const result = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(result.error?.message || "Gagal mengupload foto");
    }

    let secureUrl = result.secure_url;
    if (secureUrl && /\.(heic|heif)$/i.test(secureUrl)) {
      secureUrl = secureUrl.replace(/\.(heic|heif)$/i, ".jpg");
    }

    return NextResponse.json({
      success: true,
      url: secureUrl,
      public_id: result.public_id,
    });
  } catch (error: any) {
    console.error("Cloudinary upload error details:", error);
    return NextResponse.json(
      {
        error: "Gagal mengupload foto. Silakan coba lagi.",
      },
      { status: 500 }
    );
  }
}
