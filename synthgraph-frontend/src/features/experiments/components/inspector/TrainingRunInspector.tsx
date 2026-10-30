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
import { preferredSeriesKeys } from "@/shared/charts/metric-series";
import { formatDateTime, formatMetricValue } from "@/shared/lib/format";
import { isOutcomeMetric } from "@/shared/lib/metric-semantics";
import { judgementOf, summarizeTrends } from "@/shared/lib/trend-judgement";
import { ConfigSummary } from "@/shared/ui/ConfigSummary";
import { KeyValueList } from "@/shared/ui/KeyValueList";
import type { EnrichedTrainingRun } from "../../types/experiment-workspace";

const TREND_LABEL: Record<TrainingRunHealthMetric["trend"], string> = {
  increasing: "↑ increasing",
  decreasing: "↓ decreasing",
  flat: "→ flat",
  insufficient_data: "not enough data",
};

// The backend's trend is a directionless classifier (increasing loss is bad,
// increasing reward is good, and it can't tell which metric is which), so
// colour only comes from the verdict the backend gives when a direction was
// declared for the metric; otherwise it stays neutral.
const JUDGEMENT_TONE = {
  good: "text-research-success",
  bad: "text-research-warning",
  neutral: "text-research-ink-muted",
} as const;

const HEALTH_PREVIEW_COUNT = 8;

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
  const rawFinalMetrics = getFinalMetrics(run, metrics);
  const finalMetricsCount = Object.keys(rawFinalMetrics).length;
  // Outcomes (reward, loss...) lead, machine telemetry trails - the compact
  // preview used to show whichever keys happened to be logged first, which
  // was eval/sps and training/sps rather than anything about the model.
  const finalMetrics = Object.fromEntries(
    preferredSeriesKeys(Object.keys(rawFinalMetrics), finalMetricsCount).map((key) => [key, rawFinalMetrics[key]]),
  );
  const [showAllHealth, setShowAllHealth] = useState(false);

  // Model metrics first, then by the backend's verdict so what's going wrong
  // surfaces at the top of a 40-row list instead of being buried in it.
  const healthRows = [...health.metrics].sort((a, b) => {
    const rank = (metric: TrainingRunHealthMetric) => {
      const judgement = judgementOf(metric.verdict);
      return (isOutcomeMetric(metric.metricKey) ? 0 : 10) + (judgement === "bad" ? 0 : judgement === "good" ? 1 : 2);
    };
    return rank(a) - rank(b) || a.metricKey.localeCompare(b.metricKey);
  });
  const healthSummary = summarizeTrends(health.metrics);
  const visibleHealth = showAllHealth ? healthRows : healthRows.slice(0, HEALTH_PREVIEW_COUNT);

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
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* Two different axes that read alike ("completed" / "complete"),
              so each says which it is. */}
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-research-ink-muted uppercase">Run</span>
            <TrainingRunStatusBadge status={run.status} />
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-research-ink-muted uppercase">Capture</span>
            <CaptureStatusBadge status={run.captureStatus?.status ?? null} />
          </span>
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
              <p className="mono-label mb-1 text-research-ink-muted">
                Health (last {health.windowSize} steps)
              </p>
              <p className="mb-2 text-[12px] text-research-ink-muted">
                {healthSummary.increasing} rising · {healthSummary.decreasing} falling · {healthSummary.flat} flat
                {healthSummary.good + healthSummary.bad > 0 ? (
                  <>
                    {" — "}
                    <span className="text-research-success">{healthSummary.good} improving</span>
                    {", "}
                    <span className={healthSummary.bad > 0 ? "text-research-warning" : undefined}>
                      {healthSummary.bad} worsening
                    </span>
                  </>
                ) : null}
              </p>
              <div className="flex flex-col gap-1.5">
                {visibleHealth.map((metric) => {
                  const judgement = judgementOf(metric.verdict);
                  return (
                    <div
                      key={metric.metricKey}
                      className="flex items-start justify-between gap-3 rounded-md border border-research-border bg-research-subtle/40 px-3 py-2"
                    >
                      {/* Wraps instead of truncating: 38 reward terms share a long
                          prefix, so the tail is the only part that tells them apart. */}
                      <span className="min-w-0 break-all font-mono text-[12px] text-research-ink" title={metric.metricKey}>
                        {metric.metricKey}
                      </span>
                      <span
                        className={cn("shrink-0 whitespace-nowrap text-[12px]", JUDGEMENT_TONE[judgement])}
                        title={
                          judgement === "neutral"
                            ? undefined
                            : judgement === "good"
                              ? "Moving the right way (against the direction declared for this metric)"
                              : "Moving the wrong way (against the direction declared for this metric)"
                        }
                      >
                        {TREND_LABEL[metric.trend]}
                      </span>
                    </div>
                  );
                })}
              </div>
              {healthRows.length > HEALTH_PREVIEW_COUNT ? (
                <button
                  type="button"
                  onClick={() => setShowAllHealth((value) => !value)}
                  className="mt-2 font-mono text-[11px] text-research-accent-hover underline underline-offset-2 hover:text-research-accent"
                >
                  {showAllHealth ? "Show fewer" : `Show all ${healthRows.length}`}
                </button>
              ) : null}
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
                {evaluations.map((evaluation) => {
                  // Show the headline score so the list says something
                  // before you open each evaluation.
                  const keys = preferredSeriesKeys(
                    Object.entries(evaluation.metrics)
                      .filter(([, value]) => typeof value === "number")
                      .map(([key]) => key)
                      .filter(isOutcomeMetric),
                    2,
                  );
                  return (
                    <li key={evaluation.id}>
                      <button
                        type="button"
                        onClick={() => onSelectEvaluation(evaluation.id)}
                        className="w-full rounded-md border border-research-border bg-research-subtle/40 p-2.5 text-left transition-colors hover:border-research-accent-subtle"
                      >
                        <p className="truncate text-[13px] text-research-ink">{evaluation.name ?? evaluation.id}</p>
                        {keys.length > 0 ? (
                          <p className="mt-0.5 truncate font-mono text-[11px] text-research-ink-muted">
                            {keys
                              .map((key) => `${key} ${formatMetricValue(evaluation.metrics[key] as number)}`)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
