import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/shared/lib/format";
import type { DatasetVersion } from "../types/dataset";

export function DatasetVersionRow({ datasetId, version }: { datasetId: string; version: DatasetVersion }) {
  return (
    <Link href={`/dashboard/datasets/${datasetId}/versions/${version.id}`}>
      <Card interactive className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium text-ink">{version.version}</p>
          <p className="mt-0.5 truncate font-mono text-[12px] text-ink-faint">{version.uri}</p>
        </div>
        <p className="shrink-0 font-mono text-[11px] text-ink-faint">{formatDate(version.createdAt)}</p>
      </Card>
    </Link>
  );
}
