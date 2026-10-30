import { ParameterCorrelationView } from "@/features/reports/components/ParameterCorrelationView";
import type { ParameterCorrelationReport } from "@/features/reports/types/report";
import { cn } from "@/lib/utils";
import { formatMetricValue } from "@/shared/lib/format";
import { classifyParameter, ROLE_LABEL } from "../../parameter-model";
import { PARAMETER_ANALYSIS_BADGE, PARAMETER_ANALYSIS_INTRO, PARAMETER_ANALYSIS_TITLE } from "../../parameter-insights-copy";
import type { EnrichedTrainingRun } from "../../types/experiment-workspace";
import { ParameterInsights } from "./ParameterInsights";

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "number") return formatMetricValue(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Untruncated text for the hover title - formatValue rounds numbers.
function fullValue(value: unknown): string {
  if (value === undefined) return "—";
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return String(value);
}

function ParameterTable({
  keys,
  runs,
  varyingKeySet,
}: {
  keys: string[];
  runs: EnrichedTrainingRun[];
  varyingKeySet: Set<string>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-research-border">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-research-border bg-research-panel">
            <th className="sticky left-0 z-[1] bg-research-panel px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">
              parameter
            </th>
            {runs.map((r) => (
              <th key={r.run.id} className="whitespace-nowrap px-3 py-2.5 text-left text-research-ink-muted">
                {r.run.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const varying = varyingKeySet.has(key);
            const role = classifyParameter(key);
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
                    "sticky left-0 z-[1] max-w-[220px] truncate px-3 py-2.5 font-mono",
                    varying ? "bg-research-panel font-medium text-research-ink" : "bg-research-bg text-research-ink-muted",
                  )}
                  title={key}
                >
                  {key}
                  {role !== "other" ? (
                    <span className="ml-2 rounded border border-research-border px-1 py-0.5 text-[9.5px] font-normal text-research-ink-muted">
                      {ROLE_LABEL[role]}
                    </span>
                  ) : null}
                </td>
                {runs.map((r) => (
                  <td
                    key={r.run.id}
                    title={fullValue(r.run.parameters[key])}
                    className={cn(
                      "max-w-[240px] truncate px-3 py-2.5 font-mono tabular-nums",
                      varying ? "text-research-ink" : "text-research-ink-muted",
                    )}
                  >
                    {formatValue(r.run.parameters[key])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Varying keys are the research question ("what actually changed?") -
 * kept prominent; constant keys are the same in every run, so they're
 * folded away instead of padding the table. Which keys vary is read from
 * correlationReport (the backend's own grouping already excludes constant
 * keys - "a constant param across every run has nothing to correlate" - so
 * a key present there is, by construction, a varying one) rather than
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
    <div className="flex flex-col gap-4">
      {varyingKeys.length > 0 ? (
        <ParameterTable keys={varyingKeys} runs={runs} varyingKeySet={varyingKeySet} />
      ) : (
        <p className="text-[13.5px] text-research-ink-muted">
          No parameter differs between these runs.
        </p>
      )}

      {constantKeys.length > 0 ? (
        <details className="group rounded-xl border border-research-border">
          <summary className="cursor-pointer list-none px-4 py-3 text-[13px] text-research-ink-secondary hover:text-research-ink">
            <span className="mr-2 inline-block text-research-ink-muted transition-transform group-open:rotate-90">▸</span>
            {constantKeys.length} parameter{constantKeys.length === 1 ? "" : "s"} identical in every run
          </summary>
          <div className="border-t border-research-border p-3">
            <ParameterTable keys={constantKeys} runs={runs} varyingKeySet={varyingKeySet} />
          </div>
        </details>
      ) : null}
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
      {/* Leads with the answer, not the raw data: which parameters moved the
          outcome, and how much a handful of runs can honestly say, is the
          research question this tab exists to answer. */}
      <div className="rounded-xl border border-research-accent-subtle/40 bg-research-accent-subtle/[0.04] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-medium text-research-ink">{PARAMETER_ANALYSIS_TITLE}</h2>
          <span className="rounded-full border border-research-border px-2 py-0.5 font-mono text-[10.5px] text-research-ink-muted">
            {PARAMETER_ANALYSIS_BADGE}
          </span>
        </div>
        <p className="mt-1 mb-4 max-w-[62ch] text-[13px] text-research-ink-muted">{PARAMETER_ANALYSIS_INTRO}</p>
        <ParameterInsights runs={runs} metricDirections={correlationReport.metricDirections ?? {}} />
      </div>

      <div>
        <h2 className="mono-label mb-3 text-research-ink-muted">Values and results by parameter</h2>
        <ParameterCorrelationView report={correlationReport} />
      </div>

      <div>
        <h2 className="mono-label mb-3 text-research-ink-muted">All parameters</h2>
        {runs.length === 0 ? (
          <p className="text-[13.5px] text-research-ink-muted">No training runs yet.</p>
        ) : (
          <ParametersAcrossRuns runs={runs} correlationReport={correlationReport} />
        )}
      </div>
    </div>
  );
}
