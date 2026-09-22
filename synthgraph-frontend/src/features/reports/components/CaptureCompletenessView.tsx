import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { CaptureCompletenessReport } from "../types/report";

const STATUS_TONE = {
  complete: "ok",
  partial: "warn",
  unknown: "neutral",
} as const;

export function CaptureCompletenessView({ report }: { report: CaptureCompletenessReport }) {
  const { total, byStatus, byIntegration } = report;
  const statuses = Object.entries(byStatus) as Array<[keyof typeof byStatus, number]>;
  const integrations = Object.entries(byIntegration);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {statuses.map(([status, count]) => (
          <Card key={status} className="p-5">
            <Badge tone={STATUS_TONE[status]} dot>
              {status}
            </Badge>
            <p className="mt-3 text-[28px] font-medium text-ink">{count}</p>
            <p className="mt-1 font-mono text-[11px] text-ink-faint">
              {total > 0 ? Math.round((count / total) * 100) : 0}% of {total} training runs
            </p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mono-label mb-3">By integration</h2>
        {integrations.length === 0 ? (
          <p className="text-[13.5px] text-ink-faint">No integrations reported yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface/60">
                  <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                    integration
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                    reported
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                    attached
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                    closed
                  </th>
                </tr>
              </thead>
              <tbody>
                {integrations.map(([name, counts]) => (
                  <tr key={name} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 text-ink">{name}</td>
                    <td className="px-3 py-2 text-ink-muted">{counts.total}</td>
                    <td className="px-3 py-2 text-ink-muted">{counts.attached}</td>
                    <td className="px-3 py-2 text-ink-muted">{counts.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
