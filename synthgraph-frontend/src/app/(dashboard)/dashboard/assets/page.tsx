import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { AssetCard } from "@/features/assets/components/AssetCard";
import { listAssets } from "@/features/assets/server/assets-api";
import { requireSession } from "@/features/auth/server/session";
import { EmptyState } from "@/shared/ui/EmptyState";

export const metadata: Metadata = { title: "Assets" };

export default async function AssetsPage() {
  const session = await requireSession();
  const assets = await listAssets(session.apiKey);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">Assets</h1>
        <ButtonLink href="/dashboard/assets/new" size="sm">
          New asset
        </ButtonLink>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          title="No assets yet"
          description="Create your first asset, or create one from the SynthGraph SDK or CLI."
          action={
            <ButtonLink href="/dashboard/assets/new" size="sm">
              New asset
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
