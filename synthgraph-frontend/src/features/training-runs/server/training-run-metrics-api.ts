import "server-only";
import { backendFetch } from "@/shared/http/http";
import type { TrainingRunMetric } from "../types/training-run-metric";

export function listTrainingRunMetrics(
  apiKey: string,
  trainingRunId: string,
): Promise<TrainingRunMetric[]> {
  return backendFetch(`/training-runs/${trainingRunId}/metrics`, { token: apiKey });
}
