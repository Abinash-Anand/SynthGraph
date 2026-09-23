import type {
  GenerationDataReference,
  GenerationGenerator,
  GenerationReproducibility,
  GenerationStatus,
} from "@/features/generations/types/generation";

/**
 * Its own type, NOT a reuse of Generation: this endpoint's response is
 * built by a separate backend mapper whose nested `generation.experimentId`
 * is camelCase — unlike the flat Generation entity's snake_case
 * `experiment_id`. A real shape discrepancy between two backend response
 * mappers, kept verbatim rather than silently normalized (same discipline
 * as the Generation type's own comment about its own shape).
 *
 * Also note: this manifest omits asset references (generation-asset-refs)
 * entirely — only dataset references are included — and omits
 * `metadata`/timestamps. Confirmed backend limitations, not a frontend gap.
 */
export type ClassifiedField = { field: string; value: string };

export type ReproductionClassification = {
  known: ClassifiedField[];
  supplied: ClassifiedField[];
  missing: string[];
  external: ClassifiedField[];
};

export type ReproductionManifest = {
  schemaVersion: string;
  classification: ReproductionClassification;
  generation: {
    id: string;
    experimentId: string;
    name: string;
    description: string | null;
    generator: GenerationGenerator;
    parameters: Record<string, unknown>;
    reproducibility: GenerationReproducibility;
    status: GenerationStatus;
    inputs: GenerationDataReference[];
    outputs: GenerationDataReference[];
  };
  datasetReferences: Array<{ datasetVersionId: string; role: string }>;
};
