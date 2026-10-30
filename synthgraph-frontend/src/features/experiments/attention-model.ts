// Which training runs the Overview flags, and what it says about the checks it
// ran. Pure and framework-free so the rules and their wording are tested
// together. These rules are a domain decision made in the frontend (registry
// entry ARCH-005); this module keeps them in one place until they move.
//
// A run that never reported capture (`captureStatus` null) is flagged, as the
// Capture Completeness report counts it as unknown, so the two screens agree.
// That includes a run that is still running: the report does the same, and
// until a run reports capture the status is genuinely unknown.

export type AttentionRun = {
  run: {
    id: string;
    name: string;
    status: string;
    captureStatus: { status: string } | null;
  };
  drift: { drift: unknown[] };
};

export type AttentionEntry = { runId: string; runName: string; reasons: string[] };

/**
 * Every check the Overview performs, in the order it reports them. The empty
 * state is written from this list, so the page can only claim what is checked.
 * Deliberately objective and independent of what an experiment measures - never
 * "this run underperformed".
 */
export const ATTENTION_CHECKS = [
  { reason: "run failed", description: "failed runs" },
  { reason: "capture incomplete", description: "capture reported as partial" },
  { reason: "capture status unknown", description: "capture reported as unknown" },
  { reason: "capture not reported", description: "capture never reported" },
  { reason: "drift", description: "drift from earlier completed runs" },
] as const;

export function computeAttentionEntries(runs: AttentionRun[]): AttentionEntry[] {
  const entries: AttentionEntry[] = [];
  for (const { run, drift } of runs) {
    const reasons: string[] = [];
    if (run.status === "failed") reasons.push("run failed");
    if (run.captureStatus?.status === "partial") reasons.push("capture incomplete");
    if (run.captureStatus?.status === "unknown") reasons.push("capture status unknown");
    if (run.captureStatus === null) reasons.push("capture not reported");
    if (drift.drift.length > 0) {
      reasons.push(`drift in ${drift.drift.length} field${drift.drift.length === 1 ? "" : "s"}`);
    }
    if (reasons.length > 0) entries.push({ runId: run.id, runName: run.name, reasons });
  }
  return entries;
}

function joinWithAnd(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** What the empty state says: which checks ran, and what they do not cover. */
export function describeEmptyAttention(): string {
  const checked = joinWithAnd(ATTENTION_CHECKS.map((check) => check.description));
  return (
    `No runs flagged. Checks run here: ${checked}. ` +
    "Metric behaviour, such as a loss that diverges, is not checked."
  );
}
