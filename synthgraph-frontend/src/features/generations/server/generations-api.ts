import "server-only";
import { cache } from "react";
import { backendFetch } from "@/shared/http/http";
import type { Generation } from "../types/generation";

export function listGenerations(apiKey: string, experimentId: string): Promise<Generation[]> {
  return backendFetch(`/experiments/${experimentId}/generations`, { token: apiKey });
}

/**
 * There is no project/experiment-scoped "get generation" backend route —
 * only this flat lookup. The generation detail page verifies the fetched
 * `experiment_id` matches the route's [experimentId] param and calls
 * notFound() on mismatch (ownership itself is already enforced server-side
 * by the API key). cache()'d so a page's generateMetadata and its body can
 * share one backend call per request.
 */
export const getGeneration = cache((apiKey: string, generationId: string): Promise<Generation> => {
  return backendFetch(`/generations/${generationId}`, { token: apiKey });
});
