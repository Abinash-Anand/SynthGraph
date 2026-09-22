import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession, requireSession } from "@/features/auth/server/session";
import { getExperimentForProject } from "@/features/experiments/server/experiments-api";
import { GenerationRow } from "@/features/generations/components/GenerationRow";
import { listGenerations } from "@/features/generations/server/generations-api";
import { TrainingRunRow } from "@/features/training-runs/components/TrainingRunRow";
import { listTrainingRunsForExperiment } from "@/features/training-runs/server/training-runs-api";
import { NotFoundError } from "@/shared/http/errors";
import { formatDate } from "@/shared/lib/format";
import { EmptyState } from "@/shared/ui/EmptyState";

type PageParams = { projectId: string; experimentId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { projectId, experimentId } = await params;
  const session = await getSession();
  if (!session) return {};
  try {
    const experiment = await getExperimentForProject(session.apiKey, projectId, experimentId);
    return { title: experiment.name };
  } catch {
    return {};
  }
}

export default async function ExperimentDetailPage({ params }: { params: Promise<PageParams> }) {
  const { projectId, experimentId } = await params;
  const session = await requireSession();

  const experiment = await getExperimentForProject(session.apiKey, projectId, experimentId).catch(
    (error) => {
      if (error instanceof NotFoundError) notFound();
      throw error;
    },
  );

  const [generations, trainingRuns] = await Promise.all([
    listGenerations(session.apiKey, experimentId),
    listTrainingRunsForExperiment(session.apiKey, experimentId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="mono-label text-ink-faint transition-colors hover:text-ink"
        >
          ← Project
        </Link>
        <h1 className="mt-2 text-[22px] font-medium tracking-[-0.01em] text-ink">
          {experiment.name}
        </h1>
        {experiment.description ? (
          <p className="mt-1 text-[14px] text-ink-muted">{experiment.description}</p>
        ) : null}
        <p className="mt-2 font-mono text-[11px] text-ink-faint">
          Created {formatDate(experiment.createdAt)}
        </p>
      </div>

      <div>
        <h2 className="mono-label mb-3">Generations</h2>
        {generations.length === 0 ? (
          <EmptyState
            title="No generations yet"
            description="Generations are created from the SynthGraph SDK. Once one exists in this experiment, it shows up here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {generations.map((generation) => (
              <GenerationRow
                key={generation.id}
                projectId={projectId}
                experimentId={experimentId}
                generation={generation}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mono-label mb-3">Training Runs</h2>
        {trainingRuns.length === 0 ? (
          <EmptyState
            title="No training runs yet"
            description="Training runs are created from the SynthGraph SDK. Once one exists in this experiment, it shows up here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {trainingRuns.map((trainingRun) => (
              <TrainingRunRow
                key={trainingRun.id}
                projectId={projectId}
                experimentId={experimentId}
                trainingRun={trainingRun}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
