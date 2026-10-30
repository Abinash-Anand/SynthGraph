// Relative with extension so plain Node can run the tests - see
// features/reports/best-runs-model.ts.
import {
  type DeclaredDirection,
  type MetricDirections,
  canRank,
  rankingDirection,
} from "../../shared/lib/metric-direction.ts";
import { compareMetricKeys, isOutcomeMetric } from "../../shared/lib/metric-semantics.ts";
import { type CheckpointEvaluation, latestEvaluation } from "./checkpoint-model.ts";

type WithEvaluations = { evaluations: CheckpointEvaluation[] };

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

/** A metric with a declared direction beats one we would have nothing to say about. */
export function preferredOutcomeKey(keys: string[], directions: MetricDirections | null | undefined): string {
  return keys.find((key) => canRank(directions, key)) ?? keys[0] ?? "";
}

/**
 * The value of a run's last evaluation of a metric: the one at the highest recorded
 * checkpoint step when every candidate has one, otherwise the one recorded most
 * recently (see `latestEvaluation`).
 */
export function latestEvaluationValue(run: WithEvaluations, key: string): number | null {
  const candidates = run.evaluations.filter((evaluation) => {
    const value = evaluation.metrics[key];
    return typeof value === "number" && Number.isFinite(value);
  });
  const latest = latestEvaluation(candidates);
  return latest === null ? null : (latest.metrics[key] as number);
}

/**
 * One number per run. With a declared direction that is its best evaluation in
 * that direction: evaluations are checkpoints of the same run, so the best one
 * is the run's result - averaging would blend early, under-trained checkpoints
 * into it. With no direction (never declared, or declared neutral) nothing
 * makes one checkpoint better than another, so the run's latest evaluation is
 * used instead; picking the highest would quietly treat bigger as better.
 */
export function bestEvaluationValue(
  run: WithEvaluations,
  key: string,
  direction: DeclaredDirection | null,
): number | null {
  const ranking = rankingDirection(direction);
  if (ranking === null) return latestEvaluationValue(run, key);
  const values = numbersFor(run, key);
  if (values.length === 0) return null;
  return ranking === "minimize" ? Math.min(...values) : Math.max(...values);
}

/**
 * What to say about one run's evaluations of a metric. A run only has a "best"
 * checkpoint when the metric's direction is declared; otherwise the honest summary
 * is the range it covered, because the highest value is not the best one for a
 * metric like a collision rate or a spread.
 */
export type EvaluationSummary = { kind: "best"; value: number } | { kind: "range"; highest: number; lowest: number };

export function summarizeEvaluations(
  run: WithEvaluations,
  key: string,
  direction: DeclaredDirection | null,
): EvaluationSummary | null {
  const values = numbersFor(run, key);
  if (values.length === 0) return null;
  const ranking = rankingDirection(direction);
  if (ranking === "maximize") return { kind: "best", value: Math.max(...values) };
  if (ranking === "minimize") return { kind: "best", value: Math.min(...values) };
  return { kind: "range", highest: Math.max(...values), lowest: Math.min(...values) };
}

export function describeEvaluationSummary(summary: EvaluationSummary | null, format: (value: number) => string): string {
  if (!summary) return "—";
  if (summary.kind === "best") return `best ${format(summary.value)}`;
  if (summary.highest === summary.lowest) return format(summary.highest);
  return `highest ${format(summary.highest)} · lowest ${format(summary.lowest)}`;
}
