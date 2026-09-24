import { Badge } from "@/components/ui/Badge";
import type { TrainingRunStatus } from "../types/training-run";

// Same tone-mapping pattern as GenerationStatusBadge. Exported so other
// views (the Overview cockpit's run-status counts) can render the same
// status with the same color without redefining the mapping.
export const TRAINING_RUN_STATUS_TONE = {
  pending: "neutral",
  running: "cyan",
  completed: "ok",
  failed: "bad",
} as const;

export function TrainingRunStatusBadge({ status }: { status: TrainingRunStatus }) {
  return (
    <Badge tone={TRAINING_RUN_STATUS_TONE[status]} dot>
      {status}
    </Badge>
  );
}
