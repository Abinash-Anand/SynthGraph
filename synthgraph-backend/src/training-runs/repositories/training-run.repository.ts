import {
  TrainingRun,
  TrainingRunCaptureStatus,
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

  findByCaptureStatus(
    experimentId: string,
    captureStatus: 'complete' | 'partial' | 'unknown',
  ): Promise<TrainingRun[]>;

  transitionStatus(
    trainingRunId: string,
    currentStatus: TrainingRunStatus,
    nextStatus: TrainingRunStatus,
    startedAt: Date | null,
    completedAt: Date | null,
  ): Promise<boolean>;

  updateCaptureStatus(
    trainingRunId: string,
    captureStatus: TrainingRunCaptureStatus,
  ): Promise<boolean>;
}