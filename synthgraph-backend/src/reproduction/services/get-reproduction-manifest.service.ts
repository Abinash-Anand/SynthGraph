import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { GenerationRepository } from '../../generations/repositories/generation.repository.js';
import { GENERATION_REPOSITORY } from '../../generations/repositories/generation.tokens.js';
import type { Generation } from '../../database/entities/generation.entity.js';
import { toNormalizedGeneration } from '../../generations/responses/generation.response.js';

import { assessReproducibility } from '../assessment/reproducibility-assessment.js';
import type { ReproductionRepository } from '../repositories/reproduction.repository.js';
import { REPRODUCTION_REPOSITORY } from '../repositories/reproduction.repository.token.js';

export type ClassifiedField = { field: string; value: string };

/**
 * Which rules `classification` was built with. Absent (read it as 1) on
 * manifests from before this field existed.
 *
 * 1 - the code version was known only from `reproducibility.code_version`.
 * 2 - it is also known from the commit the SDK records automatically as
 *     `reproducibility.environment.commit`, so a recorded commit is no longer
 *     listed as a missing code version.
 */
export const CLASSIFICATION_VERSION = 2;

export type ReproductionClassification = {
  known: ClassifiedField[];
  supplied: ClassifiedField[];
  missing: string[];
  external: ClassifiedField[];
};

// Was a frontend-only heuristic (ReproductionTab.tsx's own `classify()`) -
// moved here so it's one authoritative computation instead of a client
// re-guessing at it, and so any other consumer (the CLI's `synthgraph
// manifest`, a future compliance-export feature) gets it for free rather
// than reimplementing the same classification a third time. Additive
// field on an existing response - the CLI/SDK's Pydantic models only read
// the keys they know about, so this doesn't break either.

// The SDK records the git commit automatically as `environment.commit`, and
// only fills the separate `code_version` when the caller passes one. A commit
// is the code version, so it must not be classified as missing. Only the
// presence of a commit matters here: whether the working tree was dirty is a
// different fact (it stays an ordinary environment field) and says nothing
// about whether a version was recorded.
function recordedCommit(
  environment: Record<string, unknown> | undefined,
): string | null {
  const commit = environment?.commit;
  return typeof commit === 'string' && commit.trim() !== '' ? commit : null;
}

function classify(
  generation: Pick<Generation, 'generator' | 'reproducibility'>,
  datasetReferences: Array<{ datasetVersionId: string; role: string }>,
): ReproductionClassification {
  const { generator, reproducibility } = generation;
  const known: ClassifiedField[] = [{ field: 'Generator', value: generator.name }];
  const missing: string[] = [];

  if (generator.version) known.push({ field: 'Generator version', value: generator.version });
  else missing.push('Generator version');

  if (reproducibility.seed !== undefined) {
    known.push({ field: 'Seed', value: String(reproducibility.seed) });
  } else {
    missing.push('Seed');
  }

  const commit = recordedCommit(reproducibility.environment);
  if (reproducibility.code_version) {
    known.push({ field: 'Code version', value: reproducibility.code_version });
  } else if (commit !== null) {
    known.push({ field: 'Code version', value: commit });
  } else {
    missing.push('Code version');
  }

  if (reproducibility.configuration_hash) {
    known.push({ field: 'Configuration hash', value: reproducibility.configuration_hash });
  } else {
    missing.push('Configuration hash');
  }

  const supplied: ClassifiedField[] = [];
  if (reproducibility.environment && Object.keys(reproducibility.environment).length > 0) {
    for (const [key, value] of Object.entries(reproducibility.environment)) {
      supplied.push({ field: key, value: String(value) });
    }
  } else {
    missing.push('Environment');
  }

  const external: ClassifiedField[] = datasetReferences.map((reference) => ({
    field: reference.role,
    value: reference.datasetVersionId,
  }));

  return { known, supplied, missing, external };
}

export type DatasetReferenceSummary = { datasetVersionId: string; role: string };

// Shared with ListReproductionManifestsService so a manifest is the same
// document however it is fetched.
export function buildReproductionManifest(
  generation: Generation,
  mappedReferences: DatasetReferenceSummary[],
) {
  const classification = classify(generation, mappedReferences);

  return {
    schemaVersion: '1.0',

    // Additive: which rules `classification` used (see CLASSIFICATION_VERSION).
    classificationVersion: CLASSIFICATION_VERSION,

    classification,

    // Additive: how completely the generation was recorded - the score, grade,
    // blockers and explanations, with the method that produced them. Clients
    // display this; none of them computes its own.
    assessment: assessReproducibility(classification, generation.reproducibility),

    generation: {
      id: generation.id,

      experimentId: generation.experimentId,

      name: generation.name,

      description: generation.description,

      generator: generation.generator,

      parameters: generation.parameters,

      reproducibility: generation.reproducibility,

      status: generation.status,

      inputs: generation.inputs,

      outputs: generation.outputs,
    },

    // Additive - the `generation` field above is untouched (its own
    // nested shape, camelCase but missing timestamps, is what existing
    // consumers already read). `normalized` is the same complete,
    // consistently-named shape every other Generation-returning response
    // now carries (see generation.response.ts).
    normalized: toNormalizedGeneration(generation),

    datasetReferences: mappedReferences,
  };
}

@Injectable()
export class GetReproductionManifestService {
  constructor(
    @Inject(GENERATION_REPOSITORY)
    private readonly generationRepository: GenerationRepository,

    @Inject(REPRODUCTION_REPOSITORY)
    private readonly reproductionRepository: ReproductionRepository,
  ) {}

  async execute(
    generationId: string,
    userId: string,
  ) {
    const generation =
      await this.generationRepository.findByIdForUser(
        generationId,
        userId,
      );

    if (!generation) {
      throw new NotFoundException(
        'Generation not found',
      );
    }

    const datasetReferences =
      await this.reproductionRepository.findDatasetReferences(
        generationId,
      );

    const mappedReferences = datasetReferences.map((reference) => ({
      datasetVersionId: reference.datasetVersionId,
      role: reference.role,
    }));

    return buildReproductionManifest(generation, mappedReferences);
  }
}