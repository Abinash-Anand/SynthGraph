import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/features/auth/server/session";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { listProjects } from "@/features/projects/server/projects-api";
import { EmptyState } from "@/shared/ui/EmptyState";

export const metadata: Metadata = { title: "Dashboard" };

const RECENT_PROJECT_COUNT = 6;

export default async function DashboardOverviewPage() {
  const session = await requireSession();
  const projects = await listProjects(session.apiKey);
  const recent = projects.slice(0, RECENT_PROJECT_COUNT);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">Overview</h1>
        <p className="mt-1 text-[14px] text-ink-muted">Welcome back, {session.user.email}.</p>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="mono-label">Recent projects</h2>
          {projects.length > 0 ? (
            <Link href="/dashboard/projects" className="text-[13px] text-ink-muted hover:text-ink">
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
