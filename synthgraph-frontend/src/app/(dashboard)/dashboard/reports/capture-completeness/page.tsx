import type { Metadata } from "next";
import { requireSession } from "@/features/auth/server/session";
import { listProjects } from "@/features/projects/server/projects-api";
import { parseStatusFilter, type CaptureStatusFilter } from "@/features/reports/capture-model";
import { CaptureCompletenessView } from "@/features/reports/components/CaptureCompletenessView";
import { ProjectFilterField } from "@/features/reports/components/ProjectFilterField";
import { listRunsByCaptureStatus } from "@/features/reports/server/capture-runs";
import { getCaptureCompletenessReport } from "@/features/reports/server/reports-api";

export const metadata: Metadata = { title: "Capture Completeness" };

export default async function CaptureCompletenessPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; status?: string }>;
}) {
  const { projectId, status } = await searchParams;
  const activeStatus = parseStatusFilter(status);
  const session = await requireSession();

  // Default view is "what needs attention": the partial and unknown runs. A
  // clicked status card narrows it (or, for "complete", shows the healthy ones).
  const statuses: CaptureStatusFilter[] = activeStatus ? [activeStatus] : ["partial", "unknown"];

  const [report, projects, drilldown] = await Promise.all([
    getCaptureCompletenessReport(session.apiKey, projectId),
    listProjects(session.apiKey),
    listRunsByCaptureStatus(session.apiKey, statuses, projectId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">Capture Completeness</h1>
        <p className="mt-1 max-w-[62ch] text-[14px] text-ink-muted">
          How much of your training runs&apos; provenance actually made it to the backend — which runs fell short,
          and which integrations most often stay attached but never get closed out.
        </p>
      </div>

      <div className="max-w-[280px]">
        <ProjectFilterField projects={projects} />
      </div>

      <CaptureCompletenessView
        report={report}
        runs={drilldown.runs}
        truncated={drilldown.truncated}
        activeStatus={activeStatus}
        projectId={projectId}
      />
    </div>
  );
}
