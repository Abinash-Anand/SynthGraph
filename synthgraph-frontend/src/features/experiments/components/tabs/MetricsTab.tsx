"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MetricsTable } from "@/features/training-runs/components/MetricsTable";
import { MetricKeyPicker, extractMetricKeys, useMetricKeySelection } from "@/shared/charts/MetricKeyPicker";
import { cn } from "@/lib/utils";
import type { EnrichedTrainingRun } from "../../types/experiment-workspace";

type MetricsView = "chart" | "table";

// "No metrics" isn't one state - a run that's still running hasn't failed
// to report anything, and a failed run was never going to. Distinguishing
// these (audit item #17) uses data already on the run, not a new field.
function emptyMetricsMessage(runs: EnrichedTrainingRun[]): string {
  if (runs.length === 0) return "No training runs yet.";
  if (runs.some((r) => r.run.status === "pending" || r.run.status === "running")) {
    return "Still collecting - no step metrics reported yet.";
  }
  if (runs.every((r) => r.run.status === "failed")) {
    return "No step metrics were captured - every run failed before producing any.";
  }
  return "No step metrics were captured for these runs.";
}

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

  const activeRunId =
    (selectedRunId && runsWithMetrics.some((r) => r.run.id === selectedRunId) ? selectedRunId : null) ??
    runsWithMetrics[0]?.run.id ?? null;
  const active = runsWithMetrics.find((r) => r.run.id === activeRunId) ?? null;

  // Hooks must run unconditionally on every render - compute against an
  // empty fallback rather than early-returning above this point. The React
  // Compiler handles memoization here, so no manual useMemo.
  const allMetricKeys = extractMetricKeys(active?.metrics ?? []);
  const [selectedKeys, toggleKey] = useMetricKeySelection(allMetricKeys);
  const [view, setView] = useState<MetricsView>("chart");
  const [logScale, setLogScale] = useState(false);
  const [smoothing, setSmoothing] = useState(false);

  if (runsWithMetrics.length === 0 || !active) {
    return <p className="text-[13.5px] text-research-ink-muted">{emptyMetricsMessage(runs)}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[320px]">
          <label className="flex flex-col gap-2 text-[13.5px] text-research-ink">
            Training run
            <select
              value={active.run.id}
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
        <div className="flex gap-1 rounded-lg border border-research-border p-1">
          {(["chart", "table"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12.5px] capitalize transition-colors",
                view === option
                  ? "bg-research-accent-subtle/20 text-research-ink"
                  : "text-research-ink-muted hover:text-research-ink-secondary",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {view === "chart" ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <MetricKeyPicker keys={allMetricKeys} selected={selectedKeys} onToggle={toggleKey} />
            <div className="flex shrink-0 gap-1.5">
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
                  smoothing
                    ? "border-research-accent bg-research-accent-subtle/15 text-research-ink"
                    : "border-research-border text-research-ink-muted hover:border-research-accent-subtle",
                )}
              >
                <input
                  type="checkbox"
                  checked={smoothing}
                  onChange={(event) => setSmoothing(event.target.checked)}
                  className="sr-only"
                />
                Smoothed
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
                  logScale
                    ? "border-research-accent bg-research-accent-subtle/15 text-research-ink"
                    : "border-research-border text-research-ink-muted hover:border-research-accent-subtle",
                )}
              >
                <input
                  type="checkbox"
                  checked={logScale}
                  onChange={(event) => setLogScale(event.target.checked)}
                  className="sr-only"
                />
                Log scale
              </label>
            </div>
          </div>
          <MetricsLineChart
            metrics={active.metrics}
            selectedKeys={selectedKeys}
            logScale={logScale}
            smoothing={smoothing}
          />
        </>
      ) : (
        <MetricsTable metrics={active.metrics} />
      )}
    </div>
  );
}
