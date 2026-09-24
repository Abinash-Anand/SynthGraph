"use client";

import { useState } from "react";
import { CaptureStatusBadge } from "@/features/training-runs/components/CaptureStatusBadge";
import { CaptureStatusControl } from "@/features/training-runs/components/CaptureStatusControl";
import { TrainingRunStatusBadge } from "@/features/training-runs/components/TrainingRunStatusBadge";
import { TrainingRunStatusControl } from "@/features/training-runs/components/TrainingRunStatusControl";
import { useLiveTrainingRun } from "@/features/training-runs/hooks/useLiveTrainingRun";
import type { TrainingRun } from "@/features/training-runs/types/training-run";
import type { TrainingRunMetric } from "@/features/training-runs/types/training-run-metric";
import type { TrainingRunHealthMetric } from "@/features/reports/types/report";
import { cn } from "@/lib/utils";
import { formatDateTime, formatMetricValue } from "@/shared/lib/format";
import { ConfigSummary } from "@/shared/ui/ConfigSummary";
import { KeyValueList } from "@/shared/ui/KeyValueList";
import type { EnrichedTrainingRun } from "../../types/experiment-workspace";

const TREND_LABEL: Record<TrainingRunHealthMetric["trend"], string> = {
  increasing: "↑ increasing",
  decreasing: "↓ decreasing",
  flat: "→ flat",
  insufficient_data: "not enough data",
};

// Neither direction is colored success/warning - increasing loss is bad,
// increasing reward is good, and this component has no idea which metric
// is which. Trend is a directionless classifier, not a value judgment
// (matches the backend service's own documented reasoning).
const TREND_TONE: Record<TrainingRunHealthMetric["trend"], string> = {
  increasing: "text-research-info",
  decreasing: "text-research-accent-hover",
  flat: "text-research-ink-muted",
  insufficient_data: "text-research-ink-muted",
};

// Prefer the run's own author-supplied summary metrics (a distinct field
// from per-step telemetry - see TrainingRun's own type comment); fall back
// to the last logged step when the run never reports a summary itself.
function getFinalMetrics(run: TrainingRun, metrics: TrainingRunMetric[]): Record<string, unknown> {
  if (Object.keys(run.metrics).length > 0) return run.metrics;
  if (metrics.length === 0) return {};
  const last = [...metrics].sort((a, b) => a.step - b.step).at(-1)!;
  return last.metrics;
}

type InspectorTab = "overview" | "metrics" | "health";

const TAB_OPTIONS: Array<{ value: InspectorTab; label: string }> = [
  { value: "overview", label: "Overview & Config" },
  { value: "metrics", label: "Metrics" },
  { value: "health", label: "Health & Drift" },
];

export function TrainingRunInspector({
  enriched,
  onSelectEvaluation,
  onOpenMetrics,
}: {
  enriched: EnrichedTrainingRun;
  onSelectEvaluation: (id: string) => void;
  /** Jumps to the Metrics tab (with this run still selected) for full
   * multi-series analysis - the inspector itself only shows a compact
   * final-values summary, not a chart, so it doesn't compete with Metrics
   * as the place to actually study a training curve. */
  onOpenMetrics: () => void;
}) {
  const { health, drift } = enriched;
  // Server-prefetched props are the baseline; polling only overrides once
  // it actually has fresher data, and only ever runs at all if the run
  // started non-terminal (see useLiveTrainingRun's own reasoning).
  const { live, isPolling, isLive } = useLiveTrainingRun(enriched.run.id, enriched.run.status);
  const run = live?.run ?? enriched.run;
  const metrics = live?.metrics ?? enriched.metrics;
  const evaluations = live?.evaluations ?? enriched.evaluations;
  const finalMetrics = getFinalMetrics(run, metrics);
  const finalMetricsCount = Object.keys(finalMetrics).length;

  // A run with 40+ logged metrics, a hyperparameter dump, and a full health
  // trend list used to render as one uninterrupted column - splitting into
  // sectioned tabs means selecting a run shows one focused section, not
  // everything scrolled together.
  const [tab, setTab] = useState<InspectorTab>("overview");

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <p className="mono-label text-research-ink-muted">Training run</p>
        <h3 className="mt-1 truncate text-[16px] font-medium text-research-ink">{run.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TrainingRunStatusBadge status={run.status} />
          <CaptureStatusBadge status={run.captureStatus?.status ?? null} />
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-research-info uppercase">
              <span
                className={cn(
                  "size-1.5 rounded-full bg-research-info",
                  isPolling && "motion-safe:animate-pulse",
                )}
                aria-hidden
              />
              Live
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TrainingRunStatusControl trainingRunId={run.id} status={run.status} />
        <CaptureStatusControl trainingRunId={run.id} current={run.captureStatus} />
      </div>

      <div className="flex gap-1 rounded-lg border border-research-border p-1">
        {TAB_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTab(option.value)}
            className={cn(
              "min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-[11.5px] transition-colors",
              tab === option.value
                ? "bg-research-accent-subtle/20 text-research-ink"
                : "text-research-ink-muted hover:text-research-ink-secondary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="flex flex-col gap-6">
          <KeyValueList
            rows={[
              { label: "Trainer", value: run.trainer.name },
              ...(run.trainer.version ? [{ label: "Version", value: run.trainer.version }] : []),
              { label: "Created", value: formatDateTime(run.createdAt) },
              ...(run.startedAt ? [{ label: "Started", value: formatDateTime(run.startedAt) }] : []),
              ...(run.completedAt ? [{ label: "Completed", value: formatDateTime(run.completedAt) }] : []),
            ]}
          />

          <div>
            <p className="mono-label mb-2 text-research-ink-muted">Configuration</p>
            <ConfigSummary data={run.parameters} />
          </div>

          {run.datasets && run.datasets.length > 0 ? (
            <div>
              <p className="mono-label mb-2 text-research-ink-muted">Datasets ({run.datasets.length})</p>
              <ul className="flex flex-col gap-1.5">
                {run.datasets.map((version) => (
                  <li key={version.id} className="rounded-md border border-research-border bg-research-subtle/40 p-2.5">
                    <p className="text-[13px] text-research-ink">{version.version}</p>
                    <p className="truncate font-mono text-[10.5px] text-research-ink-muted">{version.uri}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "metrics" ? (
        <div className="flex flex-col gap-3">
          {finalMetricsCount === 0 ? (
            <p className="text-[13px] text-research-ink-muted">No final metrics reported yet.</p>
          ) : (
            <div>
              <p className="mono-label mb-2 text-research-ink-muted">Final metrics ({finalMetricsCount})</p>
              <ConfigSummary
                data={finalMetrics}
                formatValue={(value) => (typeof value === "number" ? formatMetricValue(value) : String(value))}
                fullLabel={`View all ${finalMetricsCount} metrics`}
              />
            </div>
          )}
          {metrics.length > 0 ? (
            <button
              type="button"
              onClick={onOpenMetrics}
              className="self-start font-mono text-[11px] tracking-[0.08em] text-research-accent-hover uppercase transition-colors hover:text-research-accent"
            >
              Open metrics chart →
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === "health" ? (
        <div className="flex flex-col gap-6">
          {health.metrics.length > 0 ? (
            <div>
              <p className="mono-label mb-2 text-research-ink-muted">
                Health (last {health.windowSize} steps)
              </p>
              <div className="flex flex-col gap-1.5">
                {health.metrics.map((metric) => (
                  <div
                    key={metric.metricKey}
                    className="flex items-center justify-between gap-3 rounded-md border border-research-border bg-research-subtle/40 px-3 py-2"
                  >
                    <span className="min-w-0 truncate font-mono text-[12.5px] text-research-ink">
                      {metric.metricKey}
                    </span>
                    <span className={cn("shrink-0 whitespace-nowrap text-[12px]", TREND_TONE[metric.trend])}>
                      {TREND_LABEL[metric.trend]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-research-ink-muted">Not enough step metrics yet to show a trend.</p>
          )}

          {drift.baselineRunCount > 0 ? (
            <div>
              <p className="mono-label mb-2 text-research-ink-muted">
                Drift (vs. {drift.baselineRunCount} prior run{drift.baselineRunCount === 1 ? "" : "s"})
              </p>
              {drift.drift.length === 0 ? (
                <p className="text-[13px] text-research-success">
                  No drift detected in trainer/environment fields.
                </p>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg border border-research-warning/30 bg-research-warning/[0.05] p-3">
                  {drift.drift.map((entry) => (
                    <div key={entry.field} className="min-w-0 text-[12.5px]">
                      <p className="truncate font-mono text-research-warning">{entry.field}</p>
                      <p className="mt-0.5 break-all text-research-ink-muted">
                        baseline <span className="text-research-ink">{String(entry.baselineValue)}</span> → now{" "}
                        <span className="text-research-ink">{String(entry.currentValue)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div>
            <p className="mono-label mb-2 text-research-ink-muted">Evaluations ({evaluations.length})</p>
            {evaluations.length === 0 ? (
              <p className="text-[13px] text-research-ink-muted">None yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {evaluations.map((evaluation) => (
                  <li key={evaluation.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEvaluation(evaluation.id)}
                      className="w-full rounded-md border border-research-border bg-research-subtle/40 p-2.5 text-left transition-colors hover:border-research-accent-subtle"
                    >
                      <p className="truncate text-[13px] text-research-ink">{evaluation.name ?? evaluation.id}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
