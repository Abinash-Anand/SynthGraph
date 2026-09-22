import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession, requireSession } from "@/features/auth/server/session";
import { ExperimentWorkspace } from "@/features/experiments/components/ExperimentWorkspace";
import { getExperimentForProject } from "@/features/experiments/server/experiments-api";
import { listGenerations } from "@/features/generations/server/generations-api";
import { getReproductionManifest } from "@/features/reproduction/server/reproduction-api";
import { getParameterCorrelationReport } from "@/features/reports/server/reports-api";
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

  const experiment = await getExperimentForProject(session.apiKey, projectId, experimentId).catch(
    (error) => {
      if (error instanceof NotFoundError) notFound();
      throw error;
    },
  );

  const [generations, trainingRuns, correlationReport] = await Promise.all([
    listGenerations(session.apiKey, experimentId),
    listTrainingRunsForExperiment(session.apiKey, experimentId),
    getParameterCorrelationReport(session.apiKey, experimentId),
  ]);

  // Everything the workspace needs is prefetched once here (experiment-
  // scoped, small N) rather than fetched on demand per inspector selection
  // - see EnrichedTrainingRun/EnrichedGeneration's own comment on why.
  const enrichedTrainingRuns = await Promise.all(
    trainingRuns.map(async (run) => ({
      run,
      metrics: await listTrainingRunMetrics(session.apiKey, run.id),
      evaluations: await listEvaluationResults(session.apiKey, run.id),
    })),
  );

  const enrichedGenerations = await Promise.all(
    generations.map(async (generation) => ({
      generation,
      manifest: await getReproductionManifest(session.apiKey, generation.id).catch(() => null),
    })),
  );

  return (
    <ExperimentWorkspace
      projectId={projectId}
      experimentId={experimentId}
      experiment={experiment}
      generations={enrichedGenerations}
      trainingRuns={enrichedTrainingRuns}
      correlationReport={correlationReport}
    />
  );
}
