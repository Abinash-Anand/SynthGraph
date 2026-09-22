import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { getAssetVersion } from "@/features/assets/server/assets-api";
import { getSession, requireSession } from "@/features/auth/server/session";
import { NotFoundError } from "@/shared/http/errors";
import { formatDateTime } from "@/shared/lib/format";

type PageParams = { assetId: string; versionId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { versionId } = await params;
  const session = await getSession();
  if (!session) return {};
  try {
    const version = await getAssetVersion(session.apiKey, versionId);
    return { title: version.version };
  } catch {
    return {};
  }
}

export default async function AssetVersionDetailPage({ params }: { params: Promise<PageParams> }) {
  const { assetId, versionId } = await params;
  const session = await requireSession();

  const version = await getAssetVersion(session.apiKey, versionId).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  if (version.assetId !== assetId) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/dashboard/assets/${assetId}`}
          className="mono-label text-research-ink-muted transition-colors hover:text-research-ink"
        >
          ← Asset
        </Link>
        <h1 className="mt-2 text-[22px] font-medium tracking-[-0.01em] text-research-ink">
          {version.version}
        </h1>
        <p className="mt-1 font-mono text-[12.5px] text-research-ink-muted">{version.uri}</p>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-research-ink-muted">
          <div className="flex gap-1.5">
            <dt>Created</dt>
            <dd>{formatDateTime(version.createdAt)}</dd>
          </div>
          {version.size ? (
            <div className="flex gap-1.5">
              <dt>Size</dt>
              <dd>{version.size} bytes</dd>
            </div>
          ) : null}
          {version.checksum ? (
            <div className="flex gap-1.5">
              <dt>Checksum</dt>
              <dd>{version.checksum}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {Object.keys(version.metadata).length > 0 ? (
        <div>
          <h2 className="mono-label mb-3 text-research-ink-muted">Metadata</h2>
          <CodeBlock language="json" code={JSON.stringify(version.metadata, null, 2)} />
        </div>
      ) : null}
    </div>
  );
}
