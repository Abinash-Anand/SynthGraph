import "server-only";
import { backendFetch } from "@/shared/http/http";
import type {
  BestRunsReport,
  CaptureCompletenessReport,
  DatasetImpactReport,
  EfficiencyLeaderboard,
  ParameterCorrelationReport,
  TrainingRunDriftReport,
  TrainingRunHealthReport,
  TrainingRunSearchField,
  TrainingRunSearchOperator,
  TrainingRunSearchResult,
} from "../types/report";

export function getCaptureCompletenessReport(
  apiKey: string,
  projectId?: string,
): Promise<CaptureCompletenessReport> {
  const query = projectId ? `?projectId=${projectId}` : "";
  return backendFetch(`/reports/capture-completeness${query}`, { token: apiKey });
}

export function getEfficiencyLeaderboard(
  apiKey: string,
  projectId?: string,
): Promise<EfficiencyLeaderboard> {
  const query = projectId ? `?projectId=${projectId}` : "";
  return backendFetch(`/reports/efficiency-leaderboard${query}`, { token: apiKey });
}

export function getParameterCorrelationReport(
  apiKey: string,
  experimentId: string,
): Promise<ParameterCorrelationReport> {
  return backendFetch(`/reports/parameter-correlation?experimentId=${experimentId}`, {
    token: apiKey,
  });
}

export function getTrainingRunHealth(
  apiKey: string,
  trainingRunId: string,
  windowSize?: number,
): Promise<TrainingRunHealthReport> {
  const query = windowSize ? `&windowSize=${windowSize}` : "";
  return backendFetch(`/reports/training-run-health?trainingRunId=${trainingRunId}${query}`, {
    token: apiKey,
  });
}

export function getTrainingRunDrift(
  apiKey: string,
  trainingRunId: string,
): Promise<TrainingRunDriftReport> {
  return backendFetch(`/reports/training-run-drift?trainingRunId=${trainingRunId}`, {
    token: apiKey,
  });
}

export function searchTrainingRuns(
  apiKey: string,
  params: {
    field: TrainingRunSearchField;
    key: string;
    op: TrainingRunSearchOperator;
    value: number;
    projectId?: string;
  },
): Promise<TrainingRunSearchResult> {
  const query = new URLSearchParams({
    field: params.field,
    key: params.key,
    op: params.op,
    value: String(params.value),
    ...(params.projectId ? { projectId: params.projectId } : {}),
  });
  return backendFetch(`/reports/training-run-search?${query.toString()}`, { token: apiKey });
}

export function getBestRuns(apiKey: string, projectId?: string): Promise<BestRunsReport> {
  const query = projectId ? `?projectId=${projectId}` : "";
  return backendFetch(`/reports/best-runs${query}`, { token: apiKey });
}

export function getDatasetImpact(
  apiKey: string,
  datasetVersionId: string,
): Promise<DatasetImpactReport> {
  return backendFetch(`/reports/dataset-impact?datasetVersionId=${datasetVersionId}`, {
    token: apiKey,
  });
}
