import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { getSession, requireSession } from "@/features/auth/server/session";
import { ExperimentRow } from "@/features/experiments/components/ExperimentRow";
import { listExperiments } from "@/features/experiments/server/experiments-api";
import { ProjectDetailHeader } from "@/features/projects/components/ProjectDetailHeader";
import { getProject } from "@/features/projects/server/projects-api";
import { NotFoundError } from "@/shared/http/errors";
import { EmptyState } from "@/shared/ui/EmptyState";

type PageParams = { projectId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { projectId } = await params;
  // Not requireSession(): redirect() inside generateMetadata isn't a
  // documented-safe pattern, and the (dashboard) layout already enforces
  // the redirect regardless — this just degrades to a default title.
  const session = await getSession();
  if (!session) return {};
  try {
    const project = await getProject(session.apiKey, projectId);
    return { title: project.name };
  } catch {
    return {};
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<PageParams> }) {
  const { projectId } = await params;
  const session = await requireSession();

  const project = await getProject(session.apiKey, projectId).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  const experiments = await listExperiments(session.apiKey, projectId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard/projects"
          className="mono-label text-research-ink-muted transition-colors hover:text-research-ink"
        >
          ← Projects
        </Link>
        <div className="mt-2">
          <ProjectDetailHeader project={project} />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="mono-label text-research-ink-muted">Experiments</h2>
          <ButtonLink href={`/dashboard/projects/${projectId}/experiments/new`} size="sm">
            New experiment
          </ButtonLink>
        </div>
        {experiments.length === 0 ? (
          <EmptyState
            title="No experiments yet"
            description="Create your first experiment, or create one from the SynthGraph SDK."
            action={
              <ButtonLink href={`/dashboard/projects/${projectId}/experiments/new`} size="sm">
                New experiment
              </ButtonLink>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {experiments.map((experiment) => (
              <ExperimentRow key={experiment.id} projectId={projectId} experiment={experiment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
