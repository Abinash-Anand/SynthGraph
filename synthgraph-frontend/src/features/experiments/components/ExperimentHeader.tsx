"use client";

import type { Experiment } from "@/features/experiments/types/experiment";
import type { Generation } from "@/features/generations/types/generation";
import { formatDateTime } from "@/shared/lib/format";
import type { EnrichedTrainingRun } from "../types/experiment-workspace";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExperimentHeader({
  experiment,
  generations,
  trainingRuns,
  onOpenReproduction,
  compareMode,
  compareCount,
  onStartCompare,
  onCancelCompare,
  onConfirmCompare,
}: {
  experiment: Experiment;
  generations: Generation[];
  trainingRuns: EnrichedTrainingRun[];
  onOpenReproduction: () => void;
  compareMode: boolean;
  compareCount: number;
  onStartCompare: () => void;
  onCancelCompare: () => void;
  onConfirmCompare: () => void;
}) {
  const completed = trainingRuns.filter((r) => r.run.status === "completed").length;
  const canCompare = generations.length >= 2;

  return (
    <div className="flex flex-col gap-3 border-b border-research-border pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">
            {experiment.name}
          </h1>
          {experiment.description ? (
            <p className="mt-1 text-[14px] text-research-ink-secondary">{experiment.description}</p>
          ) : null}
        </div>

        <div className="flex gap-2">
          {compareMode ? (
            <>
              <button
                type="button"
                onClick={onCancelCompare}
                className="rounded-md border border-research-border bg-research-panel px-3.5 py-2 text-[13px] font-medium text-research-ink transition-colors hover:border-research-accent-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={compareCount < 2}
                onClick={onConfirmCompare}
                className="rounded-md bg-research-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-research-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                Compare ({compareCount})
              </button>
            </>
          ) : (
            <>
              {canCompare ? (
                <button
                  type="button"
                  onClick={onStartCompare}
                  className="rounded-md border border-research-border bg-research-panel px-3.5 py-2 text-[13px] font-medium text-research-ink transition-colors hover:border-research-accent-subtle"
                >
                  Compare
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOpenReproduction}
                className="rounded-md border border-research-border bg-research-panel px-3.5 py-2 text-[13px] font-medium text-research-ink transition-colors hover:border-research-accent-subtle"
              >
                Reproduce
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadJson(`${experiment.name.replace(/\s+/g, "-").toLowerCase()}.json`, {
                    experiment,
                    generations,
                    trainingRuns: trainingRuns.map((r) => r.run),
                  })
                }
                className="rounded-md bg-research-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-research-accent-hover"
              >
                Export
              </button>
            </>
          )}
        </div>
      </div>

      {compareMode ? (
        <p className="text-[13px] text-research-accent-hover">
          Select 2–10 generations on the Overview tab, then confirm above.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11.5px] text-research-ink-muted">
          <span>{generations.length} generations</span>
          <span>
            {completed}/{trainingRuns.length} runs completed
          </span>
          <span>Created {formatDateTime(experiment.createdAt)}</span>
        </div>
      )}
    </div>
  );
}
