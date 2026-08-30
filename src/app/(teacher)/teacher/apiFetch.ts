/**
 * Thin fetch wrapper for teacher portal API calls.
 * - Automatically redirects to /login on 401 (without overriding window.fetch globally)
 * - Lightweight SessionStorage cache for GET requests (configurable TTL)
 */

const CACHE_PREFIX = "tp_cache_";

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

/**
 * apiFetch — drop-in fetch replacement for teacher portal.
 * @param url     API endpoint
 * @param options Standard fetch options
 * @param ttlMs   Cache TTL in ms for GET requests (default 0 = no cache)
 */
export async function apiFetch(
  url: string,
  options?: RequestInit,
  ttlMs = 0
): Promise<any> {
  const isGet = !options?.method || options.method.toUpperCase() === "GET";

  // ── Read from sessionStorage cache (GET only) ─────────────────────────────
  if (isGet && ttlMs > 0 && typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem(CACHE_PREFIX + url);
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        if (Date.now() < entry.expiresAt) {
          return entry.data;
        }
        sessionStorage.removeItem(CACHE_PREFIX + url);
      }
    } catch {
      // sessionStorage unavailable (private mode) — fall through
    }
  }

  const res = await fetch(url, options);

  // ── Auth guard — redirect without overriding window.fetch globally ─────────
  if (res.status === 401) {
    window.location.replace("/login");
    // Return a never-resolving promise so callers don't process stale data
    return new Promise(() => {});
  }

  const data = await res.json();

  // ── Write to sessionStorage cache (GET, successful responses only) ─────────
  if (isGet && ttlMs > 0 && res.ok && typeof window !== "undefined") {
    try {
      const entry: CacheEntry = { data, expiresAt: Date.now() + ttlMs };
      sessionStorage.setItem(CACHE_PREFIX + url, JSON.stringify(entry));
    } catch {
      // Storage quota exceeded — silently skip caching
    }
  }

  return data;
}

/** Invalidate a cached endpoint (call after mutations) */
export function invalidateCache(url: string) {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(CACHE_PREFIX + url); } catch {}
}

/** Invalidate all teacher portal cache entries */
export function clearTeacherCache() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}
