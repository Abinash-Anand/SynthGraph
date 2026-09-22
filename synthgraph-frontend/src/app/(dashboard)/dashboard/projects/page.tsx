import type { Metadata } from "next";
import { requireSession } from "@/features/auth/server/session";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { listProjects } from "@/features/projects/server/projects-api";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await requireSession();
  const projects = await listProjects(session.apiKey);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">Projects</h1>
        <ButtonLink href="/dashboard/projects/new" size="sm">
          New project
        </ButtonLink>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project, or create one from the SynthGraph SDK or CLI."
          action={
            <ButtonLink href="/dashboard/projects/new" size="sm">
              New project
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
