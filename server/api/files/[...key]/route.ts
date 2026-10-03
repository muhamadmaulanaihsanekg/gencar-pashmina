import { NextRequest, NextResponse } from "next/server";

type Env = { BUCKET?: R2Bucket };

/**
 * Menyajikan file dari R2: /api/files/uploads/<nama>
 * Dipakai bila bucket tidak punya domain publik sendiri.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { key: string[] | string } }
) {
  const env = ((globalThis as unknown as { __env?: Env }).__env ?? {}) as Env;
  if (!env.BUCKET) {
    return NextResponse.json({ error: "Penyimpanan media tidak tersedia" }, { status: 503 });
  }

  const raw = params.key;
  const key = (Array.isArray(raw) ? raw.join("/") : String(raw || "")).replace(/^\/+/, "");
  if (!key) return NextResponse.json({ error: "Key kosong" }, { status: 400 });

  const object = await env.BUCKET.get(key);
  if (!object) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }

  return new Response(object.body, { headers });
}
