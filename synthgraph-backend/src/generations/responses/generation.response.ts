import {
  Generation,
  GenerationDataReference,
  GenerationGenerator,
  GenerationReproducibility,
  GenerationStatus,
} from '../../database/entities/generation.entity.js';

export type GenerationResponse = {
  id: string;
  experiment_id: string;
  name: string;
  description: string | null;
  generator: GenerationGenerator;
  parameters: Record<string, unknown>;
  reproducibility: GenerationReproducibility;
  inputs: GenerationDataReference[];
  outputs: GenerationDataReference[];
  status: GenerationStatus;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  metadata: Record<string, unknown>;
  // Additive only - every field above is untouched (this is the shape the
  // CLI/SDK's Pydantic models and existing frontend types already read).
  // `normalized` is the one consistently-named, complete, camelCase shape
  // available on every Generation-returning response in this API (see also
  // CompareGenerationsService's `normalizedGenerations` and
  // GetReproductionManifestService's `normalized`), so a consumer that
  // wants one reliable shape regardless of which endpoint it hit doesn't
  // need to learn each endpoint's own historical quirks.
  normalized: NormalizedGeneration;
};

export type NormalizedGeneration = {
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
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
};

export function toNormalizedGeneration(
  generation: Generation,
): NormalizedGeneration {
  return {
    id: generation.id,
    experimentId: generation.experimentId,
    name: generation.name,
    description: generation.description,
    generator: generation.generator,
    parameters: generation.parameters,
    reproducibility: generation.reproducibility,
    inputs: generation.inputs,
    outputs: generation.outputs,
    status: generation.status,
    startedAt: generation.startedAt,
    completedAt: generation.completedAt,
    createdAt: generation.createdAt,
    updatedAt: generation.updatedAt,
    metadata: generation.metadata,
  };
}

export function toGenerationResponse(
  generation: Generation,
): GenerationResponse {
  return {
    id: generation.id,
    experiment_id: generation.experimentId,
    name: generation.name,
    description: generation.description,
    generator: generation.generator,
    parameters: generation.parameters,
    reproducibility: generation.reproducibility,
    inputs: generation.inputs,
    outputs: generation.outputs,
    status: generation.status,
    started_at: generation.startedAt,
    completed_at: generation.completedAt,
    created_at: generation.createdAt,
    metadata: generation.metadata,
    normalized: toNormalizedGeneration(generation),
  };
}
