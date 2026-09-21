import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TrainingRun } from '../../database/entities/training-run.entity.js';

import { TypeOrmExperimentRepository } from '../../experiments/repositories/typeorm-experiment.repository.js';

import type { TrainingRunRepository } from '../repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../repositories/training-run.tokens.js';

@Injectable()
export class ListTrainingRunsService {
  constructor(
    private readonly experimentRepository: TypeOrmExperimentRepository,

    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,
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

    if (captureStatus !== undefined) {
      return this.trainingRunRepository.findByCaptureStatus(
        experiment.id,
        captureStatus,
      );
    }

    return this.trainingRunRepository.findAllForExperiment(experiment.id);
  }
}
