import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { DatasetVersionRepository } from '../../datasets/repositories/dataset-version.repository.js';
import { DATASET_VERSION_REPOSITORY } from '../../datasets/repositories/dataset.tokens.js';

import { GenerationDatasetReference } from '../../database/entities/generation-dataset-reference.entity.js';

import type { GenerationDatasetReferenceRepository } from '../repositories/generation-dataset-reference.repository.js';
import { GENERATION_DATASET_REFERENCE_REPOSITORY } from '../repositories/generation-dataset-reference.tokens.js';

@Injectable()
export class CreateGenerationDatasetReferenceService {
  constructor(
    @Inject(GENERATION_DATASET_REFERENCE_REPOSITORY)
    private readonly referenceRepository: GenerationDatasetReferenceRepository,

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
    const datasetVersion =
      await this.datasetVersionRepository.findByIdForUser(
        input.datasetVersionId,
        userId,
      );

    if (!datasetVersion) {
      throw new NotFoundException('Dataset version not found');
    }

    const exists = await this.referenceRepository.exists(
      generationId,
      input.datasetVersionId,
    );

    if (exists) {
      throw new ConflictException(
        'Dataset version is already referenced by this generation',
      );
    }

    const reference = new GenerationDatasetReference();

    reference.generationId = generationId;
    reference.datasetVersionId = input.datasetVersionId;
    reference.role = input.role;

    return this.referenceRepository.create(reference);
  }
}