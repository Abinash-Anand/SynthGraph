"use client";

import dynamic from "next/dynamic";
import { MetricsTable } from "@/features/training-runs/components/MetricsTable";
import type { EnrichedTrainingRun } from "../../types/experiment-workspace";

// ECharts is heavy - split out of the main bundle, only loaded when the
// Metrics tab actually renders (per the Phase 4 plan's performance rules).
const MetricsLineChart = dynamic(
  () => import("@/shared/charts/MetricsLineChart").then((m) => m.MetricsLineChart),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-xl bg-research-panel" /> },
);

export function MetricsTab({
  runs,
  selectedRunId,
  onSelectRun,
}: {
  runs: EnrichedTrainingRun[];
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
}) {
  const runsWithMetrics = runs.filter((r) => r.metrics.length > 0);

  if (runsWithMetrics.length === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">No training runs have step metrics yet.</p>;
  }

  const activeRunId =
    (selectedRunId && runsWithMetrics.some((r) => r.run.id === selectedRunId) ? selectedRunId : null) ??
    runsWithMetrics[0].run.id;
  const active = runsWithMetrics.find((r) => r.run.id === activeRunId)!;

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-[320px]">
        <label className="flex flex-col gap-2 text-[13.5px] text-research-ink">
          Training run
          <select
            value={activeRunId}
            onChange={(event) => onSelectRun(event.target.value)}
            className="w-full rounded-md border border-research-border bg-research-bg px-3.5 py-2.5 text-[14px] text-research-ink focus:border-research-accent-subtle focus:outline-none"
          >
            {runsWithMetrics.map((r) => (
              <option key={r.run.id} value={r.run.id} className="bg-research-panel text-research-ink">
                {r.run.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <MetricsLineChart metrics={active.metrics} />
      <MetricsTable metrics={active.metrics} />
    </div>
  );
}
