import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DATASET_VERSION_REPOSITORY } from '../../datasets/repositories/dataset.tokens.js';
import type { DatasetVersionRepository } from '../../datasets/repositories/dataset-version.repository.js';
import { EvaluationResult } from '../../database/entities/evaluation-result.entity.js';
import { TRAINING_RUN_REPOSITORY } from '../../training-runs/repositories/training-run.tokens.js';
import type { TrainingRunRepository } from '../../training-runs/repositories/training-run.repository.js';
import { EVALUATION_RESULT_REPOSITORY } from '../repositories/evaluation-result.tokens.js';
import type { EvaluationResultRepository } from '../repositories/evaluation-result.repository.js';
@Injectable()
export class CreateEvaluationResultService {
  constructor(
    @Inject(EVALUATION_RESULT_REPOSITORY)
    private readonly evaluationResultRepository: EvaluationResultRepository,

    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,

    @Inject(DATASET_VERSION_REPOSITORY)
    private readonly datasetVersionRepository: DatasetVersionRepository,
  ) {}

  async execute(
    trainingRunId: string,
    userId: string,
    datasetVersionId: string,
    metrics: Record<string, unknown>,
    metadata: Record<string, unknown>,
  ): Promise<EvaluationResult> {
    const trainingRun =
      await this.trainingRunRepository.findByIdForUser(
        trainingRunId,
        userId,
      );

    if (!trainingRun) {
      throw new NotFoundException('Training run not found');
    }

    const datasetVersion =
      await this.datasetVersionRepository.findByIdForUser(
        datasetVersionId,
        userId,
      );

    if (!datasetVersion) {
      throw new NotFoundException('Dataset version not found');
    }

    const evaluationResult = new EvaluationResult();

    evaluationResult.trainingRunId = trainingRunId;
    evaluationResult.datasetVersionId = datasetVersionId;
    evaluationResult.metrics = metrics;
    evaluationResult.metadata = metadata;

    return this.evaluationResultRepository.create(evaluationResult);
  }
}