import "server-only";
import { listEvaluationResults } from "@/features/evaluation-results/server/evaluation-results-api";
import {
  getExperimentTrainingRunDrift,
  getExperimentTrainingRunHealth,
  getTrainingRunDrift,
  getTrainingRunHealth,
} from "@/features/reports/server/reports-api";
import { listTrainingRunMetrics } from "@/features/training-runs/server/training-run-metrics-api";
import { listTrainingRunsForExperiment } from "@/features/training-runs/server/training-runs-api";
import { NotFoundError } from "@/shared/http/errors";
import type { EnrichedTrainingRun } from "../types/experiment-workspace";

/**
 * An experiment's training runs, each with its metrics, evaluations, health and
 * drift.
 *
 * Health and drift for every run come from one request each. A backend that
 * predates those routes answers 404 for them, and then each run's report is
 * fetched on its own (the old behaviour), so the frontend can ship ahead of the
 * backend. Any other failure fails the page, as a failed per-run call always did.
 *
 * Health and drift no longer wait for the run list, so they travel in the same
 * round trip as it; only metrics and evaluations still need the list's ids.
 */
export async function loadEnrichedTrainingRuns(apiKey: string, experimentId: string): Promise<EnrichedTrainingRun[]> {
  const [runs, healthBatch, driftBatch] = await Promise.all([
    listTrainingRunsForExperiment(apiKey, experimentId),
    getExperimentTrainingRunHealth(apiKey, experimentId).then(
      (report) => new Map(report.runs.map((health) => [health.trainingRunId, health])),
      keepNotFound,
    ),
    getExperimentTrainingRunDrift(apiKey, experimentId).then(
      (report) => new Map(report.runs.map((drift) => [drift.trainingRunId, drift])),
      keepNotFound,
    ),
  ]);

  return Promise.all(
    runs.map(async (run) => {
      // A run the batch did not cover (an old backend, or one created after it
      // was read) is fetched on its own rather than shown without its report.
      const [metrics, evaluations, health, drift] = await Promise.all([
        listTrainingRunMetrics(apiKey, run.id),
        listEvaluationResults(apiKey, run.id),
        healthBatch?.get(run.id) ?? getTrainingRunHealth(apiKey, run.id),
        driftBatch?.get(run.id) ?? getTrainingRunDrift(apiKey, run.id),
      ]);
      return { run, metrics, evaluations, health, drift };
    }),
  );
}

/** A 404 means "this backend has no such route yet": carry on without the batch. */
function keepNotFound(error: unknown): null {
  if (error instanceof NotFoundError) return null;
  throw error;
}
