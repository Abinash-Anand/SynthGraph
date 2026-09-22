import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/shared/lib/format";
import type { Asset } from "../types/asset";

export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Link href={`/dashboard/assets/${asset.id}`}>
      <Card interactive className="p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[16px] font-medium text-ink">{asset.name}</h3>
          {asset.type ? <Badge tone="neutral">{asset.type}</Badge> : null}
        </div>
        {asset.description ? (
          <p className="mt-1.5 line-clamp-2 text-[13.5px] text-ink-muted">{asset.description}</p>
        ) : null}
        <p className="mt-3 font-mono text-[11px] text-ink-faint">
          Created {formatDate(asset.createdAt)}
        </p>
      </Card>
    </Link>
  );
}
