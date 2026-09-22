import "server-only";
import { cache } from "react";
import { backendFetch } from "@/shared/http/http";
import type { CaptureStatus, TrainingRun, TrainingRunStatus } from "../types/training-run";

export const getTrainingRun = cache((apiKey: string, trainingRunId: string): Promise<TrainingRun> => {
  return backendFetch(`/training-runs/${trainingRunId}`, { token: apiKey });
});

export function listTrainingRunsForExperiment(
  apiKey: string,
  experimentId: string,
  captureStatus?: CaptureStatus["status"],
): Promise<TrainingRun[]> {
  const query = captureStatus ? `?captureStatus=${captureStatus}` : "";
  return backendFetch(`/experiments/${experimentId}/training-runs${query}`, { token: apiKey });
}

/** Backend only accepts forward transitions ('running'|'completed'|'failed') — never 'pending'. */
export function updateTrainingRunStatus(
  apiKey: string,
  trainingRunId: string,
  status: Exclude<TrainingRunStatus, "pending">,
): Promise<TrainingRun> {
  return backendFetch(`/training-runs/${trainingRunId}`, {
    method: "PATCH",
    body: { status },
    token: apiKey,
  });
}

export function updateTrainingRunCaptureStatus(
  apiKey: string,
  trainingRunId: string,
  body: CaptureStatus,
): Promise<TrainingRun> {
  return backendFetch(`/training-runs/${trainingRunId}/capture-status`, {
    method: "PATCH",
    body,
    token: apiKey,
  });
}
