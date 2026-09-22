import type { ParameterCorrelation, ParameterCorrelationReport } from "../types/report";

export function ParameterCorrelationView({ report }: { report: ParameterCorrelationReport }) {
  if (report.correlations.length === 0) {
    return (
      <p className="text-[13.5px] text-ink-faint">
        {report.runCount < 2
          ? "Need at least 2 training runs in this experiment to correlate parameters with outcomes."
          : "No varying parameters found across this experiment's training runs."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {report.correlations.map((correlation) => (
        <CorrelationTable key={correlation.parameterKey} correlation={correlation} />
      ))}
    </div>
  );
}

function CorrelationTable({ correlation }: { correlation: ParameterCorrelation }) {
  const metricKeys = Array.from(
    new Set(correlation.groups.flatMap((group) => Object.keys(group.metrics))),
  ).sort();

  return (
    <div>
      <p className="mb-2 font-mono text-[12px] text-ink">{correlation.parameterKey}</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface/60">
              <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                value
              </th>
              <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                runs
              </th>
              {metricKeys.map((metricKey) => (
                <th
                  key={metricKey}
                  scope="col"
                  className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint"
                >
                  {metricKey} (avg)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {correlation.groups.map((group) => (
              <tr key={group.value} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2 text-ink">{group.value}</td>
                <td className="px-3 py-2 text-ink-muted">{group.runCount}</td>
                {metricKeys.map((metricKey) => (
                  <td key={metricKey} className="px-3 py-2 text-ink">
                    {group.metrics[metricKey] ? group.metrics[metricKey].avg.toFixed(4) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
