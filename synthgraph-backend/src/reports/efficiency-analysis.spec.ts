import { describe, expect, it } from 'vitest';

import {
  analyzeEfficiency,
  directionsFor,
  rankRuns,
  type EfficiencyRunInput,
} from './efficiency-analysis.js';

const SET = 'set-1';

function run(
  id: string,
  minutes: number,
  evaluations: Array<Record<string, number>>,
  datasetVersionId = SET,
): EfficiencyRunInput {
  return {
    trainingRunId: id,
    durationSeconds: minutes * 60,
    evaluations: evaluations.map((metrics) => ({ datasetVersionId, metrics })),
  };
}

function rows(
  runs: EfficiencyRunInput[],
  metricKey: string,
  direction: 'maximize' | 'minimize',
  datasetVersionId = SET,
) {
  const metric = analyzeEfficiency(runs, {
    [metricKey]: { direction, mixed: false },
  })[metricKey];
  const set = metric.sets.find((s) => s.datasetVersionId === datasetVersionId);
  return set?.rankings[direction]?.rows ?? [];
}

describe('rankRuns / analyzeEfficiency (maximize)', () => {
  const runs = [
    run('fast-ok', 10, [{ score: 0.7 }]),
    run('slow-best', 60, [{ score: 0.9 }]),
    run('slow-bad', 60, [{ score: 0.5 }]),
    run('none', 5, [{ other: 1 }]),
  ];

  it('marks the frontier and says who dominates the rest', () => {
    const result = rows(runs, 'score', 'maximize');
    const byId = Object.fromEntries(result.map((r) => [r.trainingRunId, r]));
    expect(byId['fast-ok'].pareto).toBe(true);
    expect(byId['slow-best'].pareto).toBe(true);
    expect(byId['slow-bad'].pareto).toBe(false);
    expect(byId['slow-bad'].dominatedBy).toBe('fast-ok');
  });

  it('lists the frontier first and leaves out runs without the metric', () => {
    expect(rows(runs, 'score', 'maximize').map((r) => r.trainingRunId)).toEqual(
      ['slow-best', 'fast-ok', 'slow-bad'],
    );
  });

  it('computes per-hour only for positive values', () => {
    const fast = rows(runs, 'score', 'maximize').find(
      (r) => r.trainingRunId === 'fast-ok',
    );
    expect(fast?.perHour).toBe(0.7 / (600 / 3600));
  });
});

describe('analyzeEfficiency (minimize)', () => {
  const runs = [
    run('a', 10, [{ loss: 0.5 }, { loss: 0.2 }]),
    run('b', 20, [{ loss: 0.3 }]),
  ];

  it("takes each run's best (lowest) evaluation", () => {
    const a = rows(runs, 'loss', 'minimize').find(
      (r) => r.trainingRunId === 'a',
    );
    expect(a?.value).toBe(0.2);
  });

  it('treats the faster, lower run as dominating', () => {
    const b = rows(runs, 'loss', 'minimize').find(
      (r) => r.trainingRunId === 'b',
    );
    expect(b?.pareto).toBe(false);
    expect(b?.dominatedBy).toBe('a');
  });

  it('gives no per-hour rate', () => {
    expect(
      rows(runs, 'loss', 'minimize').every((r) => r.perHour === null),
    ).toBe(true);
  });
});

describe('edge cases', () => {
  it('does not divide by a zero duration', () => {
    const [only] = rows(
      [run('instant', 0, [{ score: 1 }])],
      'score',
      'maximize',
    );
    expect(only.perHour).toBeNull();
  });

  it('gives no per-hour rate for a value of zero or below', () => {
    const [only] = rows([run('zero', 10, [{ score: 0 }])], 'score', 'maximize');
    expect(only.perHour).toBeNull();
  });

  it('keeps ties on the frontier instead of eliminating both', () => {
    const result = rows(
      [run('x', 10, [{ score: 0.5 }]), run('y', 10, [{ score: 0.5 }])],
      'score',
      'maximize',
    );
    expect(result.every((r) => r.pareto)).toBe(true);
  });

  it('ignores non-numeric and non-finite values', () => {
    const analysis = analyzeEfficiency(
      [
        {
          trainingRunId: 'a',
          durationSeconds: 60,
          evaluations: [
            {
              datasetVersionId: SET,
              metrics: { nan: Number.NaN, inf: Infinity, text: 'x', ok: 1 },
            },
          ],
        },
      ],
      {},
    );
    expect(Object.keys(analysis)).toEqual(['ok']);
  });

  it('ranks nothing when there are no runs', () => {
    expect(analyzeEfficiency([], {})).toEqual({});
  });

  it('sorts equal values by duration', () => {
    const { rows: ranked } = rankRuns(
      [
        { trainingRunId: 'slow', durationSeconds: 100, value: 1 },
        { trainingRunId: 'fast', durationSeconds: 10, value: 1 },
      ],
      'maximize',
    );
    expect(ranked.map((r) => r.trainingRunId)).toEqual(['fast', 'slow']);
    expect(ranked[1].pareto).toBe(false);
    expect(ranked[1].dominatedBy).toBe('fast');
  });
});

describe('evaluation sets are never merged', () => {
  // One run scored well on an easy set and badly on a hard one; another run was
  // scored only on the hard set.
  const merged: EfficiencyRunInput[] = [
    {
      trainingRunId: 'both',
      durationSeconds: 1800,
      evaluations: [
        { datasetVersionId: 'clear', metrics: { mAP50: 0.81 } },
        { datasetVersionId: 'heavy-rain', metrics: { mAP50: 0.52 } },
      ],
    },
    run('hard-only', 20, [{ mAP50: 0.6 }], 'heavy-rain'),
  ];
  const analysis = analyzeEfficiency(merged, {
    mAP50: { direction: 'maximize', mixed: false },
  });

  it('gives each set its own ranking', () => {
    const sets = analysis.mAP50.sets;
    expect(sets.map((s) => s.datasetVersionId).sort()).toEqual([
      'clear',
      'heavy-rain',
    ]);
  });

  it('scores a run on each set separately, not as its best across sets', () => {
    const heavy = analysis.mAP50.sets.find(
      (s) => s.datasetVersionId === 'heavy-rain',
    );
    const both = heavy?.rankings.maximize?.rows.find(
      (r) => r.trainingRunId === 'both',
    );
    expect(both?.value).toBe(0.52);
    const clear = analysis.mAP50.sets.find(
      (s) => s.datasetVersionId === 'clear',
    );
    expect(clear?.rankings.maximize?.rows[0].value).toBe(0.81);
  });

  it('does not let a run on one set dominate a run on another', () => {
    const heavy = analysis.mAP50.sets.find(
      (s) => s.datasetVersionId === 'heavy-rain',
    );
    // hard-only is faster and better than both on the SAME set, so it dominates there.
    const rowsHeavy = heavy?.rankings.maximize?.rows ?? [];
    expect(rowsHeavy.find((r) => r.trainingRunId === 'both')?.dominatedBy).toBe(
      'hard-only',
    );
    // On the clear set, 'both' stands alone: nothing from another set can beat it.
    const clear = analysis.mAP50.sets.find(
      (s) => s.datasetVersionId === 'clear',
    );
    expect(clear?.rankings.maximize?.rows).toHaveLength(1);
    expect(clear?.rankings.maximize?.rows[0].pareto).toBe(true);
  });

  it('lists the set with the most runs first', () => {
    expect(analysis.mAP50.sets[0].datasetVersionId).toBe('heavy-rain');
    expect(analysis.mAP50.sets[0].runCount).toBe(2);
  });

  it("takes a run's best checkpoint within one set", () => {
    const result = rows(
      [
        {
          trainingRunId: 'r',
          durationSeconds: 60,
          evaluations: [
            { datasetVersionId: 's', metrics: { score: 0.4 } },
            { datasetVersionId: 's', metrics: { score: 0.7 } },
          ],
        },
      ],
      'score',
      'maximize',
      's',
    );
    expect(result[0].value).toBe(0.7);
  });
});

describe('directionsFor', () => {
  it('ranks one way when the direction is declared', () => {
    expect(directionsFor({ direction: 'minimize', mixed: false })).toEqual({
      directions: ['minimize'],
      declared: 'minimize',
      status: 'declared',
    });
  });

  it('ranks both ways, and says why, when nothing can pick one', () => {
    expect(directionsFor(undefined).status).toBe('undeclared');
    expect(directionsFor({ direction: 'neutral', mixed: false }).status).toBe(
      'neutral',
    );
    expect(directionsFor({ direction: null, mixed: true }).status).toBe(
      'mixed',
    );
    for (const d of [
      undefined,
      { direction: 'neutral' as const, mixed: false },
      { direction: null, mixed: true },
    ]) {
      const result = directionsFor(d);
      expect(result.directions).toEqual(['maximize', 'minimize']);
      expect(result.declared).toBeNull();
    }
  });

  it('puts a metric with a hostile name through as just another key', () => {
    const analysis = analyzeEfficiency(
      [
        run('a', 10, [
          { constructor: 1, __proto__x: 2 } as Record<string, number>,
        ]),
      ],
      {},
    );
    expect(Object.keys(analysis)).toContain('constructor');
    expect(
      Object.entries(analysis).find(([k]) => k === 'constructor')?.[1]
        .directionStatus,
    ).toBe('undeclared');
  });
});
