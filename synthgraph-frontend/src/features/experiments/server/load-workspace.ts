import "server-only";
import type { Generation } from "@/features/generations/types/generation";
import type { ReproductionManifest } from "@/features/reproduction/types/reproduction-manifest";
import type { EvaluationResult } from "@/features/evaluation-results/types/evaluation-result";
import { getParameterCorrelationReport } from "@/features/reports/server/reports-api";
import type {
  ParameterCorrelationReport,
  TrainingRunDriftReport,
  TrainingRunHealthReport,
} from "@/features/reports/types/report";
import type { TrainingRun } from "@/features/training-runs/types/training-run";
import type { TrainingRunMetric } from "@/features/training-runs/types/training-run-metric";
import { backendFetch, type BackendCallTiming } from "@/shared/http/http";
import { NotFoundError } from "@/shared/http/errors";
import { slimGeneration } from "../slim-generation";
import type { Experiment } from "../types/experiment";
import type { EnrichedGeneration, EnrichedTrainingRun } from "../types/experiment-workspace";
import { loadEnrichedGenerations } from "./enriched-generations";
import { loadEnrichedTrainingRuns } from "./enriched-training-runs";
import { getExperimentForProject } from "./experiments-api";

export type ExperimentWorkspaceData = {
  experiment: Experiment;
  correlationReport: ParameterCorrelationReport;
  trainingRuns: EnrichedTrainingRun[];
  generations: EnrichedGeneration[];
  /**
   * How the data was loaded: the one workspace request (with how long it took
   * and the backend's per-part breakdown), or the separate routes.
   */
  load: { source: "workspace"; call: BackendCallTiming } | { source: "separate" };
};

/** What `GET /experiments/:id/workspace` returns: each part as its own route would have returned it. */
type WorkspaceResponse = {
  experiment: Experiment;
  correlation: ParameterCorrelationReport;
  trainingRuns: Array<{
    run: TrainingRun;
    metrics: TrainingRunMetric[];
    evaluations: EvaluationResult[];
    health: TrainingRunHealthReport;
    drift: TrainingRunDriftReport;
  }>;
  generations: Array<{ generation: Generation; manifest: ReproductionManifest }>;
};

/**
 * Everything the experiment workspace shows, in as few backend round trips as
 * the backend allows.
 *
 * A backend with the workspace route answers it in one request. One that
 * predates it answers 404 for the route, and then the page is assembled from
 * the separate routes exactly as before, so the frontend can ship ahead of the
 * backend. A missing or foreign experiment is a 404 either way.
 */
export async function loadExperimentWorkspace(
  apiKey: string,
  projectId: string,
  experimentId: string,
): Promise<ExperimentWorkspaceData> {
  let call: BackendCallTiming | undefined;
  const workspace = await backendFetch<WorkspaceResponse>(`/experiments/${experimentId}/workspace`, {
    token: apiKey,
    onTiming: (timing) => {
      call = timing;
    },
  }).catch((error: unknown) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });

  if (!workspace) return loadFromSeparateRoutes(apiKey, projectId, experimentId);

  // The route looks the experiment up by id alone; the page's URL also names a
  // project, and an experiment under a different project is not found here.
  if (workspace.experiment.projectId !== projectId) {
    throw new NotFoundError(404, "Experiment not found");
  }

  return {
    experiment: workspace.experiment,
    correlationReport: workspace.correlation,
    trainingRuns: workspace.trainingRuns,
    generations: workspace.generations.map(({ generation, manifest }) => slimGeneration({ generation, manifest })),
    load: call ? { source: "workspace", call } : { source: "separate" },
  };
}

async function loadFromSeparateRoutes(
  apiKey: string,
  projectId: string,
  experimentId: string,
): Promise<ExperimentWorkspaceData> {
  const [experiment, correlationReport, trainingRuns, generations] = await Promise.all([
    getExperimentForProject(apiKey, projectId, experimentId),
    getParameterCorrelationReport(apiKey, experimentId),
    loadEnrichedTrainingRuns(apiKey, experimentId),
    loadEnrichedGenerations(apiKey, experimentId),
  ]);
  return { experiment, correlationReport, trainingRuns, generations, load: { source: "separate" } };
}
