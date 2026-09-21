import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EvaluationResult } from '../../database/entities/evaluation-result.entity.js';
import { TRAINING_RUN_REPOSITORY } from '../../training-runs/repositories/training-run.tokens.js';
import type { TrainingRunRepository } from '../../training-runs/repositories/training-run.repository.js';
import { EVALUATION_RESULT_REPOSITORY } from '../repositories/evaluation-result.tokens.js';
import type { EvaluationResultRepository } from '../repositories/evaluation-result.repository.js';

@Injectable()
export class ListEvaluationResultsService {
  constructor(
    @Inject(EVALUATION_RESULT_REPOSITORY)
    private readonly evaluationResultRepository: EvaluationResultRepository,

    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,
  ) {}

  async execute(
    trainingRunId: string,
    userId: string,
  ): Promise<EvaluationResult[]> {
    const trainingRun = await this.trainingRunRepository.findByIdForUser(
      trainingRunId,
      userId,
    );

    if (!trainingRun) {
      throw new NotFoundException('Training run not found');
    }

    return this.evaluationResultRepository.findAllForTrainingRun(
      trainingRun.id,
    );
  }
}
