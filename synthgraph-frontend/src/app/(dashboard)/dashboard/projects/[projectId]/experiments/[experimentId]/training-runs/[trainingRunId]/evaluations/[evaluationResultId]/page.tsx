import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { getSession, requireSession } from "@/features/auth/server/session";
import { getEvaluationResult } from "@/features/evaluation-results/server/evaluation-results-api";
import { NotFoundError } from "@/shared/http/errors";
import { formatDateTime } from "@/shared/lib/format";

type PageParams = {
  projectId: string;
  experimentId: string;
  trainingRunId: string;
  evaluationResultId: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { evaluationResultId } = await params;
  const session = await getSession();
  if (!session) return {};
  try {
    const evaluation = await getEvaluationResult(session.apiKey, evaluationResultId);
    return { title: evaluation.name ?? "Evaluation" };
  } catch {
    return {};
  }
}

export default async function EvaluationResultDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { projectId, experimentId, trainingRunId, evaluationResultId } = await params;
  const session = await requireSession();

  const evaluation = await getEvaluationResult(session.apiKey, evaluationResultId).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  if (evaluation.trainingRunId !== trainingRunId) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/dashboard/projects/${projectId}/experiments/${experimentId}/training-runs/${trainingRunId}`}
          className="mono-label text-ink-faint transition-colors hover:text-ink"
        >
          ← Training run
        </Link>
        <h1 className="mt-2 text-[22px] font-medium tracking-[-0.01em] text-ink">
          {evaluation.name ?? "Evaluation"}
        </h1>
        <p className="mt-1 font-mono text-[12.5px] text-ink-muted">
          dataset version {evaluation.datasetVersionId}
        </p>
        <p className="mt-2 font-mono text-[11px] text-ink-faint">
          Created {formatDateTime(evaluation.createdAt)}
        </p>
      </div>

      <div>
        <h2 className="mono-label mb-3">Metrics</h2>
        <CodeBlock language="json" code={JSON.stringify(evaluation.metrics, null, 2)} />
      </div>

      {Object.keys(evaluation.metadata).length > 0 ? (
        <div>
          <h2 className="mono-label mb-3">Metadata</h2>
          <CodeBlock language="json" code={JSON.stringify(evaluation.metadata, null, 2)} />
        </div>
      ) : null}
    </div>
  );
}
