import { createHash } from 'node:crypto';

type RequestLike = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

/** Which client a request is counted against by IP alone. */
export function ipTracker(req: RequestLike): string {
  return `ip:${req.ip ?? 'unknown'}`;
}

/**
 * Which caller a request is counted against for ordinary API traffic.
 *
 * Every dashboard page render reaches this backend from the one frontend
 * server, so by IP alone every signed-in user shares a single bucket and one
 * busy workspace load can starve everyone else's (and its own later calls).
 * The bearer credential identifies the real caller, so it keys the bucket;
 * only a digest is kept, never the credential itself. Requests with no bearer
 * (login, register, health) fall back to the IP.
 *
 * A bogus bearer just gets a fresh bucket, which is why this must never be the
 * only limit: `ipTracker` backs it with a much higher per-IP ceiling, and the
 * credential-guessing routes pin themselves to the IP outright.
 */
export function bearerTracker(req: RequestLike): string {
  const header = req.headers?.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  const match = typeof value === 'string' ? /^Bearer\s+(\S+)$/i.exec(value) : null;
  if (!match) return ipTracker(req);
  return `key:${createHash('sha256').update(match[1]).digest('hex').slice(0, 32)}`;
}
