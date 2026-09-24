import Link from "next/link";
import type { Metadata } from "next";
import { ComparisonTable } from "@/features/comparisons/components/ComparisonTable";
import { GenerationIdsForm } from "@/features/comparisons/components/GenerationIdsForm";
import { compareGenerations } from "@/features/comparisons/server/comparisons-api";
import { requireSession } from "@/features/auth/server/session";
import { getExperiment } from "@/features/experiments/server/experiments-api";

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
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">
            Compare generations
          </h1>
          <p className="mt-1 text-[13.5px] text-research-ink-muted">
            Search for generations below, or select them to compare from an experiment&rsquo;s Overview tab.{" "}
            <Link
              href="/dashboard/compare/runs"
              className="underline underline-offset-2 hover:text-research-accent-hover"
            >
              Compare training runs instead
            </Link>
          </p>
        </div>
        <GenerationIdsForm prefill={requested} />
      </div>
    );
  }

  const session = await requireSession();
  const result = await compareGenerations(session.apiKey, requested).catch(() => null);

  // Generation only carries experiment_id, not projectId — resolve each
  // unique experiment (deduped, since compared generations often share one)
  // via the flat GET /experiments/:id route so the table can link back to
  // each generation's detail page.
  let projectIdByExperimentId: Record<string, string> = {};
  if (result) {
    const uniqueExperimentIds = Array.from(new Set(result.generations.map((g) => g.experimentId)));
    const experiments = await Promise.all(
      uniqueExperimentIds.map((id) => getExperiment(session.apiKey, id).catch(() => null)),
    );
    projectIdByExperimentId = Object.fromEntries(
      experiments
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .map((e) => [e.id, e.projectId]),
    );
  }

  const prefillNames = result
    ? Object.fromEntries(result.generations.map((g) => [g.id, g.name]))
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">Compare generations</h1>
      <div className="max-w-[640px]">
        <GenerationIdsForm
          prefill={requested}
          prefillNames={prefillNames}
          error={result ? undefined : "Could not load that comparison. Check the IDs and try again."}
        />
      </div>
      {result ? (
        <ComparisonTable
          generations={result.generations}
          differences={result.differences}
          projectIdByExperimentId={projectIdByExperimentId}
        />
      ) : null}
    </div>
  );
}
