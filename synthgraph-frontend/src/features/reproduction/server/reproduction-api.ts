import "server-only";
import { cache } from "react";
import { backendFetch } from "@/shared/http/http";
import type { ReproductionManifest } from "../types/reproduction-manifest";

export const getReproductionManifest = cache(
  (apiKey: string, generationId: string): Promise<ReproductionManifest> => {
    return backendFetch(`/generations/${generationId}/reproduction-manifest`, { token: apiKey });
  },
);

/**
 * Every generation's manifest for an experiment in one request (same order
 * and pagination as `listGenerations`) - the per-generation route above costs
 * a request, and a rate-limit token, each.
 */
export function listReproductionManifests(apiKey: string, experimentId: string): Promise<ReproductionManifest[]> {
  return backendFetch(`/experiments/${experimentId}/reproduction-manifests`, { token: apiKey });
}
