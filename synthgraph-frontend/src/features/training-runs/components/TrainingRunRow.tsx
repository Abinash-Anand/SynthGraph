import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/shared/lib/format";
import type { TrainingRun } from "../types/training-run";
import { CaptureStatusBadge } from "./CaptureStatusBadge";
import { TrainingRunStatusBadge } from "./TrainingRunStatusBadge";

export function TrainingRunRow({
  projectId,
  experimentId,
  trainingRun,
}: {
  projectId: string;
  experimentId: string;
  trainingRun: TrainingRun;
}) {
  return (
    <Link
      href={`/dashboard/projects/${projectId}/experiments/${experimentId}/training-runs/${trainingRun.id}`}
    >
      <Card interactive className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium text-ink">{trainingRun.name}</p>
          <p className="mt-0.5 truncate font-mono text-[12px] text-ink-faint">
            {trainingRun.trainer.name}
            {trainingRun.trainer.version ? ` @ ${trainingRun.trainer.version}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <CaptureStatusBadge status={trainingRun.captureStatus?.status ?? null} />
          <TrainingRunStatusBadge status={trainingRun.status} />
          <p className="font-mono text-[11px] text-ink-faint">{formatDate(trainingRun.createdAt)}</p>
        </div>
      </Card>
    </Link>
  );
}
