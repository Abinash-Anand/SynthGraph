import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/features/auth/server/session";
import { ReproductionManifestView } from "@/features/reproduction/components/ReproductionManifestView";
import { getReproductionManifest } from "@/features/reproduction/server/reproduction-api";
import { NotFoundError } from "@/shared/http/errors";

export const metadata: Metadata = { title: "Reproduction manifest" };

type PageParams = { projectId: string; experimentId: string; generationId: string };

export default async function ReproductionManifestPage({ params }: { params: Promise<PageParams> }) {
  const { projectId, experimentId, generationId } = await params;
  const session = await requireSession();

  const manifest = await getReproductionManifest(session.apiKey, generationId).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/dashboard/projects/${projectId}/experiments/${experimentId}/generations/${generationId}`}
          className="mono-label text-ink-faint transition-colors hover:text-ink"
        >
          ← Generation
        </Link>
        <h1 className="mt-2 text-[22px] font-medium tracking-[-0.01em] text-ink">
          Reproduction manifest
        </h1>
      </div>

      <ReproductionManifestView manifest={manifest} />
    </div>
  );
}
