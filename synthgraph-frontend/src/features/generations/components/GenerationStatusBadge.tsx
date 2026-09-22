import { Badge } from "@/components/ui/Badge";
import type { GenerationStatus } from "../types/generation";

// Status is a different axis from entity-identity (the --color-node-*
// tokens) — it maps to the existing semantic Badge tones instead, so the
// two signals stay visually distinct.
const STATUS_TONE = {
  pending: "neutral",
  running: "cyan",
  completed: "ok",
  failed: "bad",
} as const;

export function GenerationStatusBadge({ status }: { status: GenerationStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {status}
    </Badge>
  );
}
