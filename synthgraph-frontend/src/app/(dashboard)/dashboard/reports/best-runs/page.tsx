import type { Metadata } from "next";
import { requireSession } from "@/features/auth/server/session";
import { listProjects } from "@/features/projects/server/projects-api";
import { BestRunsView } from "@/features/reports/components/BestRunsView";
import { ProjectFilterField } from "@/features/reports/components/ProjectFilterField";
import { getBestRuns } from "@/features/reports/server/reports-api";
import { resolveRunLinks } from "@/features/reports/server/resolve-run-links";

export const metadata: Metadata = { title: "Best Runs" };

export default async function BestRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  const session = await requireSession();

  const [report, projects] = await Promise.all([
    getBestRuns(session.apiKey, projectId),
    listProjects(session.apiKey),
  ]);
  const runIds = report.records.flatMap((record) => [record.maxTrainingRunId, record.minTrainingRunId]);
  const linksByRunId = await resolveRunLinks(session.apiKey, runIds);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">Best Runs</h1>
        <p className="mt-1 max-w-[62ch] text-[14px] text-research-ink-muted">
          The highest and lowest value ever recorded for each metric across your completed training
          runs — which direction counts as &ldquo;better&rdquo; depends on the metric, so both extremes
          are shown.
        </p>
      </div>

      <div className="max-w-[280px]">
        <ProjectFilterField projects={projects} />
      </div>

      <BestRunsView report={report} linksByRunId={linksByRunId} />
    </div>
  );
}
