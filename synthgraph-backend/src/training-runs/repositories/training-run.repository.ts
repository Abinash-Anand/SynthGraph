import {
  TrainingRun,
  TrainingRunStatus,
} from '../../database/entities/training-run.entity.js';

export interface TrainingRunRepository {
  create(trainingRun: TrainingRun): Promise<TrainingRun>;

  findByIdForUser(
    trainingRunId: string,
    userId: string,
  ): Promise<TrainingRun | null>;

  findAllForExperiment(
    experimentId: string,
  ): Promise<TrainingRun[]>;

  transitionStatus(
    trainingRunId: string,
    currentStatus: TrainingRunStatus,
    nextStatus: TrainingRunStatus,
    startedAt: Date | null,
    completedAt: Date | null,
  ): Promise<boolean>;
}