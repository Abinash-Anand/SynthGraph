// Relative import with extension: see best-runs-model.ts for why.
import {
  type AggregatedDirections,
  type RankingDirection,
  aggregatedDirection,
  rankingDirection,
} from "../../shared/lib/metric-direction.ts";
import { compareMetricKeys, isOutcomeMetric } from "../../shared/lib/metric-semantics.ts";

// The ranking, the Pareto frontier, value per hour and "dominated by" are decided
// by the backend (registry entry ARCH-005): `GET /reports/efficiency-leaderboard`
// returns `analysis`, every numeric metric ranked per evaluation set. Scores are
// only ever ranked against other scores on the same set. Nothing here ranks or
// finds a frontier; this module joins the backend's answer to run names, picks
// what to show first, and prepares chart bounds.

export const EFFICIENCY_UNAVAILABLE =
  "The efficiency ranking is not available from this backend version, so the runs are listed fastest first without a ranking.";

type RunSummary = { trainingRunId: string; name: string; durationSeconds: number };

type RankedRow = {
  trainingRunId: string;
  value: number;
  perHour: number | null;
  pareto: boolean;
  dominatedBy: string | null;
};

type SetAnalysis = {
  datasetVersionId: string;
  runCount: number;
  rankings: Partial<Record<RankingDirection, { rows: RankedRow[] }>>;
};

type MetricAnalysis = { sets: SetAnalysis[] };

export type EfficiencyRow = {
  runId: string;
  name: string;
  durationSeconds: number;
  /** The run's best value on the chosen evaluation set, or null when it has none there. */
  value: number | null;
  /** Value per hour of training, as the backend computed it. */
  perHour: number | null;
  /** On the frontier: no other run is both at-least-as-fast and at-least-as-good, and strictly better on one. */
  pareto: boolean;
  /** For a dominated run, the run that beats it on both axes (the fastest such run). */
  dominatedBy: { runId: string; name: string } | null;
};

/** Metrics worth ranking runs by - outcomes only; elapsed time and system readings are excluded. */
export function rankableMetricKeys(analysis: Readonly<Record<string, unknown>> | null | undefined): string[] {
  return Object.keys(analysis ?? {})
    .filter(isOutcomeMetric)
    .sort(compareMetricKeys);
}

/** Prefers a metric with a declared direction, so the default ranking is never arbitrary. */
export function defaultMetricKey(keys: string[], directions: AggregatedDirections | null | undefined): string {
  return keys.find((key) => rankingDirection(aggregatedDirection(directions, key).direction) !== null) ?? keys[0] ?? "";
}

/** The evaluation set to show first: the backend lists the one most runs were scored on first. */
export function defaultSetId(analysis: MetricAnalysis | undefined): string {
  return analysis?.sets[0]?.datasetVersionId ?? "";
}

/**
 * Labels for the evaluation-set picker. Two sets can share a dataset name and
 * version, so a repeated label gets a short id to stay distinguishable.
 */
export function evaluationSetOptions(
  sets: ReadonlyArray<{ datasetVersionId: string; runCount: number }>,
  names: ReadonlyArray<{ datasetVersionId: string; datasetName: string; version: string }>,
): Array<{ id: string; label: string }> {
  const nameOf = new Map(names.map((entry) => [entry.datasetVersionId, `${entry.datasetName} ${entry.version}`]));
  const labels = sets.map(
    (set) =>
      `${nameOf.get(set.datasetVersionId) ?? "Unnamed evaluation set"} · ${set.runCount} ${set.runCount === 1 ? "run" : "runs"}`,
  );
  return sets.map((set, index) => ({
    id: set.datasetVersionId,
    label:
      labels.filter((label) => label === labels[index]).length > 1
        ? `${labels[index]} (${set.datasetVersionId.slice(0, 8)})`
        : labels[index],
  }));
}

/**
 * The backend's ranking of one metric on one evaluation set, joined to run names,
 * with the runs that have no value there listed after it. With no ranking (no
 * direction chosen, or a metric or set the backend did not rank) there is just
 * the runs, fastest first.
 */
export function efficiencyRows(
  runs: readonly RunSummary[],
  analysis: MetricAnalysis | undefined,
  setId: string,
  direction: RankingDirection | null,
): EfficiencyRow[] {
  const nameOf = new Map(runs.map((run) => [run.trainingRunId, run.name]));
  const ranked =
    direction === null
      ? []
      : (analysis?.sets.find((set) => set.datasetVersionId === setId)?.rankings[direction]?.rows ?? []);
  const rankedIds = new Set(ranked.map((row) => row.trainingRunId));
  const byDuration = new Map(runs.map((run) => [run.trainingRunId, run.durationSeconds]));

  const scored: EfficiencyRow[] = ranked.map((row) => ({
    runId: row.trainingRunId,
    name: nameOf.get(row.trainingRunId) ?? row.trainingRunId,
    durationSeconds: byDuration.get(row.trainingRunId) ?? 0,
    value: row.value,
    perHour: row.perHour,
    pareto: row.pareto,
    dominatedBy:
      row.dominatedBy === null
        ? null
        : { runId: row.dominatedBy, name: nameOf.get(row.dominatedBy) ?? row.dominatedBy },
  }));
  const unscored: EfficiencyRow[] = runs
    .filter((run) => !rankedIds.has(run.trainingRunId))
    .sort((a, b) => a.durationSeconds - b.durationSeconds)
    .map((run) => ({
      runId: run.trainingRunId,
      name: run.name,
      durationSeconds: run.durationSeconds,
      value: null,
      perHour: null,
      pareto: false,
      dominatedBy: null,
    }));
  return [...scored, ...unscored];
}

export type AxisRange = { min: number; max: number };

/**
 * Y-axis bounds with generous padding. Letting the chart fit the data tightly
 * turned 0.7107 vs 0.7122 into a dramatic cliff; padding by at least half the
 * spread and 5% of the typical value keeps a difference that small looking small.
 */
export function paddedAxisRange(values: number[]): AxisRange | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const typical = finite.reduce((sum, value) => sum + Math.abs(value), 0) / finite.length;
  const pad = Math.max((max - min) * 0.5, typical * 0.05) || 1;
  return { min: min - pad, max: max + pad };
}

const CLOSE_RESULT_SHARE = 0.02;

/**
 * When every result is within a couple of percent of the others, the ranking
 * is probably noise: separate runs of the same config vary by about that much.
 * Returns the spread as a share of the typical value, or null when the results
 * are clearly apart (or there aren't two to compare).
 */
export function closeResultsSpread(values: number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length < 2) return null;
  const typical = finite.reduce((sum, value) => sum + Math.abs(value), 0) / finite.length;
  if (typical === 0) return null;
  const spread = (Math.max(...finite) - Math.min(...finite)) / typical;
  return spread < CLOSE_RESULT_SHARE ? spread : null;
}

/** The frontier as a left-to-right path (fastest first) for drawing. */
export function paretoPath(rows: EfficiencyRow[]): Array<[number, number]> {
  return rows
    .filter((row): row is EfficiencyRow & { value: number } => row.pareto && row.value !== null)
    .sort((a, b) => a.durationSeconds - b.durationSeconds)
    .map((row) => [row.durationSeconds / 3600, row.value]);
}
