import { Badge } from "@/components/ui/Badge";
import type { CaptureStatusValue } from "../types/training-run";

// "complete" deliberately isn't "ok" (green) - that tone is already used by
// TrainingRunStatusBadge's "completed", and the two badges render side by
// side. Capture completeness and run success are different axes; giving
// them different tones avoids a same-color collision at a glance.
const CAPTURE_TONE = {
  complete: "blue",
  partial: "warn",
  unknown: "neutral",
} as const;

/** `status` is `null` when an old SDK never reported capture status at all —
 * distinct from `'unknown'`, which is an explicit report. Render both
 * distinctly rather than collapsing null into "unknown". */
export function CaptureStatusBadge({ status }: { status: CaptureStatusValue | null }) {
  if (status === null) {
    return <Badge tone="neutral">not reported</Badge>;
  }
  return (
    <Badge tone={CAPTURE_TONE[status]} dot>
      {status}
    </Badge>
  );
}
