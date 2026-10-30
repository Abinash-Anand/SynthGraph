// How the Overview words what the backend says needs attention. Pure and
// framework-free so the wording is tested on its own.
//
// Which runs are flagged, and which checks that covers, is decided by the
// backend (registry entry ARCH-005): `GET /experiments/:id/workspace` returns
// `attention`. Nothing here decides a flag. This module only turns the backend's
// reason codes into words, and writes the empty state from the checks the
// backend says it performed, so the page can only claim what was checked.

export type AttentionReason = { code: string; driftFields?: number };

export type ExperimentAttention = {
  runsChecked: number;
  checks: Array<{ code: string; description: string }>;
  runs: Array<{ trainingRunId: string; reasons: AttentionReason[] }>;
};

export type AttentionEntry = { runId: string; runName: string; reasons: string[] };

/** What the panel says when the backend returned no attention result at all. */
export const ATTENTION_UNAVAILABLE =
  "Attention checks are not available from this backend version, so no runs are flagged here.";

const REASON_TEXT: Record<string, string> = {
  run_failed: "run failed",
  capture_partial: "capture incomplete",
  capture_unknown: "capture status unknown",
  capture_not_reported: "capture not reported",
};

export function describeAttentionReason(reason: AttentionReason): string {
  if (reason.code === "drift") {
    const fields = reason.driftFields ?? 0;
    return `drift in ${fields} field${fields === 1 ? "" : "s"}`;
  }
  // A code from a newer backend is shown as it is, never dropped.
  return REASON_TEXT[reason.code] ?? reason.code.replaceAll("_", " ");
}

/** The flagged runs, named from the runs the page has loaded (a run it has not loaded shows a short id). */
export function describeAttentionEntries(
  attention: ExperimentAttention,
  runNames: ReadonlyMap<string, string>,
): AttentionEntry[] {
  return attention.runs.map((flagged) => ({
    runId: flagged.trainingRunId,
    runName: runNames.get(flagged.trainingRunId) ?? flagged.trainingRunId.slice(0, 8),
    reasons: flagged.reasons.map(describeAttentionReason),
  }));
}

function joinWithAnd(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** What the empty state says: which checks the backend ran, and what they do not cover. */
export function describeEmptyAttention(checks: ExperimentAttention["checks"]): string {
  const checked = joinWithAnd(checks.map((check) => check.description));
  return (
    `No runs flagged. Checks run here: ${checked}. ` +
    "Metric behaviour, such as a loss that diverges, is not checked."
  );
}
