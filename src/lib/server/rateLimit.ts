import "server-only";

// Sliding-window limiter kept in memory. On Vercel each function instance has its own
// memory, so this is a best-effort abuse guard, not a product limit (see ADR-5).
const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_KEYS) {
    for (const [storedKey, times] of hits) {
      if (times.every((time) => now - time >= windowMs)) hits.delete(storedKey);
    }
  }
  return false;
}

export const LIMITS = {
  topics: { limit: 15, windowMs: 10 * 60_000 },
  questions: { limit: 40, windowMs: 10 * 60_000 },
};
