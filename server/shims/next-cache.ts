/**
 * Shim `next/cache` untuk Cloudflare Worker.
 *
 * Halaman dashboard sudah statis (SPA) dan data selalu di-fetch ulang oleh klien,
 * jadi revalidate tidak diperlukan. No-op cukup.
 */
export function revalidatePath(_path?: string, _type?: string) {}
export function revalidateTag(_tag?: string) {}
export function unstable_cache<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}
