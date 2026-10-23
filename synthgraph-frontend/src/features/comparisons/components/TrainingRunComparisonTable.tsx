"use client";

import { buildTrainingRunComparisonRows } from "@/features/comparisons/lib/training-run-diff";
import type {
  ComparedTrainingRun,
  TrainingRunDifference,
} from "@/features/comparisons/types/comparison";
import { ComparisonMatrix } from "./ComparisonMatrix";

/**
 * Same matrix as the generation comparison. Links to each run through the
 * inspector-rail deep link (`?entity=run:`), matching
 * TrainingRunSearchResults.tsx's established convention rather than the
 * older standalone training-run detail route.
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
  return (
    <ComparisonMatrix
      noun="training run"
      columns={trainingRuns.map((run) => {
        const projectId = projectIdByExperimentId[run.experimentId];
        return {
          id: run.id,
          name: run.name,
          href: projectId
            ? `/dashboard/projects/${projectId}/experiments/${run.experimentId}?entity=run:${run.id}`
            : undefined,
        };
      })}
      rows={buildTrainingRunComparisonRows(trainingRuns, differences)}
      records={trainingRuns.map((run) => ({ id: run.id, name: run.name, value: run }))}
    />
  );
}
