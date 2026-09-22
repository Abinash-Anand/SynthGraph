import type {
  GenerationDataReference,
  GenerationGenerator,
  GenerationReproducibility,
  GenerationStatus,
} from "@/features/generations/types/generation";

/**
 * NOT the same shape as `Generation` (features/generations/types) — that
 * type matches the hand-written snake_case response mapper used by
 * `GET /generations/:id`. This endpoint (`POST /generations/compare`)
 * returns the RAW ENTITY instead — fully camelCase (`experimentId`,
 * `startedAt`, `completedAt`, `createdAt`, `updatedAt`), confirmed against
 * the live backend response, not assumed. A third distinct shape for the
 * same underlying data, alongside the reproduction manifest's own shape —
 * kept verbatim per this codebase's established discipline of not silently
 * normalizing backend response-mapper inconsistencies.
 */
export type ComparedGeneration = {
  id: string;
  experimentId: string;
  name: string;
  description: string | null;
  generator: GenerationGenerator;
  parameters: Record<string, unknown>;
  reproducibility: GenerationReproducibility;
  inputs: GenerationDataReference[];
  outputs: GenerationDataReference[];
  status: GenerationStatus;
  startedAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

/** The backend does no diffing — it just returns the full entities. */
export type GenerationComparison = {
  generations: ComparedGeneration[];
};
