import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TrainingRun } from '../../database/entities/training-run.entity.js';

import type { ExperimentRepository } from '../../experiments/repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../../experiments/repositories/experiment.tokens.js';

import { TrainingRunGenerationReferencesService } from './training-run-generation-references.service.js';
import type { TrainingRunDatasetReferenceRepository } from '../repositories/training-run-dataset-reference.repository.js';
import { TRAINING_RUN_DATASET_REFERENCE_REPOSITORY } from '../repositories/training-run-dataset-reference.tokens.js';
import type { TrainingRunRepository } from '../repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../repositories/training-run.tokens.js';

@Injectable()
export class ListTrainingRunsService {
  constructor(
    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,

    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,

    @Inject(TRAINING_RUN_DATASET_REFERENCE_REPOSITORY)
    private readonly trainingRunDatasetReferenceRepository: TrainingRunDatasetReferenceRepository,

    private readonly generationReferences: TrainingRunGenerationReferencesService,
  ) {}

  async execute(
    experimentId: string,
    userId: string,
    captureStatus: 'complete' | 'partial' | 'unknown' | undefined,
    limit: number,
    offset: number,
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
            limit,
            offset,
          )
        : await this.trainingRunRepository.findAllForExperiment(
            experiment.id,
            limit,
            offset,
          );

    const generationReferences = await this.generationReferences.forTrainingRuns(
      trainingRuns.map((trainingRun) => trainingRun.id),
    );

    await Promise.all(
      trainingRuns.map(async (trainingRun) => {
        trainingRun.generationReferences =
          generationReferences.get(trainingRun.id) ?? [];
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
