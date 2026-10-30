/**
 * Collects how long named parts of one request took and renders them as a
 * `Server-Timing` header (`name;dur=12.3, other;dur=4.0`), so a slow response
 * can be attributed to a part instead of guessed at.
 *
 * Parts that run at the same time overlap, so their durations do not add up to
 * the total; read each as "how long this part took on its own".
 */
export class ServerTimings {
  private readonly entries: Array<{ name: string; ms: number }> = [];

  /** Runs `work`, records how long it took under `name`, and returns its result (or rethrows). */
  async measure<T>(name: string, work: () => Promise<T>): Promise<T> {
    const startedAt = performance.now();
    try {
      return await work();
    } finally {
      this.record(name, performance.now() - startedAt);
    }
  }

  record(name: string, ms: number): void {
    this.entries.push({ name: toToken(name), ms });
  }

  /** The header value, or an empty string when nothing was recorded. */
  header(): string {
    return this.entries
      .map(({ name, ms }) => `${name};dur=${ms.toFixed(1)}`)
      .join(', ');
  }
}

// A Server-Timing metric name is an HTTP token; keep only characters that are
// always valid so a caller-supplied name can never produce a malformed header.
function toToken(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, '_');
}
