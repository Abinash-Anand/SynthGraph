import type { Metadata } from "next";
import { requireSession } from "@/features/auth/server/session";
import { EfficiencyLeaderboardView } from "@/features/reports/components/EfficiencyLeaderboardView";
import { getEfficiencyLeaderboard } from "@/features/reports/server/reports-api";
import { resolveRunLinks } from "@/features/reports/server/resolve-run-links";

export const metadata: Metadata = { title: "Efficiency Leaderboard" };

export default async function EfficiencyLeaderboardPage() {
  const session = await requireSession();
  const leaderboard = await getEfficiencyLeaderboard(session.apiKey);
  const linksByRunId = await resolveRunLinks(
    session.apiKey,
    leaderboard.runs.map((run) => run.trainingRunId),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">Efficiency Leaderboard</h1>
        <p className="mt-1 max-w-[62ch] text-[14px] text-ink-muted">
          Completed training runs ranked by evaluation score per hour of wall-clock training time —
          which config gets good results fastest, not just which gets the best score.
        </p>
      </div>

      <EfficiencyLeaderboardView leaderboard={leaderboard} linksByRunId={linksByRunId} />
    </div>
  );
}
