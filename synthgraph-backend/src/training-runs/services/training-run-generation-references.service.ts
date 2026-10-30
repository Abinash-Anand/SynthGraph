import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CROSS_PROJECT_REFERENCE } from '../../datasets/dataset-project-scope.service.js';
import type { TrainingRunGenerationReferenceView } from '../training-run-generation-reference-view.js';
import type { TrainingRunRepository } from '../repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../repositories/training-run.tokens.js';

export type GenerationReference = TrainingRunGenerationReferenceView;

type ReferenceRow = {
  training_run_id: string;
  generation_id: string;
  generation_name: string;
  experiment_id: string;
  created_at: Date;
};

function toReference(row: ReferenceRow): GenerationReference {
  return {
    generationId: row.generation_id,
    generationName: row.generation_name,
    experimentId: row.experiment_id,
    createdAt: row.created_at,
  };
}

/**
 * The recorded link between a training run and the generations it used. A run
 * and a generation can sit in different experiments, but only in the same
 * project. Links are exact and are recorded by the caller: nothing here reads a
 * name or a timestamp, and the API has no way to change or remove one.
 */
@Injectable()
export class TrainingRunGenerationReferencesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,
  ) {}

  async create(
    trainingRunId: string,
    userId: string,
    generationId: string,
  ): Promise<GenerationReference & { trainingRunId: string }> {
    const trainingRun = await this.trainingRunRepository.findByIdForUser(
      trainingRunId,
      userId,
    );
    if (!trainingRun) {
      throw new NotFoundException('Training run not found');
    }

    const generations: Array<{
      id: string;
      name: string;
      experiment_id: string;
      project_id: string;
    }> = await this.dataSource.query(
      `SELECT g.id, g.name, g.experiment_id, e.project_id
         FROM generations g
         JOIN experiments e ON e.id = g.experiment_id
         JOIN projects p ON p.id = e.project_id
        WHERE g.id = $1 AND p.user_id = $2`,
      [generationId, userId],
    );
    const generation = generations[0];
    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    const runProjects: Array<{ project_id: string }> =
      await this.dataSource.query(
        `SELECT project_id FROM experiments WHERE id = $1`,
        [trainingRun.experimentId],
      );
    if (runProjects[0]?.project_id !== generation.project_id) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: CROSS_PROJECT_REFERENCE,
        message:
          'This generation belongs to a different project from the training run. A run can only use generations from its own project.',
        generationId,
      });
    }

    // The primary key settles two identical requests that arrive together:
    // exactly one inserts, the other is a duplicate.
    const inserted: Array<{ created_at: Date }> = await this.dataSource.query(
      `INSERT INTO training_run_generation_refs (training_run_id, generation_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING created_at`,
      [trainingRunId, generationId],
    );
    if (inserted.length === 0) {
      throw new ConflictException(
        'Training run generation reference already exists',
      );
    }

    return {
      trainingRunId,
      generationId,
      generationName: generation.name,
      experimentId: generation.experiment_id,
      createdAt: inserted[0].created_at,
    };
  }

  async list(
    trainingRunId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Array<GenerationReference & { trainingRunId: string }>> {
    const trainingRun = await this.trainingRunRepository.findByIdForUser(
      trainingRunId,
      userId,
    );
    if (!trainingRun) {
      throw new NotFoundException('Training run not found');
    }

    const rows: ReferenceRow[] = await this.dataSource.query(
      `${REFERENCES_SQL}
        ORDER BY r.created_at, r.generation_id
        LIMIT $2 OFFSET $3`,
      [[trainingRunId], limit, offset],
    );
    return rows.map((row) => ({ trainingRunId, ...toReference(row) }));
  }

  /**
   * The references of several runs the caller has already authorised, one query
   * for all of them. A run with none maps to an empty list.
   */
  async forTrainingRuns(
    trainingRunIds: readonly string[],
  ): Promise<Map<string, GenerationReference[]>> {
    const byRun = new Map<string, GenerationReference[]>(
      trainingRunIds.map((id) => [id, []]),
    );
    if (trainingRunIds.length === 0) return byRun;

    const rows: ReferenceRow[] = await this.dataSource.query(
      `${REFERENCES_SQL}
        ORDER BY r.created_at, r.generation_id`,
      [trainingRunIds],
    );
    for (const row of rows) {
      byRun.get(row.training_run_id)?.push(toReference(row));
    }
    return byRun;
  }
}

const REFERENCES_SQL = `
  SELECT r.training_run_id, r.generation_id, g.name AS generation_name,
         g.experiment_id, r.created_at
    FROM training_run_generation_refs r
    JOIN generations g ON g.id = r.generation_id
   WHERE r.training_run_id = ANY($1::uuid[])`;
