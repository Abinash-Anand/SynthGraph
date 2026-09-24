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

/**
 * "Parent" isn't a concept the data model has directly - a Generation has
 * no parent_generation_id, only its own inputs/outputs (dataset/asset
 * references). This infers it: a candidate is any other generation in the
 * same already-loaded list whose outputs include a reference id that also
 * appears in the target's inputs (the natural way one generation's output
 * becomes the next one's input). A generation can have inputs produced by
 * several different upstream generations - there's no single correct
 * answer in that case, so this deliberately picks the most recently
 * created candidate as the closest-in-time match, rather than guessing
 * further. Returns null (not an error) when nothing matches, which is the
 * common case for a generation that only consumes external/uploaded data.
 */
export function findParentGeneration(
  target: EnrichedGeneration,
  all: EnrichedGeneration[],
): EnrichedGeneration | null {
  const inputIds = new Set(target.generation.inputs.map((ref) => ref.id));
  if (inputIds.size === 0) return null;

  const candidates = all.filter(
    (g) =>
      g.generation.id !== target.generation.id &&
      g.generation.outputs.some((ref) => inputIds.has(ref.id)),
  );
  if (candidates.length === 0) return null;

  return candidates.reduce((latest, candidate) =>
    candidate.generation.created_at > latest.generation.created_at ? candidate : latest,
  );
}

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
