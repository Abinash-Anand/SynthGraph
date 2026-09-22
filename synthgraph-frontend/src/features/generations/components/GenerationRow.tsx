import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/shared/lib/format";
import type { Generation } from "../types/generation";
import { GenerationStatusBadge } from "./GenerationStatusBadge";

export function GenerationRow({
  projectId,
  experimentId,
  generation,
}: {
  projectId: string;
  experimentId: string;
  generation: Generation;
}) {
  return (
    <Link
      href={`/dashboard/projects/${projectId}/experiments/${experimentId}/generations/${generation.id}`}
    >
      <Card interactive className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium text-ink">{generation.name}</p>
          <p className="mt-0.5 truncate font-mono text-[12px] text-ink-faint">
            {generation.generator.name}
            {generation.generator.version ? ` @ ${generation.generator.version}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <GenerationStatusBadge status={generation.status} />
          <p className="font-mono text-[11px] text-ink-faint">{formatDate(generation.created_at)}</p>
        </div>
      </Card>
    </Link>
  );
}
