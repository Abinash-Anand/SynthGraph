// Relative with extension so plain Node can run the tests - see
// features/reports/best-runs-model.ts.
import { compareMetricKeys, isOutcomeMetric, type MetricDirection, metricDirection } from "../../shared/lib/metric-semantics.ts";

type WithEvaluations = { evaluations: Array<{ metrics: Record<string, unknown> }> };

function numbersFor(run: WithEvaluations, key: string): number[] {
  return run.evaluations
    .map((evaluation) => evaluation.metrics[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

/** Evaluation metrics worth treating as an outcome, best candidates first. */
export function outcomeMetricKeys(runs: WithEvaluations[]): string[] {
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

/** A metric whose direction we can infer beats one we'd have to guess about. */
export function preferredOutcomeKey(keys: string[]): string {
  return keys.find((key) => metricDirection(key) !== "neutral") ?? keys[0] ?? "";
}

/**
 * One number per run: its best evaluation in the metric's direction
 * ("higher" when unknown). Evaluations are checkpoints of the same run, so
 * the best one is the run's result - averaging would blend early,
 * under-trained checkpoints into it.
 */
export function bestEvaluationValue(
  run: WithEvaluations,
  key: string,
  direction: MetricDirection = metricDirection(key),
): number | null {
  const values = numbersFor(run, key);
  if (values.length === 0) return null;
  return direction === "lower" ? Math.min(...values) : Math.max(...values);
}

/**
 * What to say about one run's evaluations of a metric. A run only has a "best"
 * checkpoint when the metric's direction is known; otherwise the honest summary
 * is the range it covered, because the highest value is not the best one for a
 * metric like a collision rate or a spread.
 */
export type EvaluationSummary = { kind: "best"; value: number } | { kind: "range"; highest: number; lowest: number };

export function summarizeEvaluations(
  run: WithEvaluations,
  key: string,
  direction: MetricDirection = metricDirection(key),
): EvaluationSummary | null {
  const values = numbersFor(run, key);
  if (values.length === 0) return null;
  if (direction === "higher") return { kind: "best", value: Math.max(...values) };
  if (direction === "lower") return { kind: "best", value: Math.min(...values) };
  return { kind: "range", highest: Math.max(...values), lowest: Math.min(...values) };
}

export function describeEvaluationSummary(summary: EvaluationSummary | null, format: (value: number) => string): string {
  if (!summary) return "—";
  if (summary.kind === "best") return `best ${format(summary.value)}`;
  if (summary.highest === summary.lowest) return format(summary.highest);
  return `highest ${format(summary.highest)} · lowest ${format(summary.lowest)}`;
}
