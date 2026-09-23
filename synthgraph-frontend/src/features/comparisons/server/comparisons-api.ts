import "server-only";
import { backendFetch } from "@/shared/http/http";
import type { GenerationComparison, TrainingRunComparison } from "../types/comparison";

/**
 * Deliberately no Route Handler wraps this — POST /generations/compare has
 * no persisted side effect (a stateless query over ids the caller already
 * holds), so the /dashboard/compare Server Component calls it directly,
 * like every other read, rather than adding an unnecessary client-fetch
 * round trip for something that isn't really a mutation.
 */
export function compareGenerations(
  apiKey: string,
  generationIds: string[],
): Promise<GenerationComparison> {
  return backendFetch("/generations/compare", {
    method: "POST",
    body: { generationIds },
    token: apiKey,
  });
}

/** Same reasoning as compareGenerations - no persisted side effect, called
 * directly from the /dashboard/compare/runs Server Component. */
export function compareTrainingRuns(
  apiKey: string,
  trainingRunIds: string[],
): Promise<TrainingRunComparison> {
  return backendFetch("/training-runs/compare", {
    method: "POST",
    body: { trainingRunIds },
    token: apiKey,
  });
}
