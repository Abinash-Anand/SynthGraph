import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { ExperimentRepository } from '../../experiments/repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../../experiments/repositories/experiment.tokens.js';
import type { TrainingRunRepository } from '../../training-runs/repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../../training-runs/repositories/training-run.tokens.js';
import type { MetricDirection } from '../../metric-directions/metric-direction.js';
import { MetricDirectionsService } from '../../metric-directions/metric-directions.service.js';
import { ReportsRepository } from '../repositories/reports.repository.js';
import {
  buildTrainingRunHealthReport,
  DEFAULT_HEALTH_WINDOW_SIZE,
  type TrainingRunHealthReport,
} from './get-training-run-health.service.js';

export type ExperimentTrainingRunHealthReport = {
  experimentId: string;
  windowSize: number;
  runs: TrainingRunHealthReport[];
};

/**
 * Health for every training run of one experiment in a single request.
 *
 * The workspace shows each run's health, and asking per run cost one request
 * (and one rate-limit token) each. The runs covered, and their order, are the
 * same as `GET /experiments/:id/training-runs` for the same limit/offset, and
 * each entry is exactly what `GET /reports/training-run-health` returns for
 * that run.
 */
@Injectable()
export class GetExperimentTrainingRunHealthService {
  constructor(
    private readonly reportsRepository: ReportsRepository,

    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,

    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,

    private readonly metricDirectionsService: MetricDirectionsService,
  ) {}

  async execute(
    experimentId: string,
    userId: string,
    limit: number,
    offset: number,
    windowSize: number = DEFAULT_HEALTH_WINDOW_SIZE,
  ): Promise<ExperimentTrainingRunHealthReport> {
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

    const directions = await this.metricDirectionsService.forExperiment(
      experiment.id,
    );
    const runs = await this.forTrainingRuns(trainingRuns, windowSize, directions);

    return { experimentId: experiment.id, windowSize, runs };
  }

  /**
   * Health for runs the caller has already listed (and already checked
   * ownership of), in the same order. One in-process query per run, issued
   * together: the saving is the HTTP round trips and rate-limit tokens, not
   * the queries themselves.
   */
  forTrainingRuns(
    trainingRuns: ReadonlyArray<{ id: string }>,
    windowSize: number = DEFAULT_HEALTH_WINDOW_SIZE,
    directions: Readonly<Record<string, MetricDirection>> = {},
  ): Promise<TrainingRunHealthReport[]> {
    return Promise.all(
      trainingRuns.map(async (trainingRun) =>
        buildTrainingRunHealthReport(
          trainingRun.id,
          windowSize,
          await this.reportsRepository.findRecentMetricsForTrainingRun(
            trainingRun.id,
            windowSize,
          ),
          directions,
        ),
      ),
    );
  }
}
