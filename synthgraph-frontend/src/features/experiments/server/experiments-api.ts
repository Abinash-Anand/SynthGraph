import "server-only";
import { cache } from "react";
import { backendFetch } from "@/shared/http/http";
import type { CreateExperimentRequest } from "../schemas/experiment-schemas";
import type { Experiment } from "../types/experiment";

export function createExperiment(
  apiKey: string,
  projectId: string,
  input: CreateExperimentRequest,
): Promise<Experiment> {
  return backendFetch(`/projects/${projectId}/experiments`, {
    method: "POST",
    body: input,
    token: apiKey,
  });
}

export function listExperiments(
  apiKey: string,
  projectId: string,
  search?: string,
): Promise<Experiment[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return backendFetch(`/projects/${projectId}/experiments${query}`, { token: apiKey });
}

/**
 * Project-scoped lookup — the URL already carries projectId, so this is
 * used over the flat `GET /experiments/:id` route. cache()'d so a page's
 * generateMetadata and its body can share one backend call per request.
 */
export const getExperimentForProject = cache(
  (apiKey: string, projectId: string, experimentId: string): Promise<Experiment> => {
    return backendFetch(`/projects/${projectId}/experiments/${experimentId}`, { token: apiKey });
  },
);

/**
 * Flat lookup — used when only an experimentId is in hand (e.g. resolving
 * a Generation's `experiment_id` back to its `projectId` for a link, since
 * Generation itself doesn't carry projectId). cache()'d since the same
 * experiment is often looked up more than once per request (e.g. several
 * compared generations sharing one experiment).
 */
export const getExperiment = cache((apiKey: string, experimentId: string): Promise<Experiment> => {
  return backendFetch(`/experiments/${experimentId}`, { token: apiKey });
});
