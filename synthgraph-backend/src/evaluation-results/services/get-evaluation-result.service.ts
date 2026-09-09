import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EVALUATION_RESULT_REPOSITORY } from '../repositories/evaluation-result.tokens.js';
import type { EvaluationResultRepository } from '../repositories/evaluation-result.repository.js';

@Injectable()
export class GetEvaluationResultService {
  constructor(
    @Inject(EVALUATION_RESULT_REPOSITORY)
    private readonly evaluationResultRepository: EvaluationResultRepository,
  ) {}

  async execute(
    evaluationResultId: string,
    userId: string,
  ) {
    const evaluationResult =
      await this.evaluationResultRepository.findByIdForUser(
        evaluationResultId,
        userId,
      );

    if (!evaluationResult) {
      throw new NotFoundException('Evaluation result not found');
    }

    return evaluationResult;
  }
}