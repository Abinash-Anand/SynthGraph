import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession, requireSession } from "@/features/auth/server/session";
import { ExperimentWorkspace } from "@/features/experiments/components/ExperimentWorkspace";
import { isSeen } from "@/features/onboarding/onboarding-rules";
import { readOnboardingSeen } from "@/features/onboarding/server/onboarding-state";
import { WORKSPACE_TOUR } from "@/features/onboarding/tours/workspace-tour";
import { getExperimentForProject } from "@/features/experiments/server/experiments-api";
import { loadExperimentWorkspace } from "@/features/experiments/server/load-workspace";
import { stopwatch } from "@/features/experiments/server/workspace-payload";
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
  // One backend request when the backend has the workspace route, the separate
  // routes otherwise (see loadExperimentWorkspace). Any NotFoundError
  // (experiment missing or not the user's) still becomes a 404.
  const elapsedMs = stopwatch();
  let workspace;
  try {
    workspace = await loadExperimentWorkspace(session.apiKey, projectId, experimentId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const {
    experiment,
    correlationReport,
    trainingRuns: enrichedTrainingRuns,
    generations: enrichedGenerations,
    load,
  } = workspace;
  console.info("experiment_workspace.loaded", {
    experimentId,
    ms: elapsedMs(),
    generations: enrichedGenerations.length,
    trainingRuns: enrichedTrainingRuns.length,
    manifestFailures: enrichedGenerations.filter((g) => g.manifestError).length,
    source: load.source,
    // With the workspace route: that one request's duration and the backend's
    // own per-part breakdown (Server-Timing), to see where a slow load went.
    ...(load.source === "workspace"
      ? { backendMs: load.call.ms, retries: load.call.retries, serverTiming: load.call.serverTiming }
      : {}),
  });

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
