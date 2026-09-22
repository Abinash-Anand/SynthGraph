import { Badge } from "@/components/ui/Badge";
import type { CaptureStatusValue } from "../types/training-run";

const CAPTURE_TONE = {
  complete: "ok",
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
