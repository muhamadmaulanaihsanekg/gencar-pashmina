/**
 * Client-side direct upload to Cloudflare R2 via Worker authorization.
 * Direct browser PUT reduces worker compute and memory load.
 */

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadToR2(file: File): Promise<UploadResult> {
  // 1. Request signed direct upload URL from backend
  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.error || "Gagal mendapatkan izin upload");
  }

  const { uploadUrl, key, publicUrl } = await signRes.json();

  // 2. Direct PUT to R2 via authorized uploadUrl
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Gagal mengunggah file ke storage R2");
  }

  return { url: publicUrl, key };
}
