import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession, requireSession } from "@/features/auth/server/session";
import { CreateDatasetVersionForm } from "@/features/datasets/components/CreateDatasetVersionForm";
import { DatasetDetailHeader } from "@/features/datasets/components/DatasetDetailHeader";
import { DatasetVersionRow } from "@/features/datasets/components/DatasetVersionRow";
import { getDataset, listDatasetVersions } from "@/features/datasets/server/datasets-api";
import { NotFoundError } from "@/shared/http/errors";
import { EmptyState } from "@/shared/ui/EmptyState";

type PageParams = { datasetId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { datasetId } = await params;
  const session = await getSession();
  if (!session) return {};
  try {
    const dataset = await getDataset(session.apiKey, datasetId);
    return { title: dataset.name };
  } catch {
    return {};
  }
}

export default async function DatasetDetailPage({ params }: { params: Promise<PageParams> }) {
  const { datasetId } = await params;
  const session = await requireSession();

  const dataset = await getDataset(session.apiKey, datasetId).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  const versions = await listDatasetVersions(session.apiKey, datasetId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard/datasets"
          className="mono-label text-research-ink-muted transition-colors hover:text-research-ink"
        >
          ← Datasets
        </Link>
        <div className="mt-2">
          <DatasetDetailHeader dataset={dataset} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="mono-label text-research-ink-muted">Versions</h2>
        <CreateDatasetVersionForm datasetId={datasetId} />
        {versions.length === 0 ? (
          <EmptyState title="No versions yet" description="Add the first version above." />
        ) : (
          <div className="flex flex-col gap-2">
            {versions.map((version) => (
              <DatasetVersionRow key={version.id} datasetId={datasetId} version={version} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
