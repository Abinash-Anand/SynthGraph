import { describe, expect, it } from 'vitest';

import {
  ATTENTION_CHECKS,
  attentionReasons,
  buildExperimentAttention,
  type AttentionRunInput,
} from './attention.js';

const run = (
  overrides: Partial<{ status: string; capture: string | null }> = {},
  id = 'run',
): AttentionRunInput => ({
  id,
  status: overrides.status ?? 'completed',
  // Omitted means a run that reported complete capture; null means it never reported.
  captureStatus:
    overrides.capture === undefined
      ? { status: 'complete' }
      : overrides.capture === null
        ? null
        : { status: overrides.capture },
});

const flagged = (
  items: Array<{ run: AttentionRunInput; drift?: number }>,
) =>
  buildExperimentAttention(
    items.map(({ run: r, drift }) => ({ run: r, driftFieldCount: drift ?? 0 })),
  ).runs;

describe('attentionReasons', () => {
  it('flags failed runs, partial and unknown capture, and drift', () => {
    expect(attentionReasons(run({ status: 'failed' }), 0)).toEqual([
      { code: 'run_failed' },
    ]);
    expect(attentionReasons(run({ capture: 'partial' }), 0)).toEqual([
      { code: 'capture_partial' },
    ]);
    expect(attentionReasons(run({ capture: 'unknown' }), 0)).toEqual([
      { code: 'capture_unknown' },
    ]);
    expect(attentionReasons(run(), 1)).toEqual([
      { code: 'drift', driftFields: 1 },
    ]);
    expect(attentionReasons(run(), 3)).toEqual([
      { code: 'drift', driftFields: 3 },
    ]);
  });

  it('lists every reason that applies to one run, in the order the checks are listed', () => {
    expect(
      attentionReasons(run({ status: 'failed', capture: 'partial' }), 2),
    ).toEqual([
      { code: 'run_failed' },
      { code: 'capture_partial' },
      { code: 'drift', driftFields: 2 },
    ]);
  });

  it('leaves healthy runs out', () => {
    expect(attentionReasons(run({ capture: 'complete' }), 0)).toEqual([]);
  });

  it('flags a run that never reported capture, as the capture report counts it', () => {
    // Regression carried over from the frontend rule: only an explicit "unknown"
    // used to be flagged, so a null captureStatus was counted by the report but
    // not flagged here.
    expect(attentionReasons(run({ capture: null }), 0)).toEqual([
      { code: 'capture_not_reported' },
    ]);
  });

  it('flags a run that is still running and has not reported capture, like the report', () => {
    expect(
      attentionReasons(run({ status: 'running', capture: null }), 0),
    ).toEqual([{ code: 'capture_not_reported' }]);
  });

  it('does not flag a pending or running run that reported complete capture', () => {
    expect(attentionReasons(run({ status: 'pending' }), 0)).toEqual([]);
    expect(attentionReasons(run({ status: 'running' }), 0)).toEqual([]);
  });

  it('never looks at metrics: nothing here can flag a diverged run', () => {
    // The input has no metric at all; a run is flagged only for the five checks.
    const input = run({ status: 'completed' }) as AttentionRunInput & {
      metrics?: unknown;
    };
    input.metrics = { loss: Number.POSITIVE_INFINITY };
    expect(attentionReasons(input, 0)).toEqual([]);
  });

  it('treats a capture status it does not know as not flagged, not as unknown', () => {
    // Only the three recorded values are understood; anything else is left alone.
    expect(attentionReasons(run({ capture: 'something-else' }), 0)).toEqual([]);
  });
});

describe('buildExperimentAttention', () => {
  it('returns only the flagged runs, in the order given', () => {
    const result = flagged([
      { run: run({ status: 'failed' }, 'a') },
      { run: run({}, 'healthy') },
      { run: run({ capture: 'partial' }, 'b') },
    ]);
    expect(result.map((r) => r.trainingRunId)).toEqual(['a', 'b']);
  });

  it('reports how many runs were checked, including the healthy ones', () => {
    const result = buildExperimentAttention([
      { run: run({}, 'a'), driftFieldCount: 0 },
      { run: run({}, 'b'), driftFieldCount: 0 },
    ]);
    expect(result.runsChecked).toBe(2);
    expect(result.runs).toEqual([]);
  });

  it('agrees with the capture report on which runs have no complete capture', () => {
    // The report buckets by `captureStatus?.status ?? "unknown"`; partial and
    // unknown there are exactly the runs flagged here for capture.
    const runs = [
      run({ capture: 'complete' }, 'complete'),
      run({ capture: 'partial' }, 'partial'),
      run({ capture: 'unknown' }, 'unknown'),
      run({ capture: null }, 'never'),
    ];
    const reportNeedsAttention = runs
      .filter((r) =>
        ['partial', 'unknown'].includes(
          (r.captureStatus?.status as string | undefined) ?? 'unknown',
        ),
      )
      .map((r) => r.id);
    const flaggedForCapture = buildExperimentAttention(
      runs.map((r) => ({ run: r, driftFieldCount: 0 })),
    )
      .runs.filter((entry) =>
        entry.reasons.some((reason) => reason.code.startsWith('capture')),
      )
      .map((entry) => entry.trainingRunId);
    expect(flaggedForCapture).toEqual(reportNeedsAttention);
  });

  it('lists every check that can produce a reason, so a client only claims what is checked', () => {
    const produced = new Set(
      buildExperimentAttention([
        { run: run({ status: 'failed', capture: 'partial' }, 'a'), driftFieldCount: 1 },
        { run: run({ capture: 'unknown' }, 'b'), driftFieldCount: 0 },
        { run: run({ capture: null }, 'c'), driftFieldCount: 0 },
      ]).runs.flatMap((r) => r.reasons.map((reason) => reason.code)),
    );
    const result = buildExperimentAttention([]);
    expect(new Set(result.checks.map((check) => check.code))).toEqual(produced);
    expect(result.checks).toHaveLength(ATTENTION_CHECKS.length);
    for (const check of result.checks) expect(check.description).not.toBe('');
  });

  it('returns checks a caller can change without changing the rule', () => {
    const first = buildExperimentAttention([]);
    first.checks[0].description = 'changed';
    expect(buildExperimentAttention([]).checks[0].description).toBe(
      'failed runs',
    );
  });
});
