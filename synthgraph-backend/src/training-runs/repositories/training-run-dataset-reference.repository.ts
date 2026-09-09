import { TrainingRunDatasetReference } from '../../database/entities/training-run-dataset-reference.entity.js';

export interface TrainingRunDatasetReferenceRepository {
  create(
    reference: TrainingRunDatasetReference,
  ): Promise<TrainingRunDatasetReference>;

  findForTrainingRun(
    trainingRunId: string,
    userId: string,
  ): Promise<TrainingRunDatasetReference[]>;

  exists(
    trainingRunId: string,
    datasetVersionId: string,
    role: string,
  ): Promise<boolean>;
}