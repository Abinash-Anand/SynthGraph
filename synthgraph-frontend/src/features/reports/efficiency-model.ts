// Relative import with extension: see best-runs-model.ts for why.
import { type MetricDirection, compareMetricKeys, isOutcomeMetric, metricDirection } from "../../shared/lib/metric-semantics.ts";

export type EfficiencyRunInput = {
  trainingRunId: string;
  name: string;
  durationSeconds: number;
  evaluations: Array<{ metrics: Record<string, unknown> }>;
};

export type EfficiencyRow = {
  runId: string;
  name: string;
  durationSeconds: number;
  /** Best evaluation value in the chosen direction, or null if the run never recorded it. */
  value: number | null;
  /** Value per hour of training - only meaningful when higher is better and the value is positive. */
  perHour: number | null;
  /** On the frontier: no other run is both at-least-as-fast and at-least-as-good, and strictly better on one. */
  pareto: boolean;
  /** For a dominated run, the run that beats it on both axes (the fastest such run). */
  dominatedBy: { runId: string; name: string } | null;
};

/** Metrics worth ranking runs by - outcomes only; elapsed time and system readings are excluded. */
export function rankableMetricKeys(runs: EfficiencyRunInput[]): string[] {
  const keys = new Set<string>();
  for (const run of runs) {
    for (const evaluation of run.evaluations) {
      for (const [key, value] of Object.entries(evaluation.metrics)) {
        if (typeof value === "number" && Number.isFinite(value) && isOutcomeMetric(key)) keys.add(key);
      }
    }
  }
  return Array.from(keys).sort(compareMetricKeys);
}

/** Prefers a metric whose direction we can infer, so the default ranking is never arbitrary. */
export function defaultMetricKey(keys: string[]): string {
  return keys.find((key) => metricDirection(key) !== "neutral") ?? keys[0] ?? "";
}

function bestOf(values: number[], direction: MetricDirection): number | null {
  if (values.length === 0) return null;
  return direction === "lower" ? Math.min(...values) : Math.max(...values);
}

// "At least as good" in the chosen direction.
function atLeastAsGood(a: number, b: number, direction: MetricDirection): boolean {
  return direction === "lower" ? a <= b : a >= b;
}

export function analyzeEfficiency(
  runs: EfficiencyRunInput[],
  metricKey: string,
  direction: MetricDirection,
): EfficiencyRow[] {
  const rows: EfficiencyRow[] = runs.map((run) => {
    const values = run.evaluations
      .map((evaluation) => evaluation.metrics[metricKey])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const value = bestOf(values, direction);
    return {
      runId: run.trainingRunId,
      name: run.name,
      durationSeconds: run.durationSeconds,
      value,
      // A sub-second duration would divide by ~0 and sort above every real
      // result, and a per-hour rate is meaningless for lower-is-better.
      perHour:
        value !== null && direction !== "lower" && value > 0 && run.durationSeconds > 0
          ? value / (run.durationSeconds / 3600)
          : null,
      pareto: false,
      dominatedBy: null,
    };
  });

  const scored = rows.filter((row): row is EfficiencyRow & { value: number } => row.value !== null);
  for (const row of scored) {
    const dominators = scored.filter(
      (other) =>
        other.runId !== row.runId &&
        other.durationSeconds <= row.durationSeconds &&
        atLeastAsGood(other.value, row.value, direction) &&
        (other.durationSeconds < row.durationSeconds || other.value !== row.value),
    );
    row.pareto = dominators.length === 0;
    if (dominators.length > 0) {
      const nearest = dominators.reduce((a, b) => (a.durationSeconds <= b.durationSeconds ? a : b));
      row.dominatedBy = { runId: nearest.runId, name: nearest.name };
    }
  }

  const better = (a: number, b: number) => (direction === "lower" ? a - b : b - a);
  return rows.sort((a, b) => {
    if (a.value === null || b.value === null) return a.value === b.value ? 0 : a.value === null ? 1 : -1;
    if (a.pareto !== b.pareto) return a.pareto ? -1 : 1;
    return better(a.value, b.value) || a.durationSeconds - b.durationSeconds;
  });
}

/** The frontier as a left-to-right path (fastest first) for drawing. */
export function paretoPath(rows: EfficiencyRow[]): Array<[number, number]> {
  return rows
    .filter((row): row is EfficiencyRow & { value: number } => row.pareto && row.value !== null)
    .sort((a, b) => a.durationSeconds - b.durationSeconds)
    .map((row) => [row.durationSeconds / 3600, row.value]);
}
