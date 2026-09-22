"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { TrainingRunStatus } from "../types/training-run";

// Only valid forward transitions — the backend's PATCH only accepts
// 'running'|'completed'|'failed' and presumably rejects anything else;
// this never offers a transition the backend would reject.
const NEXT_STATUSES: Record<TrainingRunStatus, Exclude<TrainingRunStatus, "pending">[]> = {
  pending: ["running"],
  running: ["completed", "failed"],
  completed: [],
  failed: [],
};

export function TrainingRunStatusControl({
  trainingRunId,
  status,
}: {
  trainingRunId: string;
  status: TrainingRunStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<TrainingRunStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextStatuses = NEXT_STATUSES[status];
  if (nextStatuses.length === 0) return null;

  const onTransition = async (next: Exclude<TrainingRunStatus, "pending">) => {
    setPending(next);
    setError(null);
    try {
      const response = await fetch(`/api/training-runs/${trainingRunId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setError(body.error ?? "Could not update the status.");
        return;
      }
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-[13px] text-bad">{error}</p> : null}
      <div className="flex gap-2">
        {nextStatuses.map((next) => (
          <Button
            key={next}
            size="sm"
            variant="secondary"
            disabled={pending !== null}
            onClick={() => onTransition(next)}
          >
            {pending === next ? "Updating…" : `Mark ${next}`}
          </Button>
        ))}
      </div>
    </div>
  );
}
