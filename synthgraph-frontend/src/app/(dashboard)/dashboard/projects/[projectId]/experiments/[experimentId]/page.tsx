import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession, readSessionCookie, requireSession } from "@/features/auth/server/session";
import { ExperimentWorkspace } from "@/features/experiments/components/ExperimentWorkspace";
import { isSeen } from "@/features/onboarding/onboarding-rules";
import { readOnboardingSeen } from "@/features/onboarding/server/onboarding-state";
import { WORKSPACE_TOUR } from "@/features/onboarding/tours/workspace-tour";
import { loadExperimentWorkspace } from "@/features/experiments/server/load-workspace";
import { stopwatch } from "@/features/experiments/server/workspace-payload";
import { settle } from "@/shared/lib/settle";
import { NotFoundError } from "@/shared/http/errors";

type PageParams = { projectId: string; experimentId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { projectId, experimentId } = await params;
  // The title is the experiment's name, which the page loads anyway: share its
  // (cache()'d) workspace request, started with the cookie's key beside the
  // session check, rather than asking the backend again after it.
  const cookie = await readSessionCookie();
  if (!cookie) return {};
  const [session, workspace] = await Promise.all([
    getSession(),
    settle(loadExperimentWorkspace(cookie.apiKey, projectId, experimentId)),
  ]);
  if (!session || !workspace.ok) return {};
  return { title: workspace.value.experiment.name };
}

export default async function ExperimentDetailPage({ params }: { params: Promise<PageParams> }) {
  const { projectId, experimentId } = await params;
  const elapsedMs = stopwatch();

  // The workspace request does not need the session check's answer to be sent:
  // the backend checks the key itself on every request. So when there is a
  // session cookie, start the request with its key right away and let it run
  // beside the session check instead of after it. The data is used only if the
  // session turns out to be valid (requireSession redirects otherwise), so
  // nothing is shown that the check would have refused.
  const cookie = await readSessionCookie();
  const early = cookie ? settle(loadExperimentWorkspace(cookie.apiKey, projectId, experimentId)) : null;
  const session = await requireSession();

  // Everything the workspace needs is prefetched once here (experiment-
  // scoped, small N) rather than fetched on demand per inspector selection
  // - see EnrichedTrainingRun/EnrichedGeneration's own comment on why.
  //
  // One backend request when the backend has the workspace route, the separate
  // routes otherwise (see loadExperimentWorkspace). Any NotFoundError
  // (experiment missing or not the user's) still becomes a 404.
  const loaded = await (early ?? settle(loadExperimentWorkspace(session.apiKey, projectId, experimentId)));
  if (!loaded.ok) {
    if (loaded.error instanceof NotFoundError) notFound();
    throw loaded.error;
  }
  const workspace = loaded.value;
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
