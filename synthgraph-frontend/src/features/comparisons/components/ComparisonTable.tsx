import Link from "next/link";
import { buildComparisonRows } from "@/features/comparisons/lib/parameter-diff";
import type { ComparedGeneration } from "@/features/comparisons/types/comparison";
import { cn } from "@/lib/utils";

export function ComparisonTable({
  generations,
  projectIdByExperimentId,
}: {
  generations: ComparedGeneration[];
  /** Resolved server-side (this shape only carries experimentId, not
   * projectId) via the flat GET /experiments/:id route — missing entries
   * (a lookup that failed) fall back to plain text instead of a link. */
  projectIdByExperimentId: Record<string, string>;
}) {
  const rows = buildComparisonRows(generations);

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line bg-surface/60">
            <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
              field
            </th>
            {generations.map((generation) => {
              const projectId = projectIdByExperimentId[generation.experimentId];
              return (
                <th key={generation.id} scope="col" className="px-3 py-2 text-left text-ink">
                  {projectId ? (
                    <Link
                      href={`/dashboard/projects/${projectId}/experiments/${generation.experimentId}/generations/${generation.id}`}
                      className="underline underline-offset-2 hover:text-cyan"
                    >
                      {generation.name}
                    </Link>
                  ) : (
                    generation.name
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className={cn(
                "border-b border-line last:border-b-0",
                row.differs && "border-warn/30 bg-warn/[0.05]",
              )}
            >
              <td className="px-3 py-2 font-mono text-[11px] text-ink-faint">{row.label}</td>
              {row.values.map((value, index) => (
                <td key={index} className="px-3 py-2 text-ink">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
