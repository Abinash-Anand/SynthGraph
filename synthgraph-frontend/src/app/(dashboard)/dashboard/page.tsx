import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/features/auth/server/session";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { listProjects } from "@/features/projects/server/projects-api";
import { getCaptureCompletenessReport } from "@/features/reports/server/reports-api";
import { EmptyState } from "@/shared/ui/EmptyState";

export const metadata: Metadata = { title: "Dashboard" };

const RECENT_PROJECT_COUNT = 6;

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-research-border bg-research-panel p-4">
      <p className="mono-label text-research-ink-muted">{label}</p>
      <p className="mt-2 text-[24px] font-medium tabular-nums text-research-ink">{value}</p>
      {hint ? <p className="mt-1 text-[11.5px] text-research-ink-muted">{hint}</p> : null}
    </div>
  );
}

export default async function DashboardOverviewPage() {
  const session = await requireSession();
  const [projects, capture] = await Promise.all([
    listProjects(session.apiKey),
    getCaptureCompletenessReport(session.apiKey),
  ]);
  const recent = projects.slice(0, RECENT_PROJECT_COUNT);
  const completePercent =
    capture.total > 0 ? Math.round((capture.byStatus.complete / capture.total) * 100) : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">Overview</h1>
        <p className="mt-1 text-[14px] text-research-ink-muted">Welcome back, {session.user.email}.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Projects" value={String(projects.length)} />
        <StatCard label="Training runs" value={String(capture.total)} />
        <StatCard
          label="Capture completeness"
          value={completePercent !== null ? `${completePercent}%` : "—"}
          hint={
            capture.total > 0
              ? `${capture.byStatus.complete} of ${capture.total} fully captured`
              : "No training runs yet"
          }
        />
        <StatCard
          label="Partial / unknown"
          value={String(capture.byStatus.partial + capture.byStatus.unknown)}
          hint="worth a look — see Capture Completeness"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/reports/capture-completeness"
          className="rounded-md border border-research-border bg-research-panel px-3.5 py-2 text-[13px] font-medium text-research-ink transition-colors hover:border-research-accent-subtle"
        >
          Capture Completeness →
        </Link>
        <Link
          href="/dashboard/reports/best-runs"
          className="rounded-md border border-research-border bg-research-panel px-3.5 py-2 text-[13px] font-medium text-research-ink transition-colors hover:border-research-accent-subtle"
        >
          Best Runs →
        </Link>
        <Link
          href="/dashboard/compare"
          className="rounded-md border border-research-border bg-research-panel px-3.5 py-2 text-[13px] font-medium text-research-ink transition-colors hover:border-research-accent-subtle"
        >
          Compare →
        </Link>
        <span className="ml-auto self-center font-mono text-[11px] text-research-ink-muted">
          Press <kbd className="rounded border border-research-border px-1 py-0.5">Ctrl</kbd>+
          <kbd className="rounded border border-research-border px-1 py-0.5">K</kbd> to search
        </span>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="mono-label text-research-ink-muted">Recent projects</h2>
          {projects.length > 0 ? (
            <Link
              href="/dashboard/projects"
              className="text-[13px] text-research-ink-muted hover:text-research-ink"
            >
              View all
            </Link>
          ) : null}
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Projects are created from the SynthGraph SDK or CLI. Once you create one there, it shows up here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
