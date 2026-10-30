export type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

/**
 * Turns a promise into one that never rejects, so work started early cannot
 * become an unhandled rejection while the caller is still awaiting something
 * else; the caller decides what a failure means once it is ready to look.
 */
export function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  return promise.then(
    (value): Settled<T> => ({ ok: true, value }),
    (error: unknown): Settled<T> => ({ ok: false, error }),
  );
}
