import { TrainingRunMetric } from '../../database/entities/training-run-metric.entity.js';

export interface TrainingRunMetricRepository {
  create(trainingRunMetric: TrainingRunMetric): Promise<TrainingRunMetric>;

  createMany(
    trainingRunMetrics: TrainingRunMetric[],
  ): Promise<TrainingRunMetric[]>;

  findAllForTrainingRun(
    trainingRunId: string,
    limit: number,
    offset: number,
  ): Promise<TrainingRunMetric[]>;
}
