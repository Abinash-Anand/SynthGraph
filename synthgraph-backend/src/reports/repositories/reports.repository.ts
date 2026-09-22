import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { EvaluationResult } from '../../database/entities/evaluation-result.entity.js';
import {
  TrainingRun,
  TrainingRunStatus,
} from '../../database/entities/training-run.entity.js';

export type CaptureStatusCountRow = {
  status: string;
  count: string;
};

export type IntegrationBreakdownRow = {
  integration: string;
  totalCount: string;
  attachedCount: string;
  closedCount: string;
};

// New satellite module (mirrors Comparisons/Reproduction/Documentation's
// existing "reach into other entities directly" pattern) rather than
// modifying TrainingRunRepository/EvaluationResultRepository - keeps every
// new aggregate query contained to this module, zero changes to existing,
// already-tested repository interfaces.
@Injectable()
export class ReportsRepository {
  constructor(
    @InjectRepository(TrainingRun)
    private readonly trainingRunRepository: Repository<TrainingRun>,
    @InjectRepository(EvaluationResult)
    private readonly evaluationResultRepository: Repository<EvaluationResult>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getCaptureStatusCounts(
    userId: string,
    projectId?: string,
  ): Promise<CaptureStatusCountRow[]> {
    // NULL is the deliberate "never reported" sentinel elsewhere in this
    // codebase (see TrainingRun.captureStatus's own comment) - bucketed
    // here as 'unknown' via COALESCE, same meaning as the existing
    // findByCaptureStatus query's NULL branch.
    const statusExpression =
      "COALESCE(trainingRun.captureStatus ->> 'status', 'unknown')";

    const query = this.trainingRunRepository
      .createQueryBuilder('trainingRun')
      .innerJoin('trainingRun.experiment', 'experiment')
      .innerJoin('experiment.project', 'project')
      .select(statusExpression, 'status')
      .addSelect('COUNT(*)', 'count')
      .where('project.userId = :userId', { userId })
      .groupBy(statusExpression);

    if (projectId) {
      query.andWhere('project.id = :projectId', { projectId });
    }

    return query.getRawMany<CaptureStatusCountRow>();
  }

  // TypeORM's QueryBuilder has no first-class support for
  // `CROSS JOIN LATERAL jsonb_each(...)`, and this codebase already
  // treats raw SQL as the right tool when the builder isn't (every
  // migration is hand-written SQL) - so this one query goes straight to
  // the DataSource rather than being forced through QueryBuilder.
  async getIntegrationBreakdown(
    userId: string,
    projectId?: string,
  ): Promise<IntegrationBreakdownRow[]> {
    return this.dataSource.query<IntegrationBreakdownRow[]>(
      `
      SELECT
        kv.key AS integration,
        COUNT(*)::text AS "totalCount",
        COUNT(*) FILTER (WHERE (kv.value ->> 'attached')::boolean = true)::text AS "attachedCount",
        COUNT(*) FILTER (WHERE (kv.value ->> 'closed')::boolean = true)::text AS "closedCount"
      FROM training_runs tr
      INNER JOIN experiments e ON e.id = tr.experiment_id
      INNER JOIN projects p ON p.id = e.project_id
      CROSS JOIN LATERAL jsonb_each(COALESCE(tr.capture_status -> 'integrations', '{}'::jsonb)) AS kv(key, value)
      WHERE p.user_id = $1
        AND ($2::uuid IS NULL OR p.id = $2)
      GROUP BY kv.key
      ORDER BY "totalCount" DESC
      `,
      [userId, projectId ?? null],
    );
  }

  async findCompletedTrainingRunsForUser(
    userId: string,
    projectId?: string,
  ): Promise<TrainingRun[]> {
    const query = this.trainingRunRepository
      .createQueryBuilder('trainingRun')
      .innerJoin('trainingRun.experiment', 'experiment')
      .innerJoin('experiment.project', 'project')
      .where('project.userId = :userId', { userId })
      .andWhere('trainingRun.status = :status', {
        status: TrainingRunStatus.Completed,
      })
      .andWhere('trainingRun.startedAt IS NOT NULL')
      .andWhere('trainingRun.completedAt IS NOT NULL')
      .orderBy('trainingRun.completedAt', 'DESC');

    if (projectId) {
      query.andWhere('project.id = :projectId', { projectId });
    }

    return query.getMany();
  }

  async findTrainingRunsForExperimentOwnedByUser(
    experimentId: string,
    userId: string,
  ): Promise<TrainingRun[]> {
    return this.trainingRunRepository
      .createQueryBuilder('trainingRun')
      .innerJoin('trainingRun.experiment', 'experiment')
      .innerJoin('experiment.project', 'project')
      .where('trainingRun.experimentId = :experimentId', { experimentId })
      .andWhere('project.userId = :userId', { userId })
      .orderBy('trainingRun.createdAt', 'ASC')
      .getMany();
  }

  async findEvaluationsForTrainingRunIds(
    trainingRunIds: string[],
  ): Promise<EvaluationResult[]> {
    if (trainingRunIds.length === 0) return [];

    return this.evaluationResultRepository
      .createQueryBuilder('evaluationResult')
      .where('evaluationResult.trainingRunId IN (:...trainingRunIds)', {
        trainingRunIds,
      })
      .getMany();
  }
}
