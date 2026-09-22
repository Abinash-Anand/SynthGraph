import { Badge } from "@/components/ui/Badge";
import type { TrainingRunStatus } from "../types/training-run";

// Same tone-mapping pattern as GenerationStatusBadge.
const STATUS_TONE = {
  pending: "neutral",
  running: "cyan",
  completed: "ok",
  failed: "bad",
} as const;

export function TrainingRunStatusBadge({ status }: { status: TrainingRunStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {status}
    </Badge>
  );
}
