import { GenerationStatusBadge } from "@/features/generations/components/GenerationStatusBadge";
import { TrainingRunStatusBadge } from "@/features/training-runs/components/TrainingRunStatusBadge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/shared/lib/format";
import type { EnrichedGeneration, EnrichedTrainingRun } from "../../types/experiment-workspace";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-research-border bg-research-panel p-4">
      <p className="mono-label text-research-ink-muted">{label}</p>
      <p className="mt-2 text-[24px] font-medium tabular-nums text-research-ink">{value}</p>
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

      <div>
        <h2 className="mono-label mb-3 text-research-ink-muted">
          {compareMode ? "Select generations to compare" : "Recent generations"}
        </h2>
        {generations.length === 0 ? (
          <p className="text-[13.5px] text-research-ink-muted">No generations yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {(compareMode ? generations : generations.slice(0, 5)).map(({ generation }) => {
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
