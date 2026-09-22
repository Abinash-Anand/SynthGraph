import "server-only";
import { backendFetch } from "@/shared/http/http";
import type {
  CaptureCompletenessReport,
  EfficiencyLeaderboard,
  ParameterCorrelationReport,
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
