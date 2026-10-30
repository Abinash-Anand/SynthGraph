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

/**
 * How completely a generation was recorded, as the backend assesses it. The
 * frontend shows this; it does not compute it. `method` states the rules and
 * thresholds that produced it. Absent on responses from a backend that predates
 * assessments.
 */
export type ReproductionAssessment = {
  method: { version: number; completeAt: number; mostlyAt: number; externalWeight: number };
  grade: "complete" | "mostly" | "partial" | "unknown";
  /** 0..1 share of fields recorded, or null when there is nothing to count. */
  score: number | null;
  counts: { known: number; supplied: number; external: number; missing: number };
  /** Things that stand in the way of an exact rebuild whatever the score. */
  blockers: string[];
  /** Short labels for `blockers`, in the same order. */
  blockerTags: string[];
  notes: string[];
};

export type ReproductionManifest = {
  schemaVersion: string;
  /**
   * Which rules `classification` was built with. Absent means version 1; 2 also
   * counts the commit the SDK records under `environment.commit` as the code
   * version. Added by the backend, so older responses lack it.
   */
  classificationVersion?: number;
  classification: ReproductionClassification;
  assessment?: ReproductionAssessment;
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
