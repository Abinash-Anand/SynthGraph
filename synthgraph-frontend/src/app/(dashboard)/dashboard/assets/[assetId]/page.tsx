import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAsset, listAssetVersions } from "@/features/assets/server/assets-api";
import { CreateAssetVersionForm } from "@/features/assets/components/CreateAssetVersionForm";
import { AssetVersionRow } from "@/features/assets/components/AssetVersionRow";
import { getSession, requireSession } from "@/features/auth/server/session";
import { NotFoundError } from "@/shared/http/errors";
import { formatDate } from "@/shared/lib/format";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ResearchBadge } from "@/shared/ui/ResearchBadge";

type PageParams = { assetId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { assetId } = await params;
  const session = await getSession();
  if (!session) return {};
  try {
    const asset = await getAsset(session.apiKey, assetId);
    return { title: asset.name };
  } catch {
    return {};
  }
}

export default async function AssetDetailPage({ params }: { params: Promise<PageParams> }) {
  const { assetId } = await params;
  const session = await requireSession();

  const asset = await getAsset(session.apiKey, assetId).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  const versions = await listAssetVersions(session.apiKey, assetId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard/assets"
          className="mono-label text-research-ink-muted transition-colors hover:text-research-ink"
        >
          ← Assets
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">{asset.name}</h1>
          {asset.type ? <ResearchBadge>{asset.type}</ResearchBadge> : null}
        </div>
        {asset.description ? (
          <p className="mt-1 text-[14px] text-research-ink-muted">{asset.description}</p>
        ) : null}
        <p className="mt-2 font-mono text-[11px] text-research-ink-muted">
          Created {formatDate(asset.createdAt)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="mono-label text-research-ink-muted">Versions</h2>
        <CreateAssetVersionForm assetId={assetId} />
        {versions.length === 0 ? (
          <EmptyState title="No versions yet" description="Add the first version above." />
        ) : (
          <div className="flex flex-col gap-2">
            {versions.map((version) => (
              <AssetVersionRow key={version.id} assetId={assetId} version={version} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
