import Link from "next/link";
import { formatDate } from "@/shared/lib/format";
import { ResearchBadge } from "@/shared/ui/ResearchBadge";
import { ResearchCard } from "@/shared/ui/ResearchCard";
import type { Asset } from "../types/asset";

export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Link href={`/dashboard/assets/${asset.id}`}>
      <ResearchCard interactive className="p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-[16px] font-medium text-research-ink">{asset.name}</h3>
          {asset.type ? (
            <ResearchBadge className="shrink-0 whitespace-nowrap">{asset.type}</ResearchBadge>
          ) : null}
        </div>
        {asset.description ? (
          <p className="mt-1.5 line-clamp-2 text-[13.5px] text-research-ink-muted">
            {asset.description}
          </p>
        ) : null}
        <p className="mt-3 font-mono text-[11px] text-research-ink-muted">
          Created {formatDate(asset.createdAt)}
        </p>
      </ResearchCard>
    </Link>
  );
}
