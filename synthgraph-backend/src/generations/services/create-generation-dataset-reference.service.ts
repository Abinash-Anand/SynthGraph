import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { GenerationDatasetReference } from '../../database/entities/generation-dataset-reference.entity.js';

import { DATASET_VERSION_REPOSITORY } from '../../datasets/repositories/dataset.tokens.js';
import type { DatasetVersionRepository } from '../../datasets/repositories/dataset-version.repository.js';

import { TypeOrmGenerationRepository } from '../repositories/typeorm-generation.repository.js';

import { GENERATION_DATASET_REFERENCE_REPOSITORY } from '../repositories/generation-dataset-reference.tokens.js';
import type { GenerationDatasetReferenceRepository } from '../repositories/generation-dataset-reference.repository.js';

@Injectable()
export class CreateGenerationDatasetReferenceService {
  constructor(
    @Inject(GENERATION_DATASET_REFERENCE_REPOSITORY)
    private readonly referenceRepository: GenerationDatasetReferenceRepository,

    private readonly generationRepository: TypeOrmGenerationRepository,

    @Inject(DATASET_VERSION_REPOSITORY)
    private readonly datasetVersionRepository: DatasetVersionRepository,
  ) {}

  async execute(
    generationId: string,
    userId: string,
    input: {
      datasetVersionId: string;
      role: string;
    },
  ): Promise<GenerationDatasetReference> {
    const generation =
      await this.generationRepository.findByIdForUser(
        generationId,
        userId,
      );

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    const datasetVersion =
      await this.datasetVersionRepository.findByIdForUser(
        input.datasetVersionId,
        userId,
      );

    if (!datasetVersion) {
      throw new NotFoundException('Dataset version not found');
    }

    const alreadyExists =
      await this.referenceRepository.exists(
        generationId,
        input.datasetVersionId,
        input.role,
      );

    if (alreadyExists) {
      throw new ConflictException(
        'Generation dataset reference already exists',
      );
    }

    const reference = Object.assign(
      new GenerationDatasetReference(),
      {
        generationId,
        datasetVersionId: input.datasetVersionId,
        role: input.role,
      },
    );

    return this.referenceRepository.create(reference);
  }
}