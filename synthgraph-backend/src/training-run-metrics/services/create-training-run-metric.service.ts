import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TrainingRunMetric } from '../../database/entities/training-run-metric.entity.js';
import { TRAINING_RUN_REPOSITORY } from '../../training-runs/repositories/training-run.tokens.js';
import type { TrainingRunRepository } from '../../training-runs/repositories/training-run.repository.js';
import { TRAINING_RUN_METRIC_REPOSITORY } from '../repositories/training-run-metric.tokens.js';
import type { TrainingRunMetricRepository } from '../repositories/training-run-metric.repository.js';

@Injectable()
export class CreateTrainingRunMetricService {
  constructor(
    @Inject(TRAINING_RUN_METRIC_REPOSITORY)
    private readonly trainingRunMetricRepository: TrainingRunMetricRepository,

    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,
  ) {}

  async execute(
    trainingRunId: string,
    userId: string,
    step: number,
    metrics: Record<string, unknown>,
  ): Promise<TrainingRunMetric> {
    const trainingRun = await this.trainingRunRepository.findByIdForUser(
      trainingRunId,
      userId,
    );

    if (!trainingRun) {
      throw new NotFoundException('Training run not found');
    }

    const trainingRunMetric = new TrainingRunMetric();

    trainingRunMetric.trainingRunId = trainingRunId;
    trainingRunMetric.step = step;
    trainingRunMetric.metrics = metrics;

    return this.trainingRunMetricRepository.create(trainingRunMetric);
  }
}
