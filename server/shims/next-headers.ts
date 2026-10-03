/**
 * Shim `next/headers` untuk Cloudflare Worker.
 *
 * `cookies()` di Next.js membaca/menulis cookie request yang sedang berjalan
 * secara implisit. Di Worker tidak ada context implisit itu, jadi kita pakai
 * AsyncLocalStorage yang diisi middleware (lihat server/api-router.ts).
 *
 * Cookie yang di-set dikumpulkan di `setCookies`, lalu api-router menempelkannya
 * ke response — pengganti perilaku `cookies().set()` Next.js.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none" | boolean;
  maxAge?: number;
  path?: string;
  domain?: string;
};

type Store = { cookie: string; headers: Headers; setCookies: string[] };

export const requestStore = new AsyncLocalStorage<Store>();

function esc(name: string) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCookie(name: string, value: string, opts: CookieOptions = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (opts.sameSite !== undefined) {
    const v =
      opts.sameSite === true ? "Strict" : opts.sameSite === false ? "Lax" : opts.sameSite;
    parts.push(`SameSite=${v.charAt(0).toUpperCase()}${v.slice(1)}`);
  }
  return parts.join("; ");
}

export function cookies() {
  const store = requestStore.getStore();
  const raw = store?.cookie ?? "";
  return {
    get(name: string) {
      const m = raw.match(new RegExp("(?:^|;\\s*)" + esc(name) + "=([^;]*)"));
      return m ? { name, value: decodeURIComponent(m[1]) } : undefined;
    },
    has(name: string) {
      return new RegExp("(?:^|;\\s*)" + esc(name) + "=").test(raw);
    },
    set(name: string, value: string, opts?: CookieOptions) {
      store?.setCookies.push(buildCookie(name, value, opts));
    },
    delete(name: string) {
      store?.setCookies.push(buildCookie(name, "", { maxAge: 0 }));
    },
    getAll() {
      return [];
    },
  };
}

export function headers() {
  return requestStore.getStore()?.headers ?? new Headers();
}

export function draftMode() {
  return { isEnabled: false, enable() {}, disable() {} };
}
