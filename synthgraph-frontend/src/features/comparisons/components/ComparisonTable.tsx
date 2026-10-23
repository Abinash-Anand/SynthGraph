"use client";

import { buildComparisonRows } from "@/features/comparisons/lib/parameter-diff";
import type {
  ComparedGeneration,
  GenerationDifference,
} from "@/features/comparisons/types/comparison";
import { ComparisonMatrix } from "./ComparisonMatrix";

export function ComparisonTable({
  generations,
  differences,
  projectIdByExperimentId,
}: {
  generations: ComparedGeneration[];
  differences: GenerationDifference[];
  /** Resolved server-side (this shape only carries experimentId, not
   * projectId) via the flat GET /experiments/:id route — missing entries
   * (a lookup that failed) fall back to plain text instead of a link. */
  projectIdByExperimentId: Record<string, string>;
}) {
  return (
    <ComparisonMatrix
      noun="generation"
      columns={generations.map((generation) => {
        const projectId = projectIdByExperimentId[generation.experimentId];
        return {
          id: generation.id,
          name: generation.name,
          href: projectId
            ? `/dashboard/projects/${projectId}/experiments/${generation.experimentId}/generations/${generation.id}`
            : undefined,
        };
      })}
      rows={buildComparisonRows(generations, differences)}
      records={generations.map((generation) => ({ id: generation.id, name: generation.name, value: generation }))}
    />
  );
}
