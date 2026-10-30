import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TrainingRun } from '../../database/entities/training-run.entity.js';

import { TrainingRunGenerationReferencesService } from './training-run-generation-references.service.js';
import type { TrainingRunDatasetReferenceRepository } from '../repositories/training-run-dataset-reference.repository.js';
import { TRAINING_RUN_DATASET_REFERENCE_REPOSITORY } from '../repositories/training-run-dataset-reference.tokens.js';
import type { TrainingRunRepository } from '../repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../repositories/training-run.tokens.js';

@Injectable()
export class GetTrainingRunService {
  constructor(
    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,

    @Inject(TRAINING_RUN_DATASET_REFERENCE_REPOSITORY)
    private readonly trainingRunDatasetReferenceRepository: TrainingRunDatasetReferenceRepository,

    private readonly generationReferences: TrainingRunGenerationReferencesService,
  ) {}

  async execute(
    trainingRunId: string,
    userId: string,
  ): Promise<TrainingRun> {
    const trainingRun =
      await this.trainingRunRepository.findByIdForUser(
        trainingRunId,
        userId,
      );

    if (!trainingRun) {
      throw new NotFoundException('Training run not found');
    }

    const references =
      await this.trainingRunDatasetReferenceRepository.findForTrainingRun(
        trainingRunId,
        userId,
      );
    trainingRun.datasets = references.map(
      (reference) => reference.datasetVersion,
    );

    trainingRun.generationReferences =
      (await this.generationReferences.forTrainingRuns([trainingRunId])).get(
        trainingRunId,
      ) ?? [];

    return trainingRun;
  }
}