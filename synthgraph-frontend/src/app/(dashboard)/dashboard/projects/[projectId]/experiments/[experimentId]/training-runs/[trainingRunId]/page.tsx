import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { getSession, requireSession } from "@/features/auth/server/session";
import type { DatasetVersion } from "@/features/datasets/types/dataset";
import { EvaluationResultRow } from "@/features/evaluation-results/components/EvaluationResultRow";
import { listEvaluationResults } from "@/features/evaluation-results/server/evaluation-results-api";
import { CaptureStatusBadge } from "@/features/training-runs/components/CaptureStatusBadge";
import { CaptureStatusControl } from "@/features/training-runs/components/CaptureStatusControl";
import { MetricsChart } from "@/features/training-runs/components/MetricsChart";
import { MetricsTable } from "@/features/training-runs/components/MetricsTable";
import { TrainingRunStatusBadge } from "@/features/training-runs/components/TrainingRunStatusBadge";
import { TrainingRunStatusControl } from "@/features/training-runs/components/TrainingRunStatusControl";
import { listTrainingRunMetrics } from "@/features/training-runs/server/training-run-metrics-api";
import { getTrainingRun } from "@/features/training-runs/server/training-runs-api";
import { NotFoundError } from "@/shared/http/errors";
import { formatDateTime } from "@/shared/lib/format";
import { EmptyState } from "@/shared/ui/EmptyState";
import { LineageDiagram, type LineageNode } from "@/shared/ui/LineageDiagram";

type PageParams = { projectId: string; experimentId: string; trainingRunId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { trainingRunId } = await params;
  const session = await getSession();
  if (!session) return {};
  try {
    const trainingRun = await getTrainingRun(session.apiKey, trainingRunId);
    return { title: trainingRun.name };
  } catch {
    return {};
  }
}

export default async function TrainingRunDetailPage({ params }: { params: Promise<PageParams> }) {
  const { projectId, experimentId, trainingRunId } = await params;
  const session = await requireSession();

  const trainingRun = await getTrainingRun(session.apiKey, trainingRunId).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  if (trainingRun.experimentId !== experimentId) {
    notFound();
  }

  const [metrics, evaluations] = await Promise.all([
    listTrainingRunMetrics(session.apiKey, trainingRunId),
    listEvaluationResults(session.apiKey, trainingRunId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/dashboard/projects/${projectId}/experiments/${experimentId}`}
          className="mono-label text-ink-faint transition-colors hover:text-ink"
        >
          ← Experiment
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">{trainingRun.name}</h1>
          <TrainingRunStatusBadge status={trainingRun.status} />
          <CaptureStatusBadge status={trainingRun.captureStatus?.status ?? null} />
        </div>
        {trainingRun.description ? (
          <p className="mt-1 text-[14px] text-ink-muted">{trainingRun.description}</p>
        ) : null}
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-ink-faint">
          <div className="flex gap-1.5">
            <dt>Created</dt>
            <dd>{formatDateTime(trainingRun.createdAt)}</dd>
          </div>
          {trainingRun.startedAt ? (
            <div className="flex gap-1.5">
              <dt>Started</dt>
              <dd>{formatDateTime(trainingRun.startedAt)}</dd>
            </div>
          ) : null}
          {trainingRun.completedAt ? (
            <div className="flex gap-1.5">
              <dt>Completed</dt>
              <dd>{formatDateTime(trainingRun.completedAt)}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="flex flex-wrap gap-3">
        <TrainingRunStatusControl trainingRunId={trainingRunId} status={trainingRun.status} />
        <CaptureStatusControl trainingRunId={trainingRunId} current={trainingRun.captureStatus} />
      </div>

      <Section title="Lineage">
        <LineageDiagram
          columns={[
            {
              title: `Datasets used (${trainingRun.datasets?.length ?? 0})`,
              emptyLabel: "None",
              nodes: (trainingRun.datasets ?? []).map(toDatasetLineageNode),
            },
            {
              title: "This training run",
              emptyLabel: "—",
              nodes: [
                {
                  key: trainingRun.id,
                  label: trainingRun.name,
                  sublabel: trainingRun.trainer.name,
                  colorVar: "--color-node-training",
                },
              ],
            },
            {
              title: `Evaluations (${evaluations.length})`,
              emptyLabel: "None",
              nodes: evaluations.map((evaluation) => ({
                key: evaluation.id,
                label: evaluation.name ?? evaluation.id,
                colorVar: "--color-node-evaluation",
                href: `/dashboard/projects/${projectId}/experiments/${experimentId}/training-runs/${trainingRunId}/evaluations/${evaluation.id}`,
              })),
            },
          ]}
        />
      </Section>

      <Section title="Trainer">
        <CodeBlock language="json" code={JSON.stringify(trainingRun.trainer, null, 2)} />
      </Section>

      <Section title="Parameters">
        <CodeBlock language="json" code={JSON.stringify(trainingRun.parameters, null, 2)} />
      </Section>

      {Object.keys(trainingRun.metrics).length > 0 ? (
        <Section title="Summary metrics">
          <CodeBlock language="json" code={JSON.stringify(trainingRun.metrics, null, 2)} />
        </Section>
      ) : null}

      <Section title="Metrics over steps">
        {metrics.length === 0 ? (
          <EmptyState title="No step metrics recorded" />
        ) : (
          <div className="flex flex-col gap-4">
            <MetricsChart metrics={metrics} />
            <MetricsTable metrics={metrics} />
          </div>
        )}
      </Section>

      {trainingRun.datasets && trainingRun.datasets.length > 0 ? (
        <Section title={`Datasets (${trainingRun.datasets.length})`}>
          <ul className="flex flex-col gap-2">
            {trainingRun.datasets.map((version) => (
              <li key={version.id}>
                <Link href={`/dashboard/datasets/${version.datasetId}/versions/${version.id}`}>
                  <div className="rounded-md border border-line bg-surface/40 p-3 transition-colors duration-200 hover:bg-surface-2/60">
                    <p className="text-[13.5px] text-ink">{version.version}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">{version.uri}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Evaluations">
        {evaluations.length === 0 ? (
          <EmptyState
            title="No evaluations yet"
            description="Evaluation results are created from the SynthGraph SDK. Once one exists for this run, it shows up here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {evaluations.map((evaluation) => (
              <EvaluationResultRow
                key={evaluation.id}
                projectId={projectId}
                experimentId={experimentId}
                trainingRunId={trainingRunId}
                evaluationResult={evaluation}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function toDatasetLineageNode(version: DatasetVersion): LineageNode {
  return {
    key: version.id,
    label: version.version,
    sublabel: version.uri,
    colorVar: "--color-node-dataset",
    href: `/dashboard/datasets/${version.datasetId}/versions/${version.id}`,
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mono-label mb-3">{title}</h2>
      {children}
    </div>
  );
}
