import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { formatDateTime, pluralize } from "@/shared/lib/format";
import {
  CAPTURE_RUNS_UNAVAILABLE,
  type CaptureStatusFilter,
  describeCaptureIssue,
  weakestFirst,
} from "../capture-model";
import type { CaptureCompletenessReport, CaptureCompletenessRuns } from "../types/report";

const STATUS_TONE = {
  complete: "ok",
  partial: "warn",
  unknown: "neutral",
} as const;

const STATUS_HELP: Record<CaptureStatusFilter, string> = {
  complete: "Every integration the run reported was attached and closed out.",
  partial: "Something was reported but not fully captured.",
  unknown: "The run never said whether its capture finished.",
};

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function Meter({ value, tone }: { value: number; tone: "ok" | "blue" | "warn" }) {
  const color = tone === "ok" ? "bg-research-success" : tone === "blue" ? "bg-node-dataset" : "bg-research-warning";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-research-border" aria-hidden>
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.round(Math.min(1, value) * 100)}%` }} />
    </div>
  );
}

/** Link that keeps the project filter and toggles the status drill-down. */
function statusHref(status: CaptureStatusFilter | null, projectId?: string): string {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (status) params.set("status", status);
  const query = params.toString();
  return query ? `?${query}` : "?";
}

export function CaptureCompletenessView({
  report,
  drilldown,
  activeStatus,
  projectId,
}: {
  report: CaptureCompletenessReport;
  /** The runs behind the counts, as the backend judged them; null from a backend that predates it. */
  drilldown: CaptureCompletenessRuns | null;
  /** The status the user drilled into, or null for the default "needs attention" view. */
  activeStatus: CaptureStatusFilter | null;
  projectId?: string;
}) {
  const { total, byStatus } = report;
  const runs = drilldown?.runs ?? [];
  const truncated = drilldown?.truncated ?? false;
  const statuses = Object.entries(byStatus) as Array<[CaptureStatusFilter, number]>;
  const health = report.integrations ? weakestFirst(report.integrations) : null;
  const needAttention = byStatus.partial + byStatus.unknown;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {statuses.map(([status, count]) => {
          const active = activeStatus === status;
          return (
            <Link
              key={status}
              href={statusHref(active ? null : status, projectId)}
              aria-pressed={active}
              scroll={false}
              className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-research-accent"
            >
              <Card
                className={cn(
                  "h-full p-5 transition-colors group-hover:border-research-accent-subtle",
                  active && "border-research-accent",
                )}
              >
                <Badge tone={STATUS_TONE[status]} dot>
                  {status}
                </Badge>
                <p className="mt-3 text-[28px] font-medium text-ink">{count}</p>
                <p className="mt-1 font-mono text-[11px] text-ink-faint">
                  {total > 0 ? Math.round((count / total) * 100) : 0}% of {total} training runs
                </p>
                <p className="mt-2 text-[12px] text-ink-muted">{STATUS_HELP[status]}</p>
                <p className="mt-2 font-mono text-[11px] text-research-accent-hover">
                  {active ? "Showing these runs ✕" : count > 0 ? "Show these runs →" : ""}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="mono-label">
          {activeStatus ? `${activeStatus} runs` : needAttention > 0 ? "Runs that need attention" : "Runs"}
        </h2>

        {drilldown === null ? (
          <p className="text-[13.5px] text-ink-faint">{CAPTURE_RUNS_UNAVAILABLE}</p>
        ) : runs.length === 0 ? (
          <p className="text-[13.5px] text-ink-faint">
            {activeStatus
              ? `No ${activeStatus} runs${projectId ? " in this project" : ""}.`
              : needAttention === 0
                ? total === 0
                  ? "No training runs yet."
                  : "Every run's capture is complete. Nothing to fix."
                : "Couldn't load the runs behind these counts."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {runs.map((run) => {
              const { projectId: runProjectId, projectName, experimentId, experimentName, issues } = run;
              return (
                <li key={run.trainingRunId} className="rounded-xl border border-research-border bg-research-panel p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/projects/${runProjectId}/experiments/${experimentId}?entity=run:${run.trainingRunId}`}
                        className="inline-block max-w-full truncate py-1 text-[14.5px] font-medium text-ink underline underline-offset-2 hover:text-research-accent-hover"
                      >
                        {run.name}
                      </Link>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">
                        {projectName} / {experimentName} · {formatDateTime(run.createdAt)}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[run.captureStatus ?? "unknown"]} dot>
                      {run.captureStatus ?? "not reported"}
                    </Badge>
                  </div>
                  {issues.length > 0 ? (
                    <ul className="mt-3 flex flex-col gap-1 text-[13px] text-research-ink-secondary">
                      {issues.map((issue) => (
                        <li key={`${issue.integration}:${issue.kind}`} className="flex gap-2">
                          <span className="text-research-warning" aria-hidden>
                            ●
                          </span>
                          {describeCaptureIssue(issue)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[13px] text-research-ink-muted">
                      {run.captureStatus === "complete"
                        ? "Every integration this run reported was attached and closed."
                        : run.captureStatus === "partial"
                          ? "Marked partial, but no specific integration problem was recorded."
                          : "This run never reported whether its capture finished."}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {truncated ? (
          <p className="text-[12px] text-ink-faint">Showing the 100 most recent. Filter by project to narrow it down.</p>
        ) : null}
      </section>

      <section>
        <h2 className="mono-label mb-3">By integration</h2>
        {health === null ? (
          <p className="text-[13.5px] text-ink-faint">{CAPTURE_RUNS_UNAVAILABLE}</p>
        ) : health.length === 0 ? (
          <p className="text-[13.5px] text-ink-faint">No integrations reported yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="max-w-[70ch] text-[12.5px] text-ink-muted">
              <strong className="font-medium text-ink-secondary">Coverage</strong> is how many runs reported the
              integration; <strong className="font-medium text-ink-secondary">closed</strong> is how many of those
              finished cleanly. Weakest first.
            </p>
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-surface/60">
                    <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                      integration
                    </th>
                    <th scope="col" className="w-[26%] px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                      coverage
                    </th>
                    <th scope="col" className="w-[26%] px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                      closed
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                      left open
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {health.map((item) => (
                    <tr key={item.integration} className="border-b border-line align-middle last:border-b-0">
                      <td className="px-3 py-3 font-medium text-ink">{item.integration}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[12px] text-ink-secondary">
                            {item.total} of {pluralize(total, "run")} · {percent(item.coverage)}
                          </span>
                          <Meter value={item.coverage} tone="blue" />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[12px] text-ink-secondary">
                            {item.closed} of {item.total} · {percent(item.closeRate)}
                          </span>
                          <Meter value={item.closeRate} tone={item.closeRate === 1 ? "ok" : "warn"} />
                        </div>
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 font-mono text-[12px]",
                          item.dangling > 0 ? "text-research-warning" : "text-ink-faint",
                        )}
                      >
                        {item.dangling > 0 ? `${item.dangling} attached, never closed` : "none"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
