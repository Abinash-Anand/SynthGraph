import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TypeOrmGenerationRepository } from '../../generations/repositories/typeorm-generation.repository.js';
import type { Generation } from '../../database/entities/generation.entity.js';

import type { ReproductionRepository } from '../repositories/reproduction.repository.js';
import { REPRODUCTION_REPOSITORY } from '../repositories/reproduction.repository.token.js';

export type ClassifiedField = { field: string; value: string };

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

  if (reproducibility.code_version) {
    known.push({ field: 'Code version', value: reproducibility.code_version });
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

@Injectable()
export class GetReproductionManifestService {
  constructor(
    private readonly generationRepository: TypeOrmGenerationRepository,

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

    return {
      schemaVersion: '1.0',

      classification: classify(generation, mappedReferences),

      generation: {
        id: generation.id,

        experimentId:
          generation.experimentId,

        name: generation.name,

        description:
          generation.description,

        generator:
          generation.generator,

        parameters:
          generation.parameters,

        reproducibility:
          generation.reproducibility,

        status:
          generation.status,

        inputs:
          generation.inputs,

        outputs:
          generation.outputs,
      },

      datasetReferences: mappedReferences,
    };
  }
}