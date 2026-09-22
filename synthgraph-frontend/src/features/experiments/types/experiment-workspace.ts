import type { Generation } from "@/features/generations/types/generation";
import type { ReproductionManifest } from "@/features/reproduction/types/reproduction-manifest";
import type { EvaluationResult } from "@/features/evaluation-results/types/evaluation-result";
import type {
  TrainingRunDriftReport,
  TrainingRunHealthReport,
} from "@/features/reports/types/report";
import type { TrainingRunMetric } from "@/features/training-runs/types/training-run-metric";
import type { TrainingRun } from "@/features/training-runs/types/training-run";

/**
 * Everything the workspace needs for one training run, prefetched once
 * server-side (small N, experiment-scoped) rather than fetched on demand
 * per inspector selection - selection is then pure client-side state over
 * already-loaded data, no request per click. Revisit with on-demand
 * client fetching (TanStack Query) only if a real experiment's run count
 * makes this prefetch measurably expensive - see the Phase 4 plan.
 */
export type EnrichedTrainingRun = {
  run: TrainingRun;
  metrics: TrainingRunMetric[];
  evaluations: EvaluationResult[];
  health: TrainingRunHealthReport;
  drift: TrainingRunDriftReport;
};

export type EnrichedGeneration = {
  generation: Generation;
  manifest: ReproductionManifest | null;
};

export type SelectedEntity =
  | { type: "run"; id: string }
  | { type: "generation"; id: string }
  | { type: "evaluation"; id: string }
  | null;

export function parseSelectedEntity(raw: string | null): SelectedEntity {
  if (!raw) return null;
  const [type, id] = raw.split(":");
  if (!id) return null;
  if (type === "run" || type === "generation" || type === "evaluation") {
    return { type, id };
  }
  return null;
}

export function serializeSelectedEntity(entity: SelectedEntity): string | null {
  if (!entity) return null;
  return `${entity.type}:${entity.id}`;
}
