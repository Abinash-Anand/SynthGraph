import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { listEvaluationResults } from "@/features/evaluation-results/server/evaluation-results-api";
import { listTrainingRunMetrics } from "@/features/training-runs/server/training-run-metrics-api";
import { getTrainingRun } from "@/features/training-runs/server/training-runs-api";

/**
 * Client-polled counterpart to the server-prefetched EnrichedTrainingRun
 * (see experiment-workspace.ts) - that prefetch is right for a static
 * page load, but a run another process (the SDK) is actively training
 * against needs to actually refresh without a full page reload. Kept
 * deliberately thin: just the 3 reads a running run's UI needs (status/
 * capture, step metrics, evaluations-so-far), not the health/drift
 * reports, which are heavier aggregate queries not worth re-running every
 * poll interval.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [run, metrics, evaluations] = await Promise.all([
      getTrainingRun(session.apiKey, id),
      listTrainingRunMetrics(session.apiKey, id),
      listEvaluationResults(session.apiKey, id),
    ]);
    return NextResponse.json({ ok: true, run, metrics, evaluations });
  } catch (error) {
    console.error("training_runs.live_fetch_failed", error);
    return NextResponse.json({ ok: false, error: "Could not refresh this training run." }, { status: 502 });
  }
}
