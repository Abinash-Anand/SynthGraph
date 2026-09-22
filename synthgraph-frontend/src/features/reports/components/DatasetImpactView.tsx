import type { DatasetImpactReport } from "../types/report";

// Reports generation count and training-run list as two INDEPENDENT
// relationships, never implying a chain between them - there's no direct
// Generation<->TrainingRun link in the schema, only two separate
// junction-table relationships to this dataset version (matches the
// backend service's own documented reasoning).
export function DatasetImpactView({ report }: { report: DatasetImpactReport }) {
  if (report.trainingRuns.length === 0 && report.generationCount === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">Nothing references this version yet.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:max-w-[360px]">
        <div className="rounded-xl border border-research-border bg-research-panel p-4">
          <p className="mono-label text-research-ink-muted">Generations</p>
          <p className="mt-2 text-[22px] font-medium tabular-nums text-research-ink">
            {report.generationCount}
          </p>
        </div>
        <div className="rounded-xl border border-research-border bg-research-panel p-4">
          <p className="mono-label text-research-ink-muted">Training runs</p>
          <p className="mt-2 text-[22px] font-medium tabular-nums text-research-ink">
            {report.trainingRuns.length}
          </p>
        </div>
      </div>

      {report.trainingRuns.length > 0 ? (
        <div>
          <p className="mono-label mb-2 text-research-ink-muted">Trained with this version</p>
          <ul className="flex flex-col gap-1.5">
            {report.trainingRuns.map((run) => (
              <li
                key={run.trainingRunId}
                className="flex items-center justify-between rounded-md border border-research-border bg-research-subtle/40 px-3 py-2"
              >
                <span className="truncate text-[13px] text-research-ink">{run.name}</span>
                <span className="font-mono text-[11px] text-research-ink-muted">{run.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.metrics.length > 0 ? (
        <div>
          <p className="mono-label mb-2 text-research-ink-muted">Evaluation metrics</p>
          <div className="overflow-x-auto rounded-xl border border-research-border">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-research-border bg-research-panel">
                  <th className="px-3 py-2 text-left font-mono text-[11px] text-research-ink-muted">metric</th>
                  <th className="px-3 py-2 text-left font-mono text-[11px] text-research-ink-muted">avg</th>
                  <th className="px-3 py-2 text-left font-mono text-[11px] text-research-ink-muted">highest</th>
                  <th className="px-3 py-2 text-left font-mono text-[11px] text-research-ink-muted">lowest</th>
                </tr>
              </thead>
              <tbody>
                {report.metrics.map((metric) => (
                  <tr key={metric.metricKey} className="border-b border-research-border last:border-b-0">
                    <td className="px-3 py-2 font-mono text-research-ink">{metric.metricKey}</td>
                    <td className="px-3 py-2 tabular-nums text-research-ink">{metric.avg.toFixed(4)}</td>
                    <td className="px-3 py-2 tabular-nums text-research-ink-muted">
                      {metric.highestValue} ({metric.highestTrainingRunName})
                    </td>
                    <td className="px-3 py-2 tabular-nums text-research-ink-muted">
                      {metric.lowestValue} ({metric.lowestTrainingRunName})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
