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
};

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
  };
}
