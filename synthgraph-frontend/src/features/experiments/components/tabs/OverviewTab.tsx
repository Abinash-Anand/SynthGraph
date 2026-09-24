import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { GenerationStatusBadge } from "@/features/generations/components/GenerationStatusBadge";
import { TRAINING_RUN_STATUS_TONE, TrainingRunStatusBadge } from "@/features/training-runs/components/TrainingRunStatusBadge";
import type { TrainingRunStatus } from "@/features/training-runs/types/training-run";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDurationSeconds, formatMetricValue } from "@/shared/lib/format";
import type { EnrichedGeneration, EnrichedTrainingRun } from "../../types/experiment-workspace";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-research-border bg-research-panel p-4">
      <p className="mono-label text-research-ink-muted">{label}</p>
      <p className="mt-2 text-[24px] font-medium tabular-nums text-research-ink">{value}</p>
    </div>
  );
}

// Reused by three cockpit panels below (run status / provenance / result) so
// they read as one connected "what happened here" surface rather than three
// unrelated cards - matches the audit's Overview mockup, which groups these
// under one bordered block separated by rules rather than as scattered tiles.
function CockpitPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-research-border bg-research-panel p-4">
      <p className="mono-label text-research-ink-muted">{title}</p>
      {children}
    </div>
  );
}

const STATUS_ORDER: TrainingRunStatus[] = ["running", "completed", "failed", "pending"];

function RunStatusPanel({ trainingRuns }: { trainingRuns: EnrichedTrainingRun[] }) {
  if (trainingRuns.length === 0) {
    return (
      <CockpitPanel title="Run status">
        <p className="text-[13px] text-research-ink-muted">No training runs yet.</p>
      </CockpitPanel>
    );
  }
  const counts: Record<TrainingRunStatus, number> = { pending: 0, running: 0, completed: 0, failed: 0 };
  for (const { run } of trainingRuns) counts[run.status] += 1;

  return (
    <CockpitPanel title="Run status">
      <div className="flex flex-col gap-2">
        {STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
          <div key={status} className="flex items-center justify-between">
            <Badge tone={TRAINING_RUN_STATUS_TONE[status]} dot>
              {status}
            </Badge>
            <span className="tabular-nums text-[13.5px] text-research-ink">{counts[status]}</span>
          </div>
        ))}
      </div>
    </CockpitPanel>
  );
}

type ProvenanceCheck = { label: string; present: boolean };

function computeProvenanceChecks(
  generations: EnrichedGeneration[],
  trainingRuns: EnrichedTrainingRun[],
): ProvenanceCheck[] {
  const hasDataset =
    generations.some((g) => (g.manifest?.datasetReferences.length ?? 0) > 0) ||
    trainingRuns.some((r) => (r.run.datasets?.length ?? 0) > 0);
  // "Environment" is reported per-generation by the backend's own
  // reproduction classification (get-reproduction-manifest.service.ts) -
  // it lands in `missing` when a generation's reproducibility.environment
  // was never supplied, so "at least one generation has it" is the fleet-
  // wide signal, not a frontend guess.
  const hasEnvironment = generations.some((g) => g.manifest && !g.manifest.classification.missing.includes("Environment"));

  return [
    { label: "Generation", present: generations.length > 0 },
    { label: "Dataset", present: hasDataset },
    { label: "Training", present: trainingRuns.length > 0 },
    { label: "Evaluation", present: trainingRuns.some((r) => r.evaluations.length > 0) },
    { label: "Environment", present: hasEnvironment },
  ];
}

function ProvenancePanel({
  generations,
  trainingRuns,
}: {
  generations: EnrichedGeneration[];
  trainingRuns: EnrichedTrainingRun[];
}) {
  const checks = computeProvenanceChecks(generations, trainingRuns);
  return (
    <CockpitPanel title="Provenance">
      <div className="flex flex-col gap-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center justify-between">
            <span className="text-[13.5px] text-research-ink-secondary">{check.label}</span>
            <span
              className={cn(
                "text-[13px]",
                check.present ? "text-research-success" : "text-research-ink-muted",
              )}
            >
              {check.present ? "✓" : "—"}
            </span>
          </div>
        ))}
      </div>
    </CockpitPanel>
  );
}

type MetricSummary = { key: string; mean: number; min: number; max: number };

function computeResultMetrics(trainingRuns: EnrichedTrainingRun[]): MetricSummary[] {
  const byKey = new Map<string, number[]>();
  for (const { evaluations } of trainingRuns) {
    for (const evaluation of evaluations) {
      for (const [key, value] of Object.entries(evaluation.metrics)) {
        if (typeof value !== "number") continue;
        const list = byKey.get(key) ?? [];
        list.push(value);
        byKey.set(key, list);
      }
    }
  }
  return Array.from(byKey.entries()).map(([key, values]) => ({
    key,
    mean: values.reduce((sum, v) => sum + v, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  }));
}

function computeTotalTrainingSeconds(trainingRuns: EnrichedTrainingRun[]): number {
  let total = 0;
  for (const { run } of trainingRuns) {
    if (run.startedAt && run.completedAt) {
      total += (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000;
    }
  }
  return total;
}

function ResultPanel({ trainingRuns }: { trainingRuns: EnrichedTrainingRun[] }) {
  const metrics = computeResultMetrics(trainingRuns);
  const totalSeconds = computeTotalTrainingSeconds(trainingRuns);

  if (metrics.length === 0 && totalSeconds === 0) {
    return (
      <CockpitPanel title="Result">
        <p className="text-[13px] text-research-ink-muted">No evaluation results yet.</p>
      </CockpitPanel>
    );
  }

  return (
    <CockpitPanel title="Result">
      <div className="flex flex-col gap-2">
        {/* Mean/range, not a single "best" value - this app has no way to
            know whether higher or lower is better for an arbitrary metric
            key (same reasoning as TrainingRunInspector's health trends). */}
        {metrics.map((metric) => (
          <div key={metric.key} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate font-mono text-[12.5px] text-research-ink-secondary">
              {metric.key}
            </span>
            <span className="shrink-0 tabular-nums text-[13px] text-research-ink">
              {formatMetricValue(metric.mean)}{" "}
              <span className="text-research-ink-muted">
                ({formatMetricValue(metric.min)}–{formatMetricValue(metric.max)})
              </span>
            </span>
          </div>
        ))}
        {totalSeconds > 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] text-research-ink-secondary">Training time</span>
            <span className="tabular-nums text-[13px] text-research-ink">
              {formatDurationSeconds(totalSeconds)}
            </span>
          </div>
        ) : null}
      </div>
    </CockpitPanel>
  );
}

type AttentionEntry = { runId: string; runName: string; reasons: string[] };

// Deliberately limited to objective, domain-agnostic signals - never "this
// run underperformed" (this app has no way to know whether higher or lower
// is better for an arbitrary metric, same reasoning as the Result panel's
// mean/range instead of "best"). Failed status, an explicitly reported
// capture problem, and detected drift are all true regardless of what the
// experiment is measuring - this is what turns the cockpit from "here are
// some counts" into "here's what to look at next."
function computeAttentionEntries(trainingRuns: EnrichedTrainingRun[]): AttentionEntry[] {
  const entries: AttentionEntry[] = [];
  for (const { run, drift } of trainingRuns) {
    const reasons: string[] = [];
    if (run.status === "failed") reasons.push("run failed");
    if (run.captureStatus?.status === "partial") reasons.push("capture incomplete");
    if (run.captureStatus?.status === "unknown") reasons.push("capture status unknown");
    if (drift.drift.length > 0) {
      reasons.push(`drift in ${drift.drift.length} field${drift.drift.length === 1 ? "" : "s"}`);
    }
    if (reasons.length > 0) entries.push({ runId: run.id, runName: run.name, reasons });
  }
  return entries;
}

function AttentionPanel({
  trainingRuns,
  onSelectRun,
}: {
  trainingRuns: EnrichedTrainingRun[];
  onSelectRun: (id: string) => void;
}) {
  const entries = computeAttentionEntries(trainingRuns);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        entries.length > 0
          ? "border-research-warning/30 bg-research-warning/[0.04]"
          : "border-research-border bg-research-panel",
      )}
    >
      <p className="mono-label text-research-ink-muted">Needs attention</p>
      {entries.length === 0 ? (
        <p className="text-[13px] text-research-success">
          Nothing needs attention - no failed runs, capture problems, or detected drift.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((entry) => (
            <button
              key={entry.runId}
              type="button"
              onClick={() => onSelectRun(entry.runId)}
              className="flex items-center justify-between gap-3 rounded-lg border border-research-warning/20 bg-research-panel px-4 py-3 text-left transition-colors hover:border-research-warning/50"
            >
              <span className="min-w-0 truncate text-[13.5px] text-research-ink">{entry.runName}</span>
              <span className="shrink-0 text-[12px] text-research-warning">{entry.reasons.join(", ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function OverviewTab({
  generations,
  trainingRuns,
  onSelectGeneration,
  onSelectRun,
  compareMode = false,
  compareSelection,
  onToggleCompareSelection,
}: {
  generations: EnrichedGeneration[];
  trainingRuns: EnrichedTrainingRun[];
  onSelectGeneration: (id: string) => void;
  onSelectRun: (id: string) => void;
  /** When true, the generations list becomes a checkbox picker instead of
   * a click-to-inspect list - the multi-select entry point for Compare
   * (the only place a generations list already exists to pick from; there
   * is no fleet-wide "list all generations" backend endpoint to build a
   * standalone picker from). */
  compareMode?: boolean;
  compareSelection?: Set<string>;
  onToggleCompareSelection?: (id: string) => void;
}) {
  const completedRuns = trainingRuns.filter((r) => r.run.status === "completed").length;
  const totalEvaluations = trainingRuns.reduce((sum, r) => sum + r.evaluations.length, 0);
  const [generationFilter, setGenerationFilter] = useState("");
  const filteredGenerations = useMemo(() => {
    const query = generationFilter.trim().toLowerCase();
    if (!query) return generations;
    return generations.filter((g) => g.generation.name.toLowerCase().includes(query));
  }, [generations, generationFilter]);
  const lastActivity = [
    ...generations.map((g) => g.generation.created_at),
    ...trainingRuns.map((r) => r.run.createdAt),
  ].sort()
    .at(-1);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Generations" value={generations.length} />
        <StatCard label="Training runs" value={trainingRuns.length} />
        <StatCard label="Completed runs" value={completedRuns} />
        <StatCard label="Evaluations" value={totalEvaluations} />
      </div>

      {lastActivity ? (
        <p className="text-[13px] text-research-ink-muted">
          Last activity <span className="text-research-ink">{formatDateTime(lastActivity)}</span>
        </p>
      ) : null}

      <AttentionPanel trainingRuns={trainingRuns} onSelectRun={onSelectRun} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RunStatusPanel trainingRuns={trainingRuns} />
        <ProvenancePanel generations={generations} trainingRuns={trainingRuns} />
        <ResultPanel trainingRuns={trainingRuns} />
      </div>

      <div>
        <h2 className="mono-label mb-3 text-research-ink-muted">
          {compareMode ? "Select generations to compare" : "Recent generations"}
        </h2>
        {generations.length === 0 ? (
          <p className="text-[13.5px] text-research-ink-muted">No generations yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {compareMode ? (
              <input
                type="text"
                value={generationFilter}
                onChange={(event) => setGenerationFilter(event.target.value)}
                placeholder="Filter by name..."
                aria-label="Filter generations by name"
                className="w-full max-w-[280px] rounded-md border border-research-border bg-research-bg px-3 py-2 text-[13.5px] text-research-ink placeholder:text-research-ink-muted focus:border-research-accent-subtle focus:outline-none"
              />
            ) : null}
            {compareMode && filteredGenerations.length === 0 ? (
              <p className="text-[13.5px] text-research-ink-muted">No generations match &ldquo;{generationFilter}&rdquo;.</p>
            ) : null}
            <div className="flex flex-col gap-1.5">
            {(compareMode ? filteredGenerations : generations.slice(0, 5)).map(({ generation }) => {
              const checked = compareSelection?.has(generation.id) ?? false;
              if (compareMode) {
                return (
                  <label
                    key={generation.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                      checked
                        ? "border-research-accent bg-research-accent-subtle/10"
                        : "border-research-border bg-research-panel hover:border-research-accent-subtle",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleCompareSelection?.(generation.id)}
                      className="accent-[var(--color-research-accent)]"
                    />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-research-ink">
                      {generation.name}
                    </span>
                    <GenerationStatusBadge status={generation.status} />
                  </label>
                );
              }
              return (
                <button
                  key={generation.id}
                  type="button"
                  onClick={() => onSelectGeneration(generation.id)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-research-border bg-research-panel px-4 py-3 text-left transition-colors hover:border-research-accent-subtle"
                >
                  <span className="truncate text-[13.5px] text-research-ink">{generation.name}</span>
                  <GenerationStatusBadge status={generation.status} />
                </button>
              );
            })}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="mono-label mb-3 text-research-ink-muted">Recent training runs</h2>
        {trainingRuns.length === 0 ? (
          <p className="text-[13.5px] text-research-ink-muted">No training runs yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {trainingRuns.slice(0, 5).map(({ run }) => (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelectRun(run.id)}
                className="flex items-center justify-between gap-3 rounded-lg border border-research-border bg-research-panel px-4 py-3 text-left transition-colors hover:border-research-accent-subtle"
              >
                <span className="truncate text-[13.5px] text-research-ink">{run.name}</span>
                <TrainingRunStatusBadge status={run.status} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
