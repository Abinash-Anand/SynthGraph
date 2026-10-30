import "server-only";
import { listGenerations } from "@/features/generations/server/generations-api";
import { getReproductionManifest, listReproductionManifests } from "@/features/reproduction/server/reproduction-api";
import { NotFoundError } from "@/shared/http/errors";
import { slimGeneration } from "../slim-generation";
import type { EnrichedGeneration } from "../types/experiment-workspace";
import { manifestFailure } from "./workspace-payload";

/**
 * An experiment's generations, each with its reproduction manifest.
 *
 * One batch request covers every manifest. A backend that predates it answers
 * 404 for the route, and then each manifest is fetched on its own (the old
 * behaviour), so the frontend can ship ahead of the backend.
 *
 * Never fails the page over a manifest, but never hides one either: a manifest
 * that could not be loaded is marked, and the Reproduction tab says so.
 */
export async function loadEnrichedGenerations(apiKey: string, experimentId: string): Promise<EnrichedGeneration[]> {
  const [generations, batch] = await Promise.all([
    listGenerations(apiKey, experimentId),
    listReproductionManifests(apiKey, experimentId).then(
      (manifests) => ({ manifests }),
      (error: unknown) => ({ error }),
    ),
  ]);

  if ("manifests" in batch) {
    const byGeneration = new Map(batch.manifests.map((manifest) => [manifest.generation.id, manifest]));
    return generations.map((generation) => {
      const manifest = byGeneration.get(generation.id);
      return manifest
        ? slimGeneration({ generation, manifest })
        : slimGeneration({ generation, manifest: null, manifestError: "failed" });
    });
  }

  if (batch.error instanceof NotFoundError) {
    return Promise.all(
      generations.map(async (generation): Promise<EnrichedGeneration> => {
        try {
          return slimGeneration({ generation, manifest: await getReproductionManifest(apiKey, generation.id) });
        } catch (error) {
          console.error("experiment_workspace.manifest_failed", { generationId: generation.id, error });
          return slimGeneration({ generation, manifest: null, manifestError: manifestFailure(error) });
        }
      }),
    );
  }

  console.error("experiment_workspace.manifests_failed", { experimentId, error: batch.error });
  const manifestError = manifestFailure(batch.error);
  return generations.map((generation) => slimGeneration({ generation, manifest: null, manifestError }));
}
