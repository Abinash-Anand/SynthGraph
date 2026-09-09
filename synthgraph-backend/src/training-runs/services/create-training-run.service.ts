import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  TrainingRun,
  TrainingRunTrainer,
} from '../../database/entities/training-run.entity.js';

import { TypeOrmExperimentRepository } from '../../experiments/repositories/typeorm-experiment.repository.js';

import type { TrainingRunRepository } from '../repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../repositories/training-run.tokens.js';

@Injectable()
export class CreateTrainingRunService {
  constructor(
    private readonly experimentRepository: TypeOrmExperimentRepository,

    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,
  ) {}

  async execute(
    experimentId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      trainer: Record<string, unknown>;
      parameters: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    },
  ): Promise<TrainingRun> {
    const experiment =
      await this.experimentRepository.findByIdForUser(
        experimentId,
        userId,
      );

    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }

    const trainingRun = Object.assign(new TrainingRun(), {
      experimentId,
      name: input.name,
      description: input.description ?? null,
      trainer: input.trainer as TrainingRunTrainer,
      parameters: input.parameters,
      metrics: {},
      metadata: input.metadata ?? {},
    });

    return this.trainingRunRepository.create(trainingRun);
  }
}