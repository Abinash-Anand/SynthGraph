import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TrainingRunDatasetReference } from '../../database/entities/training-run-dataset-reference.entity.js';

import { DATASET_VERSION_REPOSITORY } from '../../datasets/repositories/dataset.tokens.js';
import type { DatasetVersionRepository } from '../../datasets/repositories/dataset-version.repository.js';

import type { TrainingRunRepository } from '../repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../repositories/training-run.tokens.js';

import type { TrainingRunDatasetReferenceRepository } from '../repositories/training-run-dataset-reference.repository.js';
import { TRAINING_RUN_DATASET_REFERENCE_REPOSITORY } from '../repositories/training-run-dataset-reference.tokens.js';

@Injectable()
export class CreateTrainingRunDatasetReferenceService {
  constructor(
    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,

    @Inject(TRAINING_RUN_DATASET_REFERENCE_REPOSITORY)
    private readonly referenceRepository: TrainingRunDatasetReferenceRepository,

    @Inject(DATASET_VERSION_REPOSITORY)
    private readonly datasetVersionRepository: DatasetVersionRepository,
  ) {}

  async execute(
    trainingRunId: string,
    userId: string,
    input: {
      datasetVersionId: string;
      role: string;
    },
  ): Promise<TrainingRunDatasetReference> {
    const trainingRun =
      await this.trainingRunRepository.findByIdForUser(
        trainingRunId,
        userId,
      );

    if (!trainingRun) {
      throw new NotFoundException('Training run not found');
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
        trainingRunId,
        input.datasetVersionId,
        input.role,
      );

    if (alreadyExists) {
      throw new ConflictException(
        'Training run dataset reference already exists',
      );
    }

    const reference = Object.assign(
      new TrainingRunDatasetReference(),
      {
        trainingRunId,
        datasetVersionId: input.datasetVersionId,
        role: input.role,
      },
    );

    return this.referenceRepository.create(reference);
  }
}