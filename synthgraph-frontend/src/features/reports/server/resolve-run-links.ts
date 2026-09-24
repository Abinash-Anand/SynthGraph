import "server-only";
import { getExperiment } from "@/features/experiments/server/experiments-api";
import { getTrainingRun } from "@/features/training-runs/server/training-runs-api";

export type RunLink = { projectId: string; experimentId: string };

/**
 * Resolves each training run id to the project/experiment it belongs to,
 * so a report row (which only ever carries a bare trainingRunId) can link
 * back into the workspace instead of dead-ending. Two-hop (run ->
 * experiment -> project) since neither report includes experimentId
 * directly - each hop is batched with Promise.all rather than resolved
 * serially, matching this codebase's existing N+1-avoidance convention
 * (see ListTrainingRunsService / the search-results page's own
 * experiment-id resolution).
 */
export async function resolveRunLinks(
  apiKey: string,
  trainingRunIds: string[],
): Promise<Record<string, RunLink>> {
  const uniqueRunIds = Array.from(new Set(trainingRunIds));
  if (uniqueRunIds.length === 0) return {};

  const runs = await Promise.all(uniqueRunIds.map((id) => getTrainingRun(apiKey, id).catch(() => null)));
  const experimentIdByRunId = new Map<string, string>();
  for (const run of runs) {
    if (run) experimentIdByRunId.set(run.id, run.experimentId);
  }

  const uniqueExperimentIds = Array.from(new Set(experimentIdByRunId.values()));
  const experiments = await Promise.all(
    uniqueExperimentIds.map((id) => getExperiment(apiKey, id).catch(() => null)),
  );
  const projectIdByExperimentId = new Map<string, string>();
  for (const experiment of experiments) {
    if (experiment) projectIdByExperimentId.set(experiment.id, experiment.projectId);
  }

  const result: Record<string, RunLink> = {};
  for (const [runId, experimentId] of experimentIdByRunId) {
    const projectId = projectIdByExperimentId.get(experimentId);
    if (projectId) result[runId] = { projectId, experimentId };
  }
  return result;
}
