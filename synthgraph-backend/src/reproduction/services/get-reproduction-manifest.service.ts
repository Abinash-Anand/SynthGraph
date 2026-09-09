import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TypeOrmGenerationRepository } from '../../generations/repositories/typeorm-generation.repository.js';

import type { ReproductionRepository } from '../repositories/reproduction.repository.js';
import { REPRODUCTION_REPOSITORY } from '../repositories/reproduction.repository.token.js';

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

    return {
      schemaVersion: '1.0',

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

      datasetReferences:
        datasetReferences.map(
          (reference) => ({
            datasetVersionId:
              reference.datasetVersionId,

            role:
              reference.role,
          }),
        ),
    };
  }
}