import "server-only";
import { cache } from "react";
import { backendFetch } from "@/shared/http/http";
import type { EvaluationResult } from "../types/evaluation-result";

export function listEvaluationResults(
  apiKey: string,
  trainingRunId: string,
): Promise<EvaluationResult[]> {
  return backendFetch(`/training-runs/${trainingRunId}/evaluations`, { token: apiKey });
}

export const getEvaluationResult = cache(
  (apiKey: string, evaluationResultId: string): Promise<EvaluationResult> => {
    return backendFetch(`/evaluation-results/${evaluationResultId}`, { token: apiKey });
  },
);
