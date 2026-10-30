// How the Capture Completeness page words what the backend says. Pure and
// framework-free so the wording is tested on its own.
//
// What is wrong with a run's capture, the 50% majority rule, and how each
// integration is doing are all decided by the backend (registry entry ARCH-005):
// `GET /reports/capture-completeness` returns the integrations rated, and
// `GET /reports/capture-completeness/runs` returns the runs behind the counts with
// their issues. Nothing here decides a flag. This module turns structured issues
// into sentences and orders a list for display.

export type CaptureIssue =
  | { kind: "not_attached"; integration: string }
  | { kind: "never_closed"; integration: string }
  | { kind: "not_reported"; integration: string; reportedBy: number; totalRuns: number };

export function describeCaptureIssue(issue: CaptureIssue): string {
  switch (issue.kind) {
    case "not_attached":
      return `${issue.integration} was reported but never attached.`;
    case "never_closed":
      return `${issue.integration} attached but was never closed out, so its data may be incomplete.`;
    case "not_reported":
      return `${issue.integration} is reported by ${issue.reportedBy} of ${issue.totalRuns} runs but not this one.`;
    default: {
      // An issue kind from a newer backend is shown rather than dropped.
      const unknown = issue as { kind: string; integration?: string };
      return `${unknown.integration ?? "An integration"}: ${unknown.kind.replaceAll("_", " ")}.`;
    }
  }
}

export type IntegrationHealth = {
  integration: string;
  total: number;
  attached: number;
  closed: number;
  /** Attached but never closed. */
  dangling: number;
  /** closed / total, 0 to 1. */
  closeRate: number;
  /** Share of all runs that reported the integration, 0 to 1. */
  coverage: number;
};

/** Weakest first, as the table is read: lowest close rate, then by name. Ordering only. */
export function weakestFirst(health: readonly IntegrationHealth[]): IntegrationHealth[] {
  return [...health].sort((a, b) => a.closeRate - b.closeRate || a.integration.localeCompare(b.integration));
}

export type CaptureStatusFilter = "complete" | "partial" | "unknown";

export function parseStatusFilter(raw: string | undefined): CaptureStatusFilter | null {
  return raw === "complete" || raw === "partial" || raw === "unknown" ? raw : null;
}

/** What the run list says when the backend returned none. */
export const CAPTURE_RUNS_UNAVAILABLE =
  "The runs behind these counts and the per-integration ratings are not available from this backend version.";
