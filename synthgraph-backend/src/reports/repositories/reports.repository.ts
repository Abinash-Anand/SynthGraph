import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { DatasetVersion } from '../../database/entities/dataset-version.entity.js';
import { EvaluationResult } from '../../database/entities/evaluation-result.entity.js';
import { TrainingRunMetric } from '../../database/entities/training-run-metric.entity.js';
import {
  TrainingRun,
  TrainingRunStatus,
} from '../../database/entities/training-run.entity.js';

export type NumericFilterField = 'parameters' | 'metrics';
export type NumericFilterOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

const NUMERIC_FILTER_SQL_OPERATORS: Record<NumericFilterOperator, string> = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  eq: '=',
};

export type NumericFilterMatchRow = {
  id: string;
  name: string;
  experimentId: string;
  matchedValue: string;
};

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
    @InjectRepository(TrainingRunMetric)
    private readonly trainingRunMetricRepository: Repository<TrainingRunMetric>,
    @InjectRepository(DatasetVersion)
    private readonly datasetVersionRepository: Repository<DatasetVersion>,
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

  // Last `limit` rows by step - the health-signal window. Ordering here
  // matches findAllForTrainingRun's own ASC-by-step convention so a caller
  // can just take the tail for "most recent N points".
  async findRecentMetricsForTrainingRun(
    trainingRunId: string,
    limit: number,
  ): Promise<TrainingRunMetric[]> {
    const rows = await this.trainingRunMetricRepository
      .createQueryBuilder('metric')
      .where('metric.trainingRunId = :trainingRunId', { trainingRunId })
      .orderBy('metric.step', 'DESC')
      .addOrderBy('metric.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return rows.reverse();
  }

  // `field` and `operator` are both restricted to fixed enums by the DTO
  // one layer up (never raw user strings), and are mapped through
  // NUMERIC_FILTER_SQL_OPERATORS / a column whitelist here rather than
  // interpolated directly - only `key` and `value` are ever bound as real
  // query parameters. The regex guard excludes non-numeric JSONB values
  // before casting, since `(col ->> key)::numeric` throws on a bad cast
  // (parameters/metrics are arbitrary, SDK-populated JSONB).
  async findTrainingRunsByNumericFilter(
    userId: string,
    field: NumericFilterField,
    key: string,
    operator: NumericFilterOperator,
    value: number,
    projectId?: string,
  ): Promise<NumericFilterMatchRow[]> {
    const column = field === 'parameters' ? 'trainingRun.parameters' : 'trainingRun.metrics';
    const sqlOperator = NUMERIC_FILTER_SQL_OPERATORS[operator];

    const query = this.trainingRunRepository
      .createQueryBuilder('trainingRun')
      .innerJoin('trainingRun.experiment', 'experiment')
      .innerJoin('experiment.project', 'project')
      .select('trainingRun.id', 'id')
      .addSelect('trainingRun.name', 'name')
      .addSelect('trainingRun.experimentId', 'experimentId')
      .addSelect(`${column} ->> :filterKey`, 'matchedValue')
      .where('project.userId = :userId', { userId })
      .andWhere(`${column} ->> :filterKey ~ '^-?[0-9]+(\\.[0-9]+)?$'`)
      .andWhere(`(${column} ->> :filterKey)::numeric ${sqlOperator} :filterValue`)
      .setParameters({ filterKey: key, filterValue: value });

    if (projectId) {
      query.andWhere('project.id = :projectId', { projectId });
    }

    return query.getRawMany<NumericFilterMatchRow>();
  }

  // The drift-alert baseline: completed runs in the same experiment that
  // existed before this one, excluding itself. Chronological ordering (not
  // just "completed") matters here - a run created after the one being
  // checked isn't a valid baseline for "did this run drift from what came
  // before it".
  async findPriorCompletedTrainingRunsInExperiment(
    experimentId: string,
    beforeCreatedAt: Date,
    excludeTrainingRunId: string,
  ): Promise<TrainingRun[]> {
    return this.trainingRunRepository
      .createQueryBuilder('trainingRun')
      .where('trainingRun.experimentId = :experimentId', { experimentId })
      .andWhere('trainingRun.id != :excludeTrainingRunId', {
        excludeTrainingRunId,
      })
      .andWhere('trainingRun.status = :status', {
        status: TrainingRunStatus.Completed,
      })
      .andWhere('trainingRun.createdAt < :beforeCreatedAt', {
        beforeCreatedAt,
      })
      .orderBy('trainingRun.createdAt', 'ASC')
      .getMany();
  }

  // Mirrors TypeOrmDatasetVersionRepository.findByIdForUser's own
  // ownership join - re-implemented here directly (rather than importing
  // that factory-provided repository, which isn't wired for plain class
  // injection) since this module already reaches into entities directly
  // everywhere else.
  async findDatasetVersionForUser(
    datasetVersionId: string,
    userId: string,
  ): Promise<DatasetVersion | null> {
    return this.datasetVersionRepository
      .createQueryBuilder('version')
      .innerJoin('version.dataset', 'dataset')
      .where('version.id = :datasetVersionId', { datasetVersionId })
      .andWhere('dataset.userId = :userId', { userId })
      .getOne();
  }

  // generation_dataset_refs/training_run_dataset_refs have no entities
  // registered in this module (their own modules own that) - raw SQL
  // against the two junction tables, same "raw SQL is the right tool
  // outside QueryBuilder's reach" precedent as getIntegrationBreakdown.
  async countGenerationReferencesForDatasetVersion(
    datasetVersionId: string,
  ): Promise<number> {
    const rows = await this.dataSource.query<Array<{ count: string }>>(
      `SELECT COUNT(DISTINCT generation_id)::text AS count
       FROM generation_dataset_refs
       WHERE dataset_version_id = $1`,
      [datasetVersionId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  async findTrainingRunsForDatasetVersion(
    datasetVersionId: string,
  ): Promise<TrainingRun[]> {
    return this.trainingRunRepository
      .createQueryBuilder('trainingRun')
      .innerJoin(
        'training_run_dataset_refs',
        'ref',
        'ref.training_run_id = trainingRun.id',
      )
      .where('ref.dataset_version_id = :datasetVersionId', {
        datasetVersionId,
      })
      .distinct(true)
      .orderBy('trainingRun.createdAt', 'DESC')
      .getMany();
  }
}
