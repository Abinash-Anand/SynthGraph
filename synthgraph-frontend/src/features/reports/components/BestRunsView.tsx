import Link from "next/link";
import { formatMetricValue } from "@/shared/lib/format";
import { directionLabel } from "@/shared/lib/metric-semantics";
import { type BestRunRow, buildBestRunsModel, type RunValue } from "../best-runs-model";
import type { RunLink } from "../server/resolve-run-links";
import type { BestRunsReport } from "../types/report";

const headerClass = "px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted";

function RunNameCell({
  name,
  runId,
  link,
}: {
  name: string;
  runId: string;
  link?: RunLink;
}) {
  if (!link) return <span className="truncate text-research-ink-muted">{name}</span>;
  return (
    <Link
      href={`/dashboard/projects/${link.projectId}/experiments/${link.experimentId}?entity=run:${runId}`}
      className="truncate text-research-ink-muted underline underline-offset-2 hover:text-research-accent-hover"
    >
      {name}
    </Link>
  );
}

function ValueRun({ entry, linksByRunId }: { entry: RunValue; linksByRunId: Record<string, RunLink> }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="tabular-nums text-research-ink" title={String(entry.value)}>
        {formatMetricValue(entry.value)}
      </span>
      <RunNameCell name={entry.runName} runId={entry.runId} link={linksByRunId[entry.runId]} />
    </div>
  );
}

function DirectionChip({ row }: { row: BestRunRow }) {
  if (row.direction === "neutral") return null;
  return (
    <span
      title={`${directionLabel(row.direction)} (inferred from the metric's name)`}
      className="rounded border border-research-border px-1.5 py-0.5 font-mono text-[10px] text-research-ink-muted"
    >
      {row.direction === "higher" ? "↑ higher" : "↓ lower"}
    </span>
  );
}

function compareHref(row: BestRunRow): string | null {
  if (!row.best || !row.worst || row.flat || row.best.runId === row.worst.runId) return null;
  return `/dashboard/compare/runs?ids=${row.best.runId},${row.worst.runId}`;
}

function MetricRows({
  rows,
  linksByRunId,
}: {
  rows: BestRunRow[];
  linksByRunId: Record<string, RunLink>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-research-border">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-research-border bg-research-panel">
            <th className={headerClass}>metric</th>
            <th className={headerClass}>best</th>
            <th className={headerClass}>other extreme</th>
            <th className={headerClass} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = compareHref(row);
            // Without a direction there's no honest "best", so both extremes
            // are shown as plain high/low instead of crowning one.
            const first = row.best ?? row.high;
            const second = row.worst ?? row.low;
            return (
              <tr key={row.metricKey} className="border-b border-research-border align-top last:border-b-0">
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium text-research-ink">{row.metricKey}</span>
                    <DirectionChip row={row} />
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {row.flat ? (
                    <span className="text-research-ink-muted">
                      every run recorded {formatMetricValue(first.value)}
                    </span>
                  ) : (
                    <div className="flex items-start gap-2">
                      {row.best ? (
                        <span className="mt-0.5 font-mono text-[10px] text-research-accent-hover">BEST</span>
                      ) : (
                        <span className="mt-0.5 font-mono text-[10px] text-research-ink-muted">HIGH</span>
                      )}
                      <ValueRun entry={first} linksByRunId={linksByRunId} />
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {row.flat ? null : (
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 font-mono text-[10px] text-research-ink-muted">
                        {row.worst ? "WORST" : "LOW"}
                      </span>
                      <ValueRun entry={second} linksByRunId={linksByRunId} />
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {href ? (
                    <Link
                      href={href}
                      className="whitespace-nowrap text-[12.5px] text-research-accent-hover underline underline-offset-2"
                    >
                      Compare →
                    </Link>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function BestRunsView({
  report,
  linksByRunId = {},
}: {
  report: BestRunsReport;
  linksByRunId?: Record<string, RunLink>;
}) {
  if (report.records.length === 0) {
    return (
      <p className="text-[13.5px] text-research-ink-muted">
        {report.runCount === 0
          ? "No completed training runs with recorded durations yet."
          : "No numeric evaluation metrics recorded yet."}
      </p>
    );
  }

  const { outcomes, readings } = buildBestRunsModel(report.records);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[12.5px] text-research-ink-muted">
        Which direction counts as better is inferred from each metric&apos;s name (reward and accuracy up, loss and
        error down). Metrics with no clear direction show both extremes instead of picking a winner.
      </p>

      {outcomes.length > 0 ? <MetricRows rows={outcomes} linksByRunId={linksByRunId} /> : null}

      {readings.length > 0 ? (
        <details className="group rounded-xl border border-research-border">
          <summary className="cursor-pointer list-none px-4 py-3 text-[13px] text-research-ink-secondary hover:text-research-ink">
            <span className="mr-2 inline-block text-research-ink-muted transition-transform group-open:rotate-90">▸</span>
            Timing and system readings ({readings.length})
            <span className="ml-2 text-research-ink-muted">
              describe the machine, not the model, so no run is called best
            </span>
          </summary>
          <div className="border-t border-research-border p-3">
            <MetricRows rows={readings} linksByRunId={linksByRunId} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
