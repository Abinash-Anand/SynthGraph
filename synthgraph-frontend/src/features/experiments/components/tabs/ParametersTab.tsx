import { ParameterCorrelationView } from "@/features/reports/components/ParameterCorrelationView";
import type { ParameterCorrelationReport } from "@/features/reports/types/report";
import { cn } from "@/lib/utils";
import type { EnrichedTrainingRun } from "../../types/experiment-workspace";

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Varying keys are the research question ("what actually changed?") -
 * kept prominent; constant keys are muted, per design.md's Parameter
 * Presentation rules. Which keys vary is read from correlationReport
 * (the backend's own grouping already excludes constant keys - "a
 * constant param across every run has nothing to correlate" - so a key
 * present there is, by construction, a varying one) rather than
 * recomputed here, so there's one definition of "varying" instead of two
 * that could disagree on an edge case. */
function ParametersAcrossRuns({
  runs,
  correlationReport,
}: {
  runs: EnrichedTrainingRun[];
  correlationReport: ParameterCorrelationReport;
}) {
  if (runs.length === 0) return null;

  const keys = Array.from(new Set(runs.flatMap((r) => Object.keys(r.run.parameters)))).sort();
  const varyingKeySet = new Set(correlationReport.correlations.map((c) => c.parameterKey));
  const varyingKeys = keys.filter((key) => varyingKeySet.has(key));
  const constantKeys = keys.filter((key) => !varyingKeySet.has(key));

  return (
    <div className="overflow-x-auto rounded-xl border border-research-border">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-research-border bg-research-panel">
            <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">parameter</th>
            {runs.map((r) => (
              <th key={r.run.id} className="px-3 py-2.5 text-left text-research-ink-muted">
                {r.run.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...varyingKeys, ...constantKeys].map((key) => {
            const varying = varyingKeySet.has(key);
            return (
              <tr
                key={key}
                className={cn(
                  "border-b border-research-border last:border-b-0",
                  varying && "bg-research-accent-subtle/[0.06]",
                )}
              >
                <td
                  className={cn(
                    "max-w-[200px] truncate px-3 py-2.5 font-mono",
                    varying ? "text-research-ink" : "text-research-ink-muted",
                  )}
                  title={key}
                >
                  {key}
                </td>
                {runs.map((r) => {
                  const value = formatValue(r.run.parameters[key]);
                  return (
                    <td
                      key={r.run.id}
                      title={value}
                      className={cn(
                        "max-w-[240px] truncate px-3 py-2.5 font-mono tabular-nums",
                        varying ? "text-research-ink" : "text-research-ink-muted",
                      )}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ParametersTab({
  runs,
  correlationReport,
}: {
  runs: EnrichedTrainingRun[];
  correlationReport: ParameterCorrelationReport;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mono-label mb-3 text-research-ink-muted">Parameters across runs</h2>
        {runs.length === 0 ? (
          <p className="text-[13.5px] text-research-ink-muted">No training runs yet.</p>
        ) : (
          <ParametersAcrossRuns runs={runs} correlationReport={correlationReport} />
        )}
      </div>
      <div>
        <h2 className="mono-label mb-3 text-research-ink-muted">Correlation with outcomes</h2>
        <ParameterCorrelationView report={correlationReport} />
      </div>
    </div>
  );
}
