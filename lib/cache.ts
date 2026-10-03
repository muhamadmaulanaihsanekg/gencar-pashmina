/**
 * ─── Security Caching Utilities ────────────────────────────────────
 * 
 * Modul ini menangani memori & caching untuk kebutuhan sekuritas
 * secara efisien, khusus didesain untuk Next.js Edge & Node.js env.
 */

// Simple LRU Cache implementation without external dependencies 
// (Safe for Edge runtime). Can be used to store rate-limit states, 
// blocked IPs, or revoked tokens (JWT blocklist).
export class LRUCache<T> {
  private max: number;
  private cache: Map<string, { value: T; expiresAt: number }>;

  constructor(max: number = 1000) {
    this.max = max;
    this.cache = new Map();
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh position to act as LRU
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      // Delete oldest entry (Map iterates in insertion order)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  // Hapus semua expired entry untuk membersihkan memori
  purgeStale(): void {
    const now = Date.now();
    this.cache.forEach((item, key) => {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    });
  }
}

// ── Rate Limiter Instance ──────────────────────────────────────────
// Cache maksimal 5000 IP address untuk mencegah Memory Leak dari bot.
// TTL default bisa bervariasi bergantung pemanggilan.
// ponytail: state ini per-isolate (in-memory), jadi limit/revoke tidak global di
// Cloudflare Workers. Cukup untuk meredam brute-force; upgrade ke Durable Object
// atau KV bila butuh limit yang benar-benar konsisten antar-isolate.
const rateLimitCache = new LRUCache<{ count: number }>(5000);

export function checkRateLimit(
  ip: string,
  limit: number = 10,
  windowMs: number = 60_000
): { success: boolean; current: number } {
  // Purge secara lazy setiap ~10 request baru 
  if (Math.random() < 0.1) rateLimitCache.purgeStale();

  const record = rateLimitCache.get(ip);
  if (!record) {
    rateLimitCache.set(ip, { count: 1 }, windowMs);
    return { success: true, current: 1 };
  }

  record.count++;
  // Update state without refreshing expiration (keep original window)
  rateLimitCache.set(ip, record, windowMs); // In real LRU we preserve expiresAt, here it resets (sliding window) - acceptable for security

  return { 
    success: record.count <= limit, 
    current: record.count 
  };
}

// ── Revoked Tokens Cache ───────────────────────────────────────────
// Digunakan untuk logout/invalidate token lebih awal dari umur aslinya (7 hari).
const revokedTokens = new LRUCache<boolean>(2000);

export function revokeToken(token: string, tokenAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
  revokedTokens.set(token, true, tokenAgeMs);
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.get(token) === true;
}
