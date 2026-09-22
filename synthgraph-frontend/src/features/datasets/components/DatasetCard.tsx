import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/shared/lib/format";
import type { Dataset } from "../types/dataset";

export function DatasetCard({ dataset }: { dataset: Dataset }) {
  return (
    <Link href={`/dashboard/datasets/${dataset.id}`}>
      <Card interactive className="p-5">
        <h3 className="text-[16px] font-medium text-ink">{dataset.name}</h3>
        {dataset.description ? (
          <p className="mt-1.5 line-clamp-2 text-[13.5px] text-ink-muted">{dataset.description}</p>
        ) : null}
        <p className="mt-3 font-mono text-[11px] text-ink-faint">
          Created {formatDate(dataset.createdAt)}
        </p>
      </Card>
    </Link>
  );
}
