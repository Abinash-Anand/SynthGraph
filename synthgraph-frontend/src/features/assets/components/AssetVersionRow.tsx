import Link from "next/link";
import { formatDate } from "@/shared/lib/format";
import { ResearchCard } from "@/shared/ui/ResearchCard";
import type { AssetVersion } from "../types/asset";

export function AssetVersionRow({ assetId, version }: { assetId: string; version: AssetVersion }) {
  return (
    <Link href={`/dashboard/assets/${assetId}/versions/${version.id}`}>
      <ResearchCard interactive className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium text-research-ink">{version.version}</p>
          <p className="mt-0.5 truncate font-mono text-[12px] text-research-ink-muted">{version.uri}</p>
        </div>
        <p className="shrink-0 font-mono text-[11px] text-research-ink-muted">
          {formatDate(version.createdAt)}
        </p>
      </ResearchCard>
    </Link>
  );
}
