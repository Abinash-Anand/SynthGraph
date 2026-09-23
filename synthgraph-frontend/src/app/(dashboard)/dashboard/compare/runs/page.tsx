import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/features/auth/server/session";
import { TrainingRunComparisonTable } from "@/features/comparisons/components/TrainingRunComparisonTable";
import { TrainingRunIdsForm } from "@/features/comparisons/components/TrainingRunIdsForm";
import { compareTrainingRuns } from "@/features/comparisons/server/comparisons-api";
import { getExperiment } from "@/features/experiments/server/experiments-api";

export const metadata: Metadata = { title: "Compare Training Runs" };

export default async function CompareTrainingRunsPage({
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
            Compare training runs
          </h1>
          <p className="mt-1 text-[13.5px] text-research-ink-muted">
            Paste IDs below, or select training runs to compare from an experiment&rsquo;s Runs tab.{" "}
            <Link href="/dashboard/compare" className="underline underline-offset-2 hover:text-research-accent-hover">
              Compare generations instead
            </Link>
          </p>
        </div>
        <TrainingRunIdsForm prefill={requested} />
      </div>
    );
  }

  const session = await requireSession();
  const result = await compareTrainingRuns(session.apiKey, requested).catch(() => null);

  // TrainingRun only carries experimentId, not projectId — resolve each
  // unique experiment (deduped, since compared runs often share one) via
  // the flat GET /experiments/:id route, same pattern as the generations
  // compare page.
  let projectIdByExperimentId: Record<string, string> = {};
  if (result) {
    const uniqueExperimentIds = Array.from(new Set(result.trainingRuns.map((r) => r.experimentId)));
    const experiments = await Promise.all(
      uniqueExperimentIds.map((id) => getExperiment(session.apiKey, id).catch(() => null)),
    );
    projectIdByExperimentId = Object.fromEntries(
      experiments
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .map((e) => [e.id, e.projectId]),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">Compare training runs</h1>
      <div className="max-w-[640px]">
        <TrainingRunIdsForm
          prefill={requested}
          error={result ? undefined : "Could not load that comparison. Check the IDs and try again."}
        />
      </div>
      {result ? (
        <TrainingRunComparisonTable
          trainingRuns={result.trainingRuns}
          differences={result.differences}
          projectIdByExperimentId={projectIdByExperimentId}
        />
      ) : null}
    </div>
  );
}
