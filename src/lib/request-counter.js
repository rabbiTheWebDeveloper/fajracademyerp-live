/**
 * request-counter.js
 *
 * In-memory request counter for the current Node.js process.
 * Uses global to survive hot-module-reloads in Next.js dev mode.
 * Resets on process restart.
 */

if (!global.__reqStats) {
  global.__reqStats = {
    total:     0,
    success:   0,    // 2xx
    redirect:  0,    // 3xx
    clientErr: 0,    // 4xx
    serverErr: 0,    // 5xx
    byMethod:  { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0, OTHER: 0 },
    startedAt: Date.now(),
    lastResetAt: Date.now(),
  };
}

/** @returns {typeof global.__reqStats} */
export function getRequestStats() {
  return global.__reqStats;
}

/**
 * Record a completed request.
 * @param {string} method   - HTTP method (GET, POST, …)
 * @param {number} status   - HTTP status code
 */
export function recordRequest(method = "GET", status = 200) {
  const s = global.__reqStats;
  s.total++;

  if (status >= 500)      s.serverErr++;
  else if (status >= 400) s.clientErr++;
  else if (status >= 300) s.redirect++;
  else                    s.success++;

  const m = method.toUpperCase();
  if (m in s.byMethod) s.byMethod[m]++;
  else                 s.byMethod.OTHER++;
}

/** Reset the counter (admin action). */
export function resetRequestStats() {
  const s = global.__reqStats;
  s.total     = 0;
  s.success   = 0;
  s.redirect  = 0;
  s.clientErr = 0;
  s.serverErr = 0;
  s.byMethod  = { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0, OTHER: 0 };
  s.lastResetAt = Date.now();
}
