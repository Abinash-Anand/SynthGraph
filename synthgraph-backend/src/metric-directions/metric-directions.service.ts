import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { ExperimentMetricDirection } from '../database/entities/experiment-metric-direction.entity.js';
import type { ExperimentRepository } from '../experiments/repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../experiments/repositories/experiment.tokens.js';
import type { MetricDirection } from './metric-direction.js';

export type ExperimentMetricDirections = {
  experimentId: string;
  directions: Record<string, MetricDirection>;
};

export type MetricDirectionConflict = {
  metricKey: string;
  declared: MetricDirection;
  requested: MetricDirection;
};

function toMap(
  rows: ReadonlyArray<Pick<ExperimentMetricDirection, 'metricKey' | 'direction'>>,
): Record<string, MetricDirection> {
  const directions: Record<string, MetricDirection> = {};
  for (const row of rows) directions[row.metricKey] = row.direction;
  return directions;
}

@Injectable()
export class MetricDirectionsService {
  constructor(
    @InjectRepository(ExperimentMetricDirection)
    private readonly repository: Repository<ExperimentMetricDirection>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,
  ) {}

  /** The declared directions of an experiment the caller owns. */
  async list(
    experimentId: string,
    userId: string,
  ): Promise<ExperimentMetricDirections> {
    await this.assertOwned(experimentId, userId);
    return { experimentId, directions: await this.forExperiment(experimentId) };
  }

  /**
   * Declares directions, all or nothing. Declaring a metric again with the same
   * direction changes nothing. Declaring a different one is a conflict and
   * nothing at all is written: there is no last-write-wins, and an existing
   * declaration can be changed only by an explicit correction.
   */
  async declare(
    experimentId: string,
    userId: string,
    requested: Readonly<Record<string, MetricDirection>>,
  ): Promise<ExperimentMetricDirections> {
    await this.assertOwned(experimentId, userId);
    const metricKeys = Object.keys(requested);

    await this.dataSource.transaction(async (manager) => {
      // The primary key (experiment_id, metric_key) decides races: when two
      // requests insert the same new key at once, one waits for the other to
      // commit, then does nothing, and the comparison below sees the winner.
      for (const metricKey of metricKeys) {
        await manager.query(
          `INSERT INTO "experiment_metric_directions" ("experiment_id", "metric_key", "direction")
           VALUES ($1, $2, $3::metric_direction_enum)
           ON CONFLICT ("experiment_id", "metric_key") DO NOTHING`,
          [experimentId, metricKey, requested[metricKey]],
        );
      }

      const stored = await manager.find(ExperimentMetricDirection, {
        where: { experimentId, metricKey: In(metricKeys) },
      });

      const conflicts: MetricDirectionConflict[] = stored
        .filter((row) => row.direction !== requested[row.metricKey])
        .map((row) => ({
          metricKey: row.metricKey,
          declared: row.direction,
          requested: requested[row.metricKey],
        }));

      if (conflicts.length > 0) {
        // Thrown inside the transaction, so it rolls back every insert above.
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'metric_direction_conflict',
          message:
            'A different direction is already declared for ' +
            conflicts.map((conflict) => `"${conflict.metricKey}"`).join(', ') +
            ' in this experiment. Nothing was changed. To change a declared direction, correct it explicitly with a note.',
          conflicts,
        });
      }
    });

    return { experimentId, directions: await this.forExperiment(experimentId) };
  }

  /**
   * An explicit correction of an existing declaration. It needs a note, records
   * when it happened, and only ever touches a metric that was declared before:
   * declaring a new metric is `declare`, not a correction.
   */
  async correct(
    experimentId: string,
    userId: string,
    input: {
      metricKey: string;
      direction: MetricDirection;
      correctionNote: string;
    },
  ): Promise<ExperimentMetricDirections> {
    await this.assertOwned(experimentId, userId);

    const existing = await this.repository.findOne({
      where: { experimentId, metricKey: input.metricKey },
    });
    if (!existing) {
      throw new NotFoundException(
        `No direction is declared for "${input.metricKey}" in this experiment, so there is nothing to correct. Declare it first.`,
      );
    }

    if (existing.direction !== input.direction) {
      existing.direction = input.direction;
      existing.correctedAt = new Date();
      existing.correctionNote = input.correctionNote;
      await this.repository.save(existing);
    }

    return { experimentId, directions: await this.forExperiment(experimentId) };
  }

  /**
   * The declared directions of one experiment. No ownership check: callers use
   * this after they have already established the experiment is the user's.
   */
  async forExperiment(
    experimentId: string,
  ): Promise<Record<string, MetricDirection>> {
    return toMap(await this.repository.find({ where: { experimentId } }));
  }

  /** The same for several experiments at once (reports that span experiments). */
  async forExperiments(
    experimentIds: readonly string[],
  ): Promise<Map<string, Record<string, MetricDirection>>> {
    const byExperiment = new Map<string, Record<string, MetricDirection>>(
      experimentIds.map((experimentId) => [experimentId, {}]),
    );
    if (experimentIds.length === 0) return byExperiment;

    const rows = await this.repository.find({
      where: { experimentId: In([...experimentIds]) },
    });
    for (const row of rows) {
      const directions = byExperiment.get(row.experimentId);
      if (directions) directions[row.metricKey] = row.direction;
    }
    return byExperiment;
  }

  private async assertOwned(experimentId: string, userId: string) {
    const experiment = await this.experimentRepository.findByIdForUser(
      experimentId,
      userId,
    );
    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }
  }
}
