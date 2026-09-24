import Link from "next/link";
import type { TrainingRunSearchResult } from "../types/report";

export function TrainingRunSearchResults({
  result,
  projectIdByExperimentId,
}: {
  result: TrainingRunSearchResult;
  projectIdByExperimentId: Record<string, string>;
}) {
  if (result.matches.length === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">No training runs matched.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-research-border">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-research-border bg-research-panel">
            <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">
              training run
            </th>
            <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">
              matched value
            </th>
          </tr>
        </thead>
        <tbody>
          {result.matches.map((match) => {
            const projectId = projectIdByExperimentId[match.experimentId];
            return (
              <tr key={match.trainingRunId} className="border-b border-research-border last:border-b-0">
                <td className="px-3 py-2.5 font-medium text-research-ink">
                  {projectId ? (
                    <Link
                      href={`/dashboard/projects/${projectId}/experiments/${match.experimentId}?entity=run:${match.trainingRunId}`}
                      className="underline underline-offset-2 hover:text-research-accent-hover"
                    >
                      {match.name}
                    </Link>
                  ) : (
                    match.name
                  )}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-research-ink">{match.matchedValue}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
