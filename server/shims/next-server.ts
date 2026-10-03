/**
 * Shim `next/server` untuk Cloudflare Worker.
 *
 * Route lama di server/api/**  route.ts ditulis dengan API Next.js.
 * Modul ini menggantikannya saat bundling Worker (lihat [alias] di wrangler.toml),
 * sehingga 12.000+ LOC tidak perlu ditulis ulang.
 */

type JsonInit = {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
};

export class NextResponse extends Response {
  // Statics dideklarasikan ulang dengan tipe base agar `extends Response` valid,
  // tapi tetap menerima bentuk Next.js: NextResponse.json(data, 401).
  static json = ((data: unknown, init?: JsonInit | number): Response => {
    const opts: JsonInit = typeof init === "number" ? { status: init } : (init ?? {});
    const headers = new Headers(opts.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return new Response(JSON.stringify(data), {
      status: opts.status ?? 200,
      statusText: opts.statusText,
      headers,
    });
  }) as typeof Response.json;

  static redirect = ((url: string | URL, status = 307): Response =>
    new Response(null, { status, headers: { location: String(url) } })) as typeof Response.redirect;

  static next(): Response {
    return new Response(null, { status: 200 });
  }
}

/** NextRequest hanyalah Request + helper nextUrl. */
export class NextRequest extends Request {
  get nextUrl() {
    return new URL(this.url);
  }
}
