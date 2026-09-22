"use client";

import { useQuery } from "@tanstack/react-query";
import type { EvaluationResult } from "@/features/evaluation-results/types/evaluation-result";
import type { TrainingRunMetric } from "@/features/training-runs/types/training-run-metric";
import type { TrainingRun, TrainingRunStatus } from "@/features/training-runs/types/training-run";

const TERMINAL_STATUSES: TrainingRunStatus[] = ["completed", "failed"];
const POLL_INTERVAL_MS = 5000;

type LiveTrainingRunData = {
  run: TrainingRun;
  metrics: TrainingRunMetric[];
  evaluations: EvaluationResult[];
};

async function fetchLive(trainingRunId: string): Promise<LiveTrainingRunData> {
  const response = await fetch(`/api/training-runs/${trainingRunId}/live`, { cache: "no-store" });
  const body = (await response.json()) as { ok: boolean; error?: string } & Partial<LiveTrainingRunData>;
  if (!response.ok || !body.ok || !body.run) {
    throw new Error(body.error ?? "Could not refresh this training run.");
  }
  return { run: body.run, metrics: body.metrics ?? [], evaluations: body.evaluations ?? [] };
}

/**
 * Only polls while the run is non-terminal - a completed/failed run has
 * nothing left to refresh, so polling stops itself rather than running
 * forever in the background. `initialStatus` is the server-prefetched
 * status, re-passed on every parent render; since a manual status change
 * goes through router.refresh() (a fresh server round-trip), this prop is
 * never older than the poll's own cache - so a prop that says terminal
 * always wins over stale cached poll data, not the other way around.
 * Without that rule, a run marked completed via the status control could
 * keep showing its last-polled "running" snapshot until the next 5s tick
 * happened to land (a real bug caught during Phase 4.4 verification).
 */
export function useLiveTrainingRun(trainingRunId: string, initialStatus: TrainingRunStatus) {
  const isTerminal = TERMINAL_STATUSES.includes(initialStatus);

  const query = useQuery({
    queryKey: ["training-run-live", trainingRunId],
    queryFn: () => fetchLive(trainingRunId),
    enabled: !isTerminal,
    refetchInterval: (q) => {
      const status = q.state.data?.run.status;
      if (status && TERMINAL_STATUSES.includes(status)) return false;
      return POLL_INTERVAL_MS;
    },
    staleTime: 0,
  });

  const live = isTerminal ? null : (query.data ?? null);

  return {
    live,
    isPolling: !isTerminal && query.fetchStatus === "fetching",
    isLive: !isTerminal,
    lastUpdatedAt: query.dataUpdatedAt > 0 ? query.dataUpdatedAt : null,
    isStale: query.isError,
  };
}
