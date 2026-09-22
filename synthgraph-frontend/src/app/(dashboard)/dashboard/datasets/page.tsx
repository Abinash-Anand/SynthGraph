import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { requireSession } from "@/features/auth/server/session";
import { DatasetCard } from "@/features/datasets/components/DatasetCard";
import { listDatasets } from "@/features/datasets/server/datasets-api";
import { EmptyState } from "@/shared/ui/EmptyState";

export const metadata: Metadata = { title: "Datasets" };

export default async function DatasetsPage() {
  const session = await requireSession();
  const datasets = await listDatasets(session.apiKey);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">Datasets</h1>
        <ButtonLink href="/dashboard/datasets/new" size="sm">
          New dataset
        </ButtonLink>
      </div>

      {datasets.length === 0 ? (
        <EmptyState
          title="No datasets yet"
          description="Create your first dataset, or create one from the SynthGraph SDK or CLI."
          action={
            <ButtonLink href="/dashboard/datasets/new" size="sm">
              New dataset
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
        </div>
      )}
    </div>
  );
}
