import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TrainingRun } from '../../database/entities/training-run.entity.js';

import type { TrainingRunRepository } from '../repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../repositories/training-run.tokens.js';

@Injectable()
export class GetTrainingRunService {
  constructor(
    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,
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

    return trainingRun;
  }
}