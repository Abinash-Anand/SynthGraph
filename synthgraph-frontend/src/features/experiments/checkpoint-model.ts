// Where an evaluation sits along a run's training, from what was recorded.
//
// A checkpoint step is recorded explicitly when the evaluation is saved
// (registry entry ARCH-006). It is never read out of the evaluation's name, so a
// name such as "go1-eval-run3-step20160" says nothing here unless the step was
// also recorded. An evaluation with no recorded step is unknown, not zero and
// not its position in a list.
//
// Relative-import friendly (no "@/" alias, no React) so the model tests can run
// under plain Node.

export type CheckpointEvaluation = {
  metrics: Record<string, unknown>;
  /** The step the caller recorded, or null/undefined when none was recorded. */
  checkpointStep?: number | null;
  createdAt?: string;
};

/** "step": every plotted evaluation has a recorded step. "recorded": at least one does not. */
export type CheckpointAxis = "step" | "recorded";

export function hasCheckpointStep(evaluation: Pick<CheckpointEvaluation, "checkpointStep">): boolean {
  const step = evaluation.checkpointStep;
  return typeof step === "number" && Number.isInteger(step) && step >= 0;
}

function numericValue(evaluation: CheckpointEvaluation, metricKey: string): number | null {
  const value = evaluation.metrics[metricKey];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function recordedAt(evaluation: CheckpointEvaluation): number {
  const time = evaluation.createdAt ? Date.parse(evaluation.createdAt) : Number.NaN;
  return Number.isNaN(time) ? 0 : time;
}

/** Oldest first; evaluations recorded at the same moment keep the order they were listed in. */
export function inRecordedOrder<T extends CheckpointEvaluation>(evaluations: readonly T[]): T[] {
  return evaluations
    .map((evaluation, index) => ({ evaluation, index }))
    .sort((a, b) => recordedAt(a.evaluation) - recordedAt(b.evaluation) || a.index - b.index)
    .map(({ evaluation }) => evaluation);
}

export type CheckpointAxisSummary = {
  axis: CheckpointAxis;
  /** Evaluations that report the metric, across every run. */
  total: number;
  /** Of those, how many have no recorded checkpoint step. */
  missing: number;
};

/**
 * One axis for the whole chart. Steps and list positions are different units,
 * so they are never mixed: if any plotted evaluation lacks a recorded step,
 * every run is plotted by the order its evaluations were recorded.
 */
export function checkpointAxisFor(
  runs: ReadonlyArray<{ evaluations: readonly CheckpointEvaluation[] }>,
  metricKey: string,
): CheckpointAxisSummary {
  let total = 0;
  let missing = 0;
  for (const run of runs) {
    for (const evaluation of run.evaluations) {
      if (numericValue(evaluation, metricKey) === null) continue;
      total++;
      if (!hasCheckpointStep(evaluation)) missing++;
    }
  }
  return { axis: missing === 0 ? "step" : "recorded", total, missing };
}

/** One run's points for a metric: [x, value], where x is the step or the 1-based recorded position. */
export function checkpointPoints(
  evaluations: readonly CheckpointEvaluation[],
  metricKey: string,
  axis: CheckpointAxis,
): Array<[number, number]> {
  const plotted = inRecordedOrder(evaluations).filter((evaluation) => numericValue(evaluation, metricKey) !== null);
  if (axis === "recorded") {
    return plotted.map((evaluation, index): [number, number] => [index + 1, numericValue(evaluation, metricKey) as number]);
  }
  return plotted
    .map((evaluation, index) => ({ evaluation, index }))
    .sort((a, b) => (a.evaluation.checkpointStep as number) - (b.evaluation.checkpointStep as number) || a.index - b.index)
    .map(({ evaluation }): [number, number] => [
      evaluation.checkpointStep as number,
      numericValue(evaluation, metricKey) as number,
    ]);
}

/**
 * The evaluation that came last. With a recorded step on every candidate that is
 * the highest step; otherwise it is the one recorded most recently, because a
 * step on only some of them cannot be compared with the rest.
 */
export function latestEvaluation<T extends CheckpointEvaluation>(candidates: readonly T[]): T | null {
  if (candidates.length === 0) return null;
  const ordered = inRecordedOrder(candidates);
  if (candidates.every(hasCheckpointStep)) {
    return ordered.reduce((latest, candidate) =>
      (candidate.checkpointStep as number) >= (latest.checkpointStep as number) ? candidate : latest,
    );
  }
  return ordered[ordered.length - 1];
}

export function describeCheckpointAxis(summary: CheckpointAxisSummary): string | null {
  if (summary.axis === "step" || summary.total === 0) return null;
  const which =
    summary.missing === summary.total
      ? "None of these evaluations has a recorded checkpoint step"
      : `${summary.missing} of ${summary.total} evaluations have no recorded checkpoint step`;
  return `${which}, so they are shown in the order they were recorded.`;
}
