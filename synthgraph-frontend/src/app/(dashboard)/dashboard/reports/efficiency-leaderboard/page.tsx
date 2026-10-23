import type { Metadata } from "next";
import { requireSession } from "@/features/auth/server/session";
import { listProjects } from "@/features/projects/server/projects-api";
import { EfficiencyLeaderboardView } from "@/features/reports/components/EfficiencyLeaderboardView";
import { ProjectFilterField } from "@/features/reports/components/ProjectFilterField";
import { getEfficiencyLeaderboard } from "@/features/reports/server/reports-api";
import { resolveRunLinks } from "@/features/reports/server/resolve-run-links";

export const metadata: Metadata = { title: "Efficiency Leaderboard" };

export default async function EfficiencyLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  const session = await requireSession();

  const [leaderboard, projects] = await Promise.all([
    getEfficiencyLeaderboard(session.apiKey, projectId),
    listProjects(session.apiKey),
  ]);
  const linksByRunId = await resolveRunLinks(
    session.apiKey,
    leaderboard.runs.map((run) => run.trainingRunId),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">Efficiency Leaderboard</h1>
        <p className="mt-1 max-w-[62ch] text-[14px] text-ink-muted">
          Which runs got the best result for the least training time. Runs on the frontier can&apos;t be beaten
          on both axes at once; everything else has a faster, better alternative.
        </p>
      </div>

      <div className="max-w-[280px]">
        <ProjectFilterField projects={projects} />
      </div>

      <EfficiencyLeaderboardView
        leaderboard={leaderboard}
        linksByRunId={linksByRunId}
        projectScoped={Boolean(projectId)}
      />
    </div>
  );
}
