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
