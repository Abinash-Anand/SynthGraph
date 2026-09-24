import "server-only";
import { backendFetch } from "@/shared/http/http";
import type { SearchResponse, SearchResultType } from "../types/search";

export function searchAll(apiKey: string, query: string): Promise<SearchResponse> {
  return backendFetch(`/search?q=${encodeURIComponent(query)}`, { token: apiKey });
}

export function getRecentEntities(
  apiKey: string,
  type: Extract<SearchResultType, "generation" | "trainingRun">,
  limit?: number,
): Promise<SearchResponse> {
  const query = new URLSearchParams({ type, ...(limit ? { limit: String(limit) } : {}) });
  return backendFetch(`/search/recent?${query.toString()}`, { token: apiKey });
}
