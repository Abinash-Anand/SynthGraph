export type GenerationStatus = "pending" | "running" | "completed" | "failed";

export type GenerationDataReference = {
  id: string;
  uri?: string;
  name?: string;
  metadata?: Record<string, unknown>;
  type?: string;
  format?: string;
  size?: number;
};

export type GenerationReproducibility = {
  seed?: number;
  code_version?: string;
  environment?: Record<string, unknown>;
  configuration_hash?: string;
};

export type GenerationGenerator = {
  name: string;
  version?: string;
  type?: string;
};

/**
 * Unlike Project/Experiment (raw entities, camelCase), Generation is built
 * by a hand-written response mapper on the backend
 * (src/generations/responses/generation.response.ts) — snake_case, and
 * notably has no `updated_at` field at all. Kept verbatim, not normalized,
 * so a future backend change to either shape is visible here rather than
 * silently absorbed.
 */
export type Generation = {
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
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
