import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { ExperimentRepository } from '../../experiments/repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../../experiments/repositories/experiment.tokens.js';
import type { TrainingRunRepository } from '../../training-runs/repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../../training-runs/repositories/training-run.tokens.js';
import type { TrainingRun } from '../../database/entities/training-run.entity.js';
import { ReportsRepository } from '../repositories/reports.repository.js';
import {
  buildTrainingRunDriftReport,
  type TrainingRunDriftReport,
} from './get-training-run-drift.service.js';

export type ExperimentTrainingRunDriftReport = {
  experimentId: string;
  runs: TrainingRunDriftReport[];
};

/**
 * Drift for every training run of one experiment in a single request: the
 * whole-experiment counterpart of `GET /reports/training-run-drift`, with the
 * same run set and order as `GET /experiments/:id/training-runs`.
 */
@Injectable()
export class GetExperimentTrainingRunDriftService {
  constructor(
    private readonly reportsRepository: ReportsRepository,

    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,

    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,
  ) {}

  async execute(
    experimentId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<ExperimentTrainingRunDriftReport> {
    const experiment = await this.experimentRepository.findByIdForUser(
      experimentId,
      userId,
    );
    if (!experiment) {
      throw new NotFoundException(`Experiment ${experimentId} not found`);
    }

    const trainingRuns = await this.trainingRunRepository.findAllForExperiment(
      experiment.id,
      limit,
      offset,
    );

    const runs = await this.forTrainingRuns(trainingRuns);

    return { experimentId: experiment.id, runs };
  }

  /**
   * Drift for runs the caller has already listed (and already checked
   * ownership of), in the same order. The baseline query is the one the
   * per-run route uses, so a run's baseline is decided in exactly one place.
   */
  forTrainingRuns(
    trainingRuns: readonly TrainingRun[],
  ): Promise<TrainingRunDriftReport[]> {
    return Promise.all(
      trainingRuns.map(async (trainingRun) =>
        buildTrainingRunDriftReport(
          trainingRun,
          await this.reportsRepository.findPriorCompletedTrainingRunsInExperiment(
            trainingRun.experimentId,
            trainingRun.createdAt,
            trainingRun.id,
          ),
        ),
      ),
    );
  }
}
