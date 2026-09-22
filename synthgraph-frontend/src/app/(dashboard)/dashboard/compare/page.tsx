import type { Metadata } from "next";
import { ComparisonTable } from "@/features/comparisons/components/ComparisonTable";
import { GenerationIdsForm } from "@/features/comparisons/components/GenerationIdsForm";
import { compareGenerations } from "@/features/comparisons/server/comparisons-api";
import { requireSession } from "@/features/auth/server/session";

export const metadata: Metadata = { title: "Compare" };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const requested = ids?.split(",").filter(Boolean) ?? [];

  if (requested.length < 2) {
    return (
      <div className="flex max-w-[640px] flex-col gap-6">
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">Compare generations</h1>
        <GenerationIdsForm prefill={requested} />
      </div>
    );
  }

  const session = await requireSession();
  const result = await compareGenerations(session.apiKey, requested).catch(() => null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">Compare generations</h1>
      <div className="max-w-[640px]">
        <GenerationIdsForm
          prefill={requested}
          error={result ? undefined : "Could not load that comparison. Check the IDs and try again."}
        />
      </div>
      {result ? <ComparisonTable generations={result.generations} /> : null}
    </div>
  );
}
