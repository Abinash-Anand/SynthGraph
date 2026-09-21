import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  TrainingRun,
  TrainingRunStatus,
} from '../../database/entities/training-run.entity.js';

import type { TrainingRunRepository } from '../repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../repositories/training-run.tokens.js';

const validTransitions: Readonly<
  Record<TrainingRunStatus, readonly TrainingRunStatus[]>
> = {
  [TrainingRunStatus.Pending]: [TrainingRunStatus.Running],
  [TrainingRunStatus.Running]: [
    TrainingRunStatus.Completed,
    TrainingRunStatus.Failed,
  ],
  [TrainingRunStatus.Completed]: [],
  [TrainingRunStatus.Failed]: [],
};

@Injectable()
export class UpdateTrainingRunStatusService {
  constructor(
    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,
  ) {}

  async execute(
    trainingRunId: string,
    userId: string,
    nextStatus: TrainingRunStatus,
  ): Promise<TrainingRun> {
    const trainingRun = await this.trainingRunRepository.findByIdForUser(
      trainingRunId,
      userId,
    );

    if (!trainingRun) {
      throw new NotFoundException('Training run not found');
    }

    if (!validTransitions[trainingRun.status].includes(nextStatus)) {
      throw new ConflictException(
        `Cannot transition training run from ${trainingRun.status} to ${nextStatus}`,
      );
    }

    const now = new Date();
    const startedAt =
      nextStatus === TrainingRunStatus.Running ? now : trainingRun.startedAt;
    const completedAt =
      nextStatus === TrainingRunStatus.Completed ||
      nextStatus === TrainingRunStatus.Failed
        ? now
        : null;

    const updated = await this.trainingRunRepository.transitionStatus(
      trainingRun.id,
      trainingRun.status,
      nextStatus,
      startedAt,
      completedAt,
    );

    if (!updated) {
      throw new ConflictException(
        'Training run status changed; retry request',
      );
    }

    const result = await this.trainingRunRepository.findByIdForUser(
      trainingRun.id,
      userId,
    );

    if (!result) {
      throw new NotFoundException('Training run not found');
    }

    return result;
  }
}
