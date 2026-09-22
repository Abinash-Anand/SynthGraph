import type { TrainingRunMetric } from "../types/training-run-metric";

/** Always rendered alongside MetricsChart as ground truth — includes
 * non-numeric keys the chart deliberately excludes. */
export function MetricsTable({ metrics }: { metrics: TrainingRunMetric[] }) {
  const keys = Array.from(new Set(metrics.flatMap((m) => Object.keys(m.metrics)))).sort();
  const sorted = [...metrics].sort((a, b) => a.step - b.step);

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line bg-surface/60">
            <th className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">step</th>
            {keys.map((key) => (
              <th key={key} className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((metric) => (
            <tr key={metric.id} className="border-b border-line last:border-b-0">
              <td className="px-3 py-2 font-mono text-ink-muted">{metric.step}</td>
              {keys.map((key) => (
                <td key={key} className="px-3 py-2 text-ink">
                  {formatCell(metric.metrics[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
