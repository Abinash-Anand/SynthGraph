/**
 * Which training runs of an experiment need a look, and which checks that
 * covers (registry entry ARCH-005). The backend owns the rule so every client
 * flags the same runs; a client only renders the result.
 *
 * Five fixed, objective checks. This is deliberately not a rules engine and not
 * a judgement of performance: a run that diverged, or scored worse than another,
 * is not flagged because none of these checks looks at metrics.
 *
 * A run that never reported capture (`captureStatus` null) is flagged, because
 * the Capture Completeness report counts it as unknown. That includes a run that
 * is still running: until a run reports capture, its status is unknown.
 */
export const ATTENTION_CHECKS = [
  { code: 'run_failed', description: 'failed runs' },
  { code: 'capture_partial', description: 'capture reported as partial' },
  { code: 'capture_unknown', description: 'capture reported as unknown' },
  { code: 'capture_not_reported', description: 'capture never reported' },
  { code: 'drift', description: 'drift from earlier completed runs' },
] as const;

export type AttentionCode = (typeof ATTENTION_CHECKS)[number]['code'];

export type AttentionReason = {
  code: AttentionCode;
  /** For `drift`: how many fields drifted. */
  driftFields?: number;
};

export type AttentionRunInput = {
  id: string;
  status: string;
  captureStatus: { status?: unknown } | null;
};

/** The reasons one run is flagged, in the order the checks are listed. Empty means not flagged. */
export function attentionReasons(
  run: AttentionRunInput,
  driftFieldCount: number,
): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  if (run.status === 'failed') reasons.push({ code: 'run_failed' });
  if (run.captureStatus?.status === 'partial') {
    reasons.push({ code: 'capture_partial' });
  }
  if (run.captureStatus?.status === 'unknown') {
    reasons.push({ code: 'capture_unknown' });
  }
  if (run.captureStatus === null) reasons.push({ code: 'capture_not_reported' });
  if (driftFieldCount > 0) {
    reasons.push({ code: 'drift', driftFields: driftFieldCount });
  }
  return reasons;
}

export type ExperimentAttention = {
  /** How many runs were checked. */
  runsChecked: number;
  /** Every check that is performed, so a client only claims what is checked. */
  checks: Array<{ code: AttentionCode; description: string }>;
  /** Only the runs that are flagged, in the order the runs were given. */
  runs: Array<{ trainingRunId: string; reasons: AttentionReason[] }>;
};

export function buildExperimentAttention(
  runs: ReadonlyArray<{ run: AttentionRunInput; driftFieldCount: number }>,
): ExperimentAttention {
  const flagged: ExperimentAttention['runs'] = [];
  for (const { run, driftFieldCount } of runs) {
    const reasons = attentionReasons(run, driftFieldCount);
    if (reasons.length > 0) flagged.push({ trainingRunId: run.id, reasons });
  }
  return {
    runsChecked: runs.length,
    checks: ATTENTION_CHECKS.map((check) => ({ ...check })),
    runs: flagged,
  };
}
