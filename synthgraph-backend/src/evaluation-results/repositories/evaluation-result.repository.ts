import { EvaluationResult } from '../../database/entities/evaluation-result.entity.js';

export interface EvaluationResultRepository {
  create(evaluationResult: EvaluationResult): Promise<EvaluationResult>;

  findByIdForUser(
    evaluationResultId: string,
    userId: string,
  ): Promise<EvaluationResult | null>;

  findAllForTrainingRun(
    trainingRunId: string,
  ): Promise<EvaluationResult[]>;
}