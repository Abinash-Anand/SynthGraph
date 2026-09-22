import type { BestRunsReport } from "../types/report";

export function BestRunsView({ report }: { report: BestRunsReport }) {
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
              <td className="px-3 py-2.5 font-mono text-research-ink">{record.metricKey}</td>
              <td className="px-3 py-2.5 tabular-nums text-research-ink">{record.maxValue}</td>
              <td className="px-3 py-2.5 truncate text-research-ink-muted">{record.maxTrainingRunName}</td>
              <td className="px-3 py-2.5 tabular-nums text-research-ink">{record.minValue}</td>
              <td className="px-3 py-2.5 truncate text-research-ink-muted">{record.minTrainingRunName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
