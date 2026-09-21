import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EvaluationResult } from '../../database/entities/evaluation-result.entity.js';
import { EvaluationResultRepository } from './evaluation-result.repository.js';

@Injectable()
export class TypeOrmEvaluationResultRepository
  implements EvaluationResultRepository
{
  constructor(
    @InjectRepository(EvaluationResult)
    private readonly repository: Repository<EvaluationResult>,
  ) {}

  async create(
    evaluationResult: EvaluationResult,
  ): Promise<EvaluationResult> {
    return this.repository.save(evaluationResult);
  }

  async findByIdForUser(
    evaluationResultId: string,
    userId: string,
  ): Promise<EvaluationResult | null> {
    return this.repository
      .createQueryBuilder('evaluationResult')
      .innerJoin('evaluationResult.trainingRun', 'trainingRun')
      .innerJoin('trainingRun.experiment', 'experiment')
      .innerJoin('experiment.project', 'project')
      .where('evaluationResult.id = :evaluationResultId', {
        evaluationResultId,
      })
      .andWhere('project.userId = :userId', {
        userId,
      })
      .getOne();
  }

  async findAllForTrainingRun(
    trainingRunId: string,
  ): Promise<EvaluationResult[]> {
    return this.repository.find({
      where: {
        trainingRunId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}