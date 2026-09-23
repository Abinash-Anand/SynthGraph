import "server-only";
import { backendFetch } from "@/shared/http/http";
import type { SearchResponse } from "../types/search";

export function searchAll(apiKey: string, query: string): Promise<SearchResponse> {
  return backendFetch(`/search?q=${encodeURIComponent(query)}`, { token: apiKey });
}
