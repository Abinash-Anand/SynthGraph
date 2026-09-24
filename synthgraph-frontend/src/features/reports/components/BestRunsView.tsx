import Link from "next/link";
import type { RunLink } from "../server/resolve-run-links";
import type { BestRunsReport } from "../types/report";

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

  return (
    <div className="overflow-x-auto rounded-xl border border-research-border">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-research-border bg-research-panel">
            <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">metric</th>
            <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">highest</th>
            <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">run</th>
            <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">lowest</th>
            <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">run</th>
          </tr>
        </thead>
        <tbody>
          {report.records.map((record) => (
            <tr key={record.metricKey} className="border-b border-research-border last:border-b-0">
              <td className="px-3 py-2.5 font-mono font-medium text-research-ink">{record.metricKey}</td>
              <td className="px-3 py-2.5 tabular-nums text-research-ink">{record.maxValue}</td>
              <td className="px-3 py-2.5 truncate">
                <RunNameCell
                  name={record.maxTrainingRunName}
                  runId={record.maxTrainingRunId}
                  link={linksByRunId[record.maxTrainingRunId]}
                />
              </td>
              <td className="px-3 py-2.5 tabular-nums text-research-ink">{record.minValue}</td>
              <td className="px-3 py-2.5 truncate">
                <RunNameCell
                  name={record.minTrainingRunName}
                  runId={record.minTrainingRunId}
                  link={linksByRunId[record.minTrainingRunId]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
