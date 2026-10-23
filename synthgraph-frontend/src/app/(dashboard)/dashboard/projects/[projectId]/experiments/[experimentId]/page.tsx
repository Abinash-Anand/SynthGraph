import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession, requireSession } from "@/features/auth/server/session";
import { ExperimentWorkspace } from "@/features/experiments/components/ExperimentWorkspace";
import { isSeen } from "@/features/onboarding/onboarding-rules";
import { readOnboardingSeen } from "@/features/onboarding/server/onboarding-state";
import { WORKSPACE_TOUR } from "@/features/onboarding/tours/workspace-tour";
import { getExperimentForProject } from "@/features/experiments/server/experiments-api";
import { listGenerations } from "@/features/generations/server/generations-api";
import { getReproductionManifest } from "@/features/reproduction/server/reproduction-api";
import {
  getParameterCorrelationReport,
  getTrainingRunDrift,
  getTrainingRunHealth,
} from "@/features/reports/server/reports-api";
import { listEvaluationResults } from "@/features/evaluation-results/server/evaluation-results-api";
import { listTrainingRunMetrics } from "@/features/training-runs/server/training-run-metrics-api";
import { listTrainingRunsForExperiment } from "@/features/training-runs/server/training-runs-api";
import { NotFoundError } from "@/shared/http/errors";

type PageParams = { projectId: string; experimentId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { projectId, experimentId } = await params;
  const session = await getSession();
  if (!session) return {};
  try {
    const experiment = await getExperimentForProject(session.apiKey, projectId, experimentId);
    return { title: experiment.name };
  } catch {
    return {};
  }
}

export default async function ExperimentDetailPage({ params }: { params: Promise<PageParams> }) {
  const { projectId, experimentId } = await params;
  const session = await requireSession();

  // Everything the workspace needs is prefetched once here (experiment-
  // scoped, small N) rather than fetched on demand per inspector selection
  // - see EnrichedTrainingRun/EnrichedGeneration's own comment on why.
  //
  // Nothing below depends on anything else's result, so it all goes out at
  // once: two network round trips in total instead of one per call. Any
  // NotFoundError (experiment missing or not the user's) still becomes a 404.
  let data;
  try {
    data = await Promise.all([
      getExperimentForProject(session.apiKey, projectId, experimentId),
      getParameterCorrelationReport(session.apiKey, experimentId),
      listTrainingRunsForExperiment(session.apiKey, experimentId).then((trainingRuns) =>
        Promise.all(
          trainingRuns.map(async (run) => {
            const [metrics, evaluations, health, drift] = await Promise.all([
              listTrainingRunMetrics(session.apiKey, run.id),
              listEvaluationResults(session.apiKey, run.id),
              getTrainingRunHealth(session.apiKey, run.id),
              getTrainingRunDrift(session.apiKey, run.id),
            ]);
            return { run, metrics, evaluations, health, drift };
          }),
        ),
      ),
      listGenerations(session.apiKey, experimentId).then((generations) =>
        Promise.all(
          generations.map(async (generation) => ({
            generation,
            manifest: await getReproductionManifest(session.apiKey, generation.id).catch(() => null),
          })),
        ),
      ),
    ]);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const [experiment, correlationReport, enrichedTrainingRuns, enrichedGenerations] = data;

  // Only worth touring once there is something to tour - an experiment with
  // no generations or runs yet has an empty canvas for every step to point at.
  const seen = await readOnboardingSeen(session.user.id);
  const workspaceTourDue =
    !isSeen(seen, "workspace", WORKSPACE_TOUR.version) &&
    enrichedGenerations.length + enrichedTrainingRuns.length > 0;

  return (
    <ExperimentWorkspace
      workspaceTourDue={workspaceTourDue}
      projectId={projectId}
      experimentId={experimentId}
      experiment={experiment}
      generations={enrichedGenerations}
      trainingRuns={enrichedTrainingRuns}
      correlationReport={correlationReport}
    />
  );
}
