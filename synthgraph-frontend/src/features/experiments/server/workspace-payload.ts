import "server-only";
import { BackendApiError } from "@/shared/http/errors";
import type { EnrichedGeneration } from "../types/experiment-workspace";

/**
 * Why a manifest is missing, so the Reproduction tab can say "rate limited,
 * retry" instead of presenting a transient failure as a property of the
 * generation (it used to be swallowed into "unknown").
 */
export function manifestFailure(error: unknown): NonNullable<EnrichedGeneration["manifestError"]> {
  return error instanceof BackendApiError && error.status === 429 ? "rate_limited" : "failed";
}

/** Elapsed milliseconds since this was called, for load-time logging. */
export function stopwatch(): () => number {
  const startedAt = performance.now();
  return () => Math.round(performance.now() - startedAt);
}
