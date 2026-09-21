import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TrainingRun } from '../../database/entities/training-run.entity.js';

import { TypeOrmExperimentRepository } from '../../experiments/repositories/typeorm-experiment.repository.js';

import type { TrainingRunDatasetReferenceRepository } from '../repositories/training-run-dataset-reference.repository.js';
import { TRAINING_RUN_DATASET_REFERENCE_REPOSITORY } from '../repositories/training-run-dataset-reference.tokens.js';
import type { TrainingRunRepository } from '../repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../repositories/training-run.tokens.js';

@Injectable()
export class ListTrainingRunsService {
  constructor(
    private readonly experimentRepository: TypeOrmExperimentRepository,

    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,

    @Inject(TRAINING_RUN_DATASET_REFERENCE_REPOSITORY)
    private readonly trainingRunDatasetReferenceRepository: TrainingRunDatasetReferenceRepository,
  ) {}

  async execute(
    experimentId: string,
    userId: string,
    captureStatus?: 'complete' | 'partial' | 'unknown',
  ): Promise<TrainingRun[]> {
    const experiment = await this.experimentRepository.findByIdForUser(
      experimentId,
      userId,
    );

    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }

    const trainingRuns =
      captureStatus !== undefined
        ? await this.trainingRunRepository.findByCaptureStatus(
            experiment.id,
            captureStatus,
          )
        : await this.trainingRunRepository.findAllForExperiment(
            experiment.id,
          );

    await Promise.all(
      trainingRuns.map(async (trainingRun) => {
        const references =
          await this.trainingRunDatasetReferenceRepository.findForTrainingRun(
            trainingRun.id,
            userId,
          );
        trainingRun.datasets = references.map(
          (reference) => reference.datasetVersion,
        );
      }),
    );

    return trainingRuns;
  }
}
