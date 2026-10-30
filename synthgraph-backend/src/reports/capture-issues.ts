/**
 * What is wrong with a run's capture, and how each integration is doing
 * (registry entry ARCH-005). The backend owns these rules so every client reports
 * the same problems; a client only words them.
 */

export type IntegrationCounts = {
  total: number;
  attached: number;
  closed: number;
};

export type RunIntegrations = Record<
  string,
  { attached?: boolean; closed?: boolean }
>;

/**
 * An integration other runs report but this one does not is only worth
 * flagging when MORE THAN this share of runs have it. Otherwise a one-off
 * integration would make every other run look broken. Strictly greater: exactly
 * half is not a majority.
 */
export const MAJORITY_SHARE = 0.5;

export type CaptureIssue =
  | { kind: 'not_attached'; integration: string }
  | { kind: 'never_closed'; integration: string }
  | {
      kind: 'not_reported';
      integration: string;
      /** How many runs report this integration. */
      reportedBy: number;
      /** How many runs there are in the scope being judged. */
      totalRuns: number;
    };

/**
 * The problems with one run's capture, judged against how many runs in the same
 * scope report each integration. A run that never reported capture (null)
 * reports nothing, so only the majority rule can flag it.
 */
export function captureIssues(
  run: RunIntegrations | null | undefined,
  byIntegration: Record<string, IntegrationCounts>,
  totalRuns: number,
): CaptureIssue[] {
  const issues: CaptureIssue[] = [];
  const reported = run ?? {};

  for (const [integration, state] of Object.entries(reported)) {
    if (!state?.attached) {
      issues.push({ kind: 'not_attached', integration });
    } else if (!state.closed) {
      issues.push({ kind: 'never_closed', integration });
    }
  }

  for (const [integration, counts] of Object.entries(byIntegration)) {
    if (Object.hasOwn(reported, integration)) continue;
    if (totalRuns > 0 && counts.total / totalRuns > MAJORITY_SHARE) {
      issues.push({
        kind: 'not_reported',
        integration,
        reportedBy: counts.total,
        totalRuns,
      });
    }
  }
  return issues;
}

export type IntegrationHealth = {
  integration: string;
  /** Runs that reported this integration. */
  total: number;
  attached: number;
  closed: number;
  /** Attached but never closed. */
  dangling: number;
  /** closed / total, 0 to 1. */
  closeRate: number;
  /** total / all runs, 0 to 1. */
  coverage: number;
};

export function integrationHealth(
  byIntegration: Record<string, IntegrationCounts>,
  totalRuns: number,
): IntegrationHealth[] {
  return Object.entries(byIntegration).map(([integration, counts]) => ({
    integration,
    total: counts.total,
    attached: counts.attached,
    closed: counts.closed,
    dangling: Math.max(0, counts.attached - counts.closed),
    closeRate: counts.total > 0 ? counts.closed / counts.total : 0,
    coverage: totalRuns > 0 ? counts.total / totalRuns : 0,
  }));
}
