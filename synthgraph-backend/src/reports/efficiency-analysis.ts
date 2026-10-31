/**
 * The efficiency ranking and its Pareto frontier (registry entry ARCH-005). The
 * backend owns the rule so every client shows the same frontier; a client only
 * draws the result.
 *
 * Scores are only ever compared like with like: a run's value for a metric is
 * its best evaluation of that metric on ONE evaluation set (dataset version),
 * and runs are ranked against other runs on the same set. Merging a clear-weather
 * score and a heavy-rain score into one number would rank runs by which set they
 * happened to be evaluated on. Within a set, the best value over a run's
 * checkpoints is used (the best checkpoint), which is how the leaderboard has
 * always read it.
 */
import type {
  AggregatedMetricDirection,
  MetricDirection,
} from '../metric-directions/metric-direction.js';

export type RankingDirection = 'maximize' | 'minimize';

export type EfficiencyRunInput = {
  trainingRunId: string;
  durationSeconds: number;
  evaluations: Array<{
    datasetVersionId: string;
    metrics: Record<string, unknown>;
  }>;
};

export type EfficiencyRow = {
  trainingRunId: string;
  /** The run's best evaluation value in the ranking direction. */
  value: number;
  /** Value per hour of training; only when maximizing and the value is positive. */
  perHour: number | null;
  /** On the frontier: no other run is at least as fast and at least as good, and strictly better on one. */
  pareto: boolean;
  /** For a dominated run, the fastest run that beats it on both axes. */
  dominatedBy: string | null;
};

export type EfficiencyRanking = {
  /** Frontier first, then by value, then by duration. Only runs that have the metric on this set. */
  rows: EfficiencyRow[];
};

/** One evaluation set's ranking for one metric, in each direction that applies. */
export type EfficiencySetAnalysis = {
  datasetVersionId: string;
  /** How many runs have this metric on this set. */
  runCount: number;
  /** Only the directions that apply to the metric (see `directionsFor`). */
  rankings: Partial<Record<RankingDirection, EfficiencyRanking>>;
};

export type EfficiencyMetricAnalysis = {
  /**
   * The direction every contributing experiment declared, or null when none did,
   * they disagree, or it is neutral. With a declared direction there is one
   * ranking; without one there are two and the client lets the user pick.
   */
  direction: RankingDirection | null;
  /** Why there is no declared direction, when there is not one. */
  directionStatus: 'declared' | 'neutral' | 'mixed' | 'undeclared';
  sets: EfficiencySetAnalysis[];
};

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function bestOf(values: number[], direction: RankingDirection): number {
  return direction === 'minimize' ? Math.min(...values) : Math.max(...values);
}

function atLeastAsGood(
  a: number,
  b: number,
  direction: RankingDirection,
): boolean {
  return direction === 'minimize' ? a <= b : a >= b;
}

/** The ranking directions that apply to a metric given what was declared. */
export function directionsFor(
  declared: AggregatedMetricDirection | undefined,
): {
  directions: RankingDirection[];
  declared: RankingDirection | null;
  status: EfficiencyMetricAnalysis['directionStatus'];
} {
  const direction: MetricDirection | null = declared?.direction ?? null;
  if (direction === 'maximize' || direction === 'minimize') {
    return { directions: [direction], declared: direction, status: 'declared' };
  }
  const status = declared?.mixed
    ? 'mixed'
    : direction === 'neutral'
      ? 'neutral'
      : 'undeclared';
  return { directions: ['maximize', 'minimize'], declared: null, status };
}

/**
 * Ranks the runs that have a value, and marks the frontier. Ties stay on the
 * frontier instead of eliminating each other.
 */
export function rankRuns(
  scored: ReadonlyArray<{
    trainingRunId: string;
    durationSeconds: number;
    value: number;
  }>,
  direction: RankingDirection,
): EfficiencyRanking {
  const rows: EfficiencyRow[] = scored.map((run) => ({
    trainingRunId: run.trainingRunId,
    value: run.value,
    // A sub-second duration would divide by ~0 and sort above every real result,
    // and a per-hour rate is meaningless when minimizing.
    perHour:
      direction === 'maximize' && run.value > 0 && run.durationSeconds > 0
        ? run.value / (run.durationSeconds / 3600)
        : null,
    pareto: false,
    dominatedBy: null,
  }));
  const durationById = new Map(
    scored.map((run) => [run.trainingRunId, run.durationSeconds]),
  );

  for (const row of rows) {
    const duration = durationById.get(row.trainingRunId) as number;
    const dominators = rows.filter((other) => {
      const otherDuration = durationById.get(other.trainingRunId) as number;
      return (
        other.trainingRunId !== row.trainingRunId &&
        otherDuration <= duration &&
        atLeastAsGood(other.value, row.value, direction) &&
        (otherDuration < duration || other.value !== row.value)
      );
    });
    row.pareto = dominators.length === 0;
    if (dominators.length > 0) {
      const nearest = dominators.reduce((a, b) =>
        (durationById.get(a.trainingRunId) as number) <=
        (durationById.get(b.trainingRunId) as number)
          ? a
          : b,
      );
      row.dominatedBy = nearest.trainingRunId;
    }
  }

  const better = (a: number, b: number) =>
    direction === 'minimize' ? a - b : b - a;
  rows.sort((a, b) => {
    if (a.pareto !== b.pareto) return a.pareto ? -1 : 1;
    return (
      better(a.value, b.value) ||
      (durationById.get(a.trainingRunId) as number) -
        (durationById.get(b.trainingRunId) as number)
    );
  });
  return { rows };
}

/**
 * Every numeric metric, ranked on each evaluation set it was recorded on.
 * `declared` is the aggregated direction per metric key, as the leaderboard
 * already reports it.
 */
export function analyzeEfficiency(
  runs: readonly EfficiencyRunInput[],
  declared: Readonly<Record<string, AggregatedMetricDirection>>,
): Record<string, EfficiencyMetricAnalysis> {
  // metric key -> set id -> run id -> that run's values on that set
  const values = new Map<string, Map<string, Map<string, number[]>>>();
  for (const run of runs) {
    for (const evaluation of run.evaluations) {
      for (const [metricKey, raw] of Object.entries(evaluation.metrics ?? {})) {
        if (!finiteNumber(raw)) continue;
        const bySet = values.get(metricKey) ?? new Map();
        const byRun: Map<string, number[]> =
          bySet.get(evaluation.datasetVersionId) ?? new Map();
        const list = byRun.get(run.trainingRunId) ?? [];
        list.push(raw);
        byRun.set(run.trainingRunId, list);
        bySet.set(evaluation.datasetVersionId, byRun);
        values.set(metricKey, bySet);
      }
    }
  }

  const durationById = new Map(
    runs.map((run) => [run.trainingRunId, run.durationSeconds]),
  );

  const analysis: Record<string, EfficiencyMetricAnalysis> = {};
  for (const [metricKey, bySet] of [...values].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const applicable = directionsFor(
      Object.hasOwn(declared, metricKey) ? declared[metricKey] : undefined,
    );
    const sets: EfficiencySetAnalysis[] = [];
    for (const [datasetVersionId, byRun] of bySet) {
      const rankings: EfficiencySetAnalysis['rankings'] = {};
      for (const direction of applicable.directions) {
        rankings[direction] = rankRuns(
          [...byRun].map(([trainingRunId, list]) => ({
            trainingRunId,
            durationSeconds: durationById.get(trainingRunId) as number,
            value: bestOf(list, direction),
          })),
          direction,
        );
      }
      sets.push({ datasetVersionId, runCount: byRun.size, rankings });
    }
    // The set most runs were scored on first: the likeliest thing to compare.
    sets.sort(
      (a, b) =>
        b.runCount - a.runCount ||
        a.datasetVersionId.localeCompare(b.datasetVersionId),
    );
    analysis[metricKey] = {
      direction: applicable.declared,
      directionStatus: applicable.status,
      sets,
    };
  }
  return analysis;
}
