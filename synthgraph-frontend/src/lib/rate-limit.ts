/**
 * A small fixed-window rate limiter, keyed by client IP.
 *
 * The demo endpoint is unauthenticated and sends two emails per accepted
 * request, so without a cap a trivial loop can flood the team inbox and burn
 * the mail quota. The honeypot only stops bots that fill hidden fields; this
 * stops everything else.
 *
 * Deliberately in-memory: it holds per server instance, so a deployment spread
 * across several instances enforces the limit per instance rather than
 * globally, and a restart clears it. That is a weaker guarantee than a shared
 * store like Redis, and still enough to make flooding cost something. Swap the
 * store here if the endpoint ever needs a hard global cap.
 */

type Window = { count: number; resetAt: number };

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const windows = new Map<string, Window>();

/** Drops windows that have already expired, so the map cannot grow forever. */
function evictExpired(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the caller may try again. Only meaningful when blocked. */
  retryAfter: number;
};

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();

  // Cheap enough at this volume, and it keeps the map bounded without a timer
  // that would hold the process open.
  if (windows.size > 1000) evictExpired(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > MAX_PER_WINDOW) {
    return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfter: 0 };
}

/**
 * Best-effort client address.
 *
 * x-forwarded-for is client-controlled unless a proxy overwrites it, which is
 * what Vercel and most hosts do. The leftmost entry is the original client.
 * Falling back to a shared key means a misconfigured host rate-limits everyone
 * together rather than not at all — the safe direction to fail for a form.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
