"use client";

import Link from "next/link";
import { useState } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { buildTrainingRunComparisonRows } from "@/features/comparisons/lib/training-run-diff";
import type {
  ComparedTrainingRun,
  TrainingRunDifference,
} from "@/features/comparisons/types/comparison";
import { cn } from "@/lib/utils";
import type { ComparisonRow } from "../lib/parameter-diff";

/**
 * Mirrors ComparisonTable.tsx exactly - same transposed-matrix reasoning
 * for staying a semantic HTML table rather than @tanstack/react-table.
 * Links to each run through the inspector-rail deep link (`?entity=run:`),
 * matching TrainingRunSearchResults.tsx's established convention rather
 * than the older standalone training-run detail route.
 */
export function TrainingRunComparisonTable({
  trainingRuns,
  differences,
  projectIdByExperimentId,
}: {
  trainingRuns: ComparedTrainingRun[];
  differences: TrainingRunDifference[];
  /** Resolved server-side (this shape only carries experimentId, not
   * projectId) via the flat GET /experiments/:id route — missing entries
   * (a lookup that failed) fall back to plain text instead of a link. */
  projectIdByExperimentId: Record<string, string>;
}) {
  const rows = buildTrainingRunComparisonRows(trainingRuns, differences);
  const differingRows = rows.filter((r) => r.differs);
  const [showAll, setShowAll] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const visibleRows = showAll ? rows : differingRows;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-research-border bg-research-panel p-4">
        <p className="text-[13.5px] text-research-ink">
          {differingRows.length === 0 ? (
            "No differences found across these fields."
          ) : (
            <>
              <span className="font-medium text-research-accent-hover">{differingRows.length}</span> of{" "}
              {rows.length} fields differ:{" "}
              <span className="font-mono text-[12px] text-research-ink-secondary">
                {differingRows.map((r) => r.label).join(", ")}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-research-border">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-research-border bg-research-panel">
              <th scope="col" className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">
                field
              </th>
              {trainingRuns.map((run) => {
                const projectId = projectIdByExperimentId[run.experimentId];
                return (
                  <th key={run.id} scope="col" className="px-3 py-2.5 text-left text-research-ink">
                    {projectId ? (
                      <Link
                        href={`/dashboard/projects/${projectId}/experiments/${run.experimentId}?entity=run:${run.id}`}
                        className="underline underline-offset-2 hover:text-research-accent-hover"
                      >
                        {run.name}
                      </Link>
                    ) : (
                      run.name
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <ComparisonRowView key={row.label} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > differingRows.length ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-start font-mono text-[11px] tracking-[0.08em] text-research-ink-muted uppercase transition-colors hover:text-research-accent-hover"
        >
          {showAll ? "Show only differences" : `Show all ${rows.length} fields`}
        </button>
      ) : null}

      <div>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="font-mono text-[11px] tracking-[0.08em] text-research-ink-muted uppercase transition-colors hover:text-research-accent-hover"
        >
          {showRaw ? "Hide raw data" : "View raw data"}
        </button>
        {showRaw ? (
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {trainingRuns.map((run) => (
              <div key={run.id}>
                <p className="mb-1.5 truncate text-[12.5px] text-research-ink-secondary">{run.name}</p>
                <CodeBlock language="json" code={JSON.stringify(run, null, 2)} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ComparisonRowView({ row }: { row: ComparisonRow }) {
  const baseline = row.values[0];
  return (
    <tr className={cn("border-b border-research-border last:border-b-0", row.differs && "bg-research-warning/[0.04]")}>
      <td className="px-3 py-2.5 font-mono text-[11px] text-research-ink-muted">{row.label}</td>
      {row.values.map((value, index) => {
        const outlier = row.differs && value !== baseline;
        return (
          <td
            key={index}
            className={cn(
              "px-3 py-2.5",
              outlier ? "font-medium text-research-warning" : "text-research-ink",
            )}
          >
            {value}
          </td>
        );
      })}
    </tr>
  );
}
