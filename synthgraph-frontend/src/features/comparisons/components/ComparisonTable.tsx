import { buildComparisonRows } from "@/features/comparisons/lib/parameter-diff";
import type { Generation } from "@/features/generations/types/generation";
import { cn } from "@/lib/utils";

// Headers aren't hyperlinked: a Generation only carries `experiment_id`,
// and there's no confirmed route to resolve `projectId` from that alone.
export function ComparisonTable({ generations }: { generations: Generation[] }) {
  const rows = buildComparisonRows(generations);

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line bg-surface/60">
            <th className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">field</th>
            {generations.map((generation) => (
              <th key={generation.id} className="px-3 py-2 text-left text-ink">
                {generation.name}
              </th>
            ))}
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
