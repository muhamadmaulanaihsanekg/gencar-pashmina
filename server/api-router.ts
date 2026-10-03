/**
 * Auto-router: memetakan server/api/**\/route.ts (gaya Next.js) ke Hono.
 *
 * Route lama tetap utuh; router ini hanya mendispatch berdasarkan HTTP method
 * dan meneruskan `{ params }` seperti yang diharapkan handler Next.js.
 */
import { Hono, type Context } from "hono";
import { NextRequest, NextResponse } from "next/server";
import { requestStore } from "next/headers";
import { apiRoutes } from "./generated/api-manifest";

/**
 * Nama cookie disamakan dengan worker/middleware/auth.ts (`session`).
 * Handler lama menulis `auth-token` lewat lib/auth.ts; kita tulis keduanya
 * supaya sesi berlaku baik untuk route lama maupun route Hono.
 */
const COOKIE_ALIAS: Record<string, string> = { "auth-token": "session" };

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"] as const;

/**
 * Static route harus didaftarkan sebelum dynamic, jika tidak
 * `/api/mandiri/kunjungan/manual` akan tertangkap oleh `:pemilihanId`.
 */
function dynamicSegmentCount(p: string) {
  return p.split("/").filter((s) => s.startsWith(":")).length;
}

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export const apiRouter = new Hono<{ Bindings: Record<string, unknown>; Variables: { user?: unknown } }>();

apiRouter.use("/*", async (c, next) => {
  // lib/db.ts mencari binding D1 lewat globalThis.__env.
  (globalThis as unknown as { __env: unknown }).__env = c.env;
  await requestStore.run(
    { cookie: c.req.raw.headers.get("cookie") ?? "", headers: c.req.raw.headers, setCookies: [] },
    next
  );
});

const sorted = [...apiRoutes].sort(
  (a, b) => dynamicSegmentCount(a.path) - dynamicSegmentCount(b.path)
);

for (const route of sorted) {
  for (const method of HTTP_METHODS) {
    const handler = route.mod[method];
    if (typeof handler !== "function") continue;

    apiRouter.on(method, route.path, async (c: Context) => {
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(c.req.param() as Record<string, string>)) {
        params[k] = v;
      }
      const setCookies: string[] = [];
      const req = new NextRequest(c.req.raw);
      const res = await requestStore.run(
        { cookie: c.req.raw.headers.get("cookie") ?? "", headers: c.req.raw.headers, setCookies },
        () =>
          (handler as (r: Request, ctx: { params: Record<string, string> }) => Promise<Response>)(req, {
            params,
          })
      );
      return withCookies(res instanceof Response ? res : notFound(), setCookies);
    });
  }

  // HEAD fallback ke GET bila tidak didefinisikan (perilaku Next.js).
  if (typeof route.mod.GET === "function" && typeof route.mod.HEAD !== "function") {
    apiRouter.on("HEAD", route.path, async (c: Context) => {
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(c.req.param() as Record<string, string>)) {
        params[k] = v;
      }
      const setCookies: string[] = [];
      const req = new NextRequest(c.req.raw);
      return withCookies(
        await requestStore.run(
          { cookie: c.req.raw.headers.get("cookie") ?? "", headers: c.req.raw.headers, setCookies },
          () => (route.mod.GET as any)(req, { params })
        ),
        setCookies
      );
    });
  }
}

/** Tempelkan cookie yang di-set handler ke response, termasuk alias `session`. */
function withCookies(res: Response, setCookies: string[]): Response {
  if (!setCookies.length) return res;
  const headers = new Headers(res.headers);
  const all = [...setCookies];
  for (const c of setCookies) {
    const name = c.slice(0, c.indexOf("="));
    const alias = COOKIE_ALIAS[name];
    if (alias) all.push(alias + c.slice(name.length));
  }
  for (const c of all) headers.append("set-cookie", c);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
