import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  TrainingRun,
  TrainingRunCaptureStatus,
} from '../../database/entities/training-run.entity.js';

import type { TrainingRunRepository } from '../repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../repositories/training-run.tokens.js';

@Injectable()
export class UpdateTrainingRunCaptureStatusService {
  constructor(
    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,
  ) {}

  async execute(
    trainingRunId: string,
    userId: string,
    captureStatus: TrainingRunCaptureStatus,
  ): Promise<TrainingRun> {
    const trainingRun = await this.trainingRunRepository.findByIdForUser(
      trainingRunId,
      userId,
    );

    if (!trainingRun) {
      throw new NotFoundException('Training run not found');
    }

    const updated = await this.trainingRunRepository.updateCaptureStatus(
      trainingRunId,
      captureStatus,
    );

    if (!updated) {
      throw new ConflictException(
        'Training run capture status could not be updated',
      );
    }

    const result = await this.trainingRunRepository.findByIdForUser(
      trainingRunId,
      userId,
    );

    if (!result) {
      throw new NotFoundException('Training run not found');
    }

    return result;
  }
}
