// What went wrong with a run's capture, in words. Pure and framework-free.

export type IntegrationCounts = { total: number; attached: number; closed: number };
export type RunIntegrations = Record<string, { attached: boolean; closed: boolean }>;

export type CaptureIssue = {
  integration: string;
  kind: "never-closed" | "not-attached" | "not-reported";
  message: string;
};

/**
 * An integration other runs report but this one doesn't is only worth
 * flagging when most runs have it - otherwise a one-off integration would
 * make every other run look broken.
 */
const MAJORITY = 0.5;

export function describeRunCapture(
  run: RunIntegrations | null | undefined,
  byIntegration: Record<string, IntegrationCounts>,
  totalRuns: number,
): CaptureIssue[] {
  const issues: CaptureIssue[] = [];
  const reported = run ?? {};

  for (const [integration, state] of Object.entries(reported)) {
    if (!state.attached) {
      issues.push({
        integration,
        kind: "not-attached",
        message: `${integration} was reported but never attached.`,
      });
    } else if (!state.closed) {
      issues.push({
        integration,
        kind: "never-closed",
        message: `${integration} attached but was never closed out, so its data may be incomplete.`,
      });
    }
  }

  for (const [integration, counts] of Object.entries(byIntegration)) {
    if (integration in reported) continue;
    if (totalRuns > 0 && counts.total / totalRuns > MAJORITY) {
      issues.push({
        integration,
        kind: "not-reported",
        message: `${integration} is reported by ${counts.total} of ${totalRuns} runs but not this one.`,
      });
    }
  }
  return issues;
}

export type IntegrationHealth = {
  integration: string;
  total: number;
  attached: number;
  closed: number;
  /** closed / total, 0..1 */
  closeRate: number;
  /** Attached but never closed. */
  dangling: number;
  coverage: number;
};

export function integrationHealth(
  byIntegration: Record<string, IntegrationCounts>,
  totalRuns: number,
): IntegrationHealth[] {
  return Object.entries(byIntegration)
    .map(([integration, counts]) => ({
      integration,
      total: counts.total,
      attached: counts.attached,
      closed: counts.closed,
      closeRate: counts.total > 0 ? counts.closed / counts.total : 0,
      dangling: Math.max(0, counts.attached - counts.closed),
      coverage: totalRuns > 0 ? counts.total / totalRuns : 0,
    }))
    .sort((a, b) => a.closeRate - b.closeRate || a.integration.localeCompare(b.integration));
}

export type CaptureStatusFilter = "complete" | "partial" | "unknown";

export function parseStatusFilter(raw: string | undefined): CaptureStatusFilter | null {
  return raw === "complete" || raw === "partial" || raw === "unknown" ? raw : null;
}
