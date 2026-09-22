import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/shared/lib/format";
import type { EvaluationResult } from "../types/evaluation-result";

export function EvaluationResultRow({
  projectId,
  experimentId,
  trainingRunId,
  evaluationResult,
}: {
  projectId: string;
  experimentId: string;
  trainingRunId: string;
  evaluationResult: EvaluationResult;
}) {
  return (
    <Link
      href={`/dashboard/projects/${projectId}/experiments/${experimentId}/training-runs/${trainingRunId}/evaluations/${evaluationResult.id}`}
    >
      <Card interactive className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium text-ink">
            {evaluationResult.name ?? evaluationResult.id}
          </p>
          <p className="mt-0.5 truncate font-mono text-[12px] text-ink-faint">
            dataset version {evaluationResult.datasetVersionId}
          </p>
        </div>
        <p className="shrink-0 font-mono text-[11px] text-ink-faint">
          {formatDate(evaluationResult.createdAt)}
        </p>
      </Card>
    </Link>
  );
}
