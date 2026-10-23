// Pure helpers behind the metrics charts, kept free of React/ECharts so the
// parts that are easy to get subtly wrong (scale detection, aggregation) are
// unit-tested. Relative imports with explicit extensions so plain Node can
// run the tests - see features/reports/best-runs-model.ts.
import { compareMetricKeys, metricKind } from "../lib/metric-semantics.ts";

export type StepDomain = { from: number; to: number };

/**
 * Splits a run's step values where the spacing jumps by an order of
 * magnitude. A run can log training metrics every update (steps 0..57) and
 * evaluation metrics at a global timestep (20160): on one axis the 58 real
 * training points either collapse into a sliver or - as a category axis -
 * get a 20,000-step jump drawn as a single tick. Each domain is its own x
 * scale instead.
 */
export function splitStepDomains(steps: number[], gapRatio = 8): StepDomain[] {
  const unique = Array.from(new Set(steps)).sort((a, b) => a - b);
  if (unique.length === 0) return [];
  if (unique.length < 3) return [{ from: unique[0], to: unique[unique.length - 1] }];

  const gaps = unique.slice(1).map((step, i) => step - unique[i]);
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const domains: StepDomain[] = [];
  let from = unique[0];
  for (let i = 0; i < gaps.length; i++) {
    if (median > 0 && gaps[i] > median * gapRatio) {
      domains.push({ from, to: unique[i] });
      from = unique[i + 1];
    }
  }
  domains.push({ from, to: unique[unique.length - 1] });
  return domains;
}

/** Index of the domain a step belongs to. */
export function domainIndexOf(domains: StepDomain[], step: number): number {
  const index = domains.findIndex((domain) => step >= domain.from && step <= domain.to);
  return index === -1 ? 0 : index;
}

function segmentCount(key: string): number {
  return key.split("/").length;
}

/**
 * The series worth showing first. The previous default was the first three
 * keys in logging order, which on a real run was cpu_count, cpu_percent and
 * memory_percent - the machine, not the model. Outcomes come first, and
 * among them the shallowest keys (an aggregate like "episode_reward" before
 * "episode_reward/feet_clearance").
 */
export function preferredSeriesKeys(keys: string[], limit = 3): string[] {
  const rank = (key: string) => (metricKind(key) === "outcome" ? 0 : metricKind(key) === "other" ? 1 : 2);
  return [...keys]
    .sort((a, b) => rank(a) - rank(b) || segmentCount(a) - segmentCount(b) || compareMetricKeys(a, b))
    .slice(0, limit);
}

export type Range = { min: number; max: number };

export function rangeOf(values: number[]): Range | null {
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** Maps values onto 0..1. A flat series has no shape to show, so it sits at 0.5. */
export function normalizeValues(values: Array<number | null>, range: Range | null): Array<number | null> {
  if (!range) return values;
  const span = range.max - range.min;
  return values.map((value) => (value === null ? null : span === 0 ? 0.5 : (value - range.min) / span));
}

/**
 * True when the plotted series live on scales so different that on one axis
 * the smaller ones flatten to a line (a 0-1 loss next to a 0-200 count) -
 * the cue to suggest normalising.
 */
export function scalesDiverge(ranges: Range[], ratio = 25): boolean {
  const spans = ranges.map((range) => range.max - range.min).filter((span) => span > 0);
  if (spans.length < 2) return false;
  return Math.max(...spans) / Math.min(...spans) >= ratio;
}

export type BandPoint = { step: number; mean: number; low: number; high: number; n: number };

/**
 * Mean and one standard deviation across runs, at each step where at least
 * two runs reported - an average over a single run is just that run, and
 * drawing it with a band would claim a spread that doesn't exist.
 */
export function aggregateRuns(runs: Array<Array<[number, number]>>): BandPoint[] {
  const byStep = new Map<number, number[]>();
  for (const series of runs) {
    for (const [step, value] of series) {
      byStep.set(step, [...(byStep.get(step) ?? []), value]);
    }
  }
  const result: BandPoint[] = [];
  for (const [step, values] of byStep) {
    if (values.length < 2) continue;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
    const sd = Math.sqrt(variance);
    result.push({ step, mean, low: mean - sd, high: mean + sd, n: values.length });
  }
  return result.sort((a, b) => a.step - b.step);
}

/** Checkpoint step from an evaluation's name ("go1-eval-run3-step20160" -> 20160). */
export function parseCheckpointStep(name: string | null): number | null {
  if (!name) return null;
  const match = /step[-_ ]?(\d+)/i.exec(name);
  return match ? Number(match[1]) : null;
}
