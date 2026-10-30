import { Injectable } from '@nestjs/common';

import { ServerTimings } from '../../common/timing/server-timings.js';
import { EvaluationResult } from '../../database/entities/evaluation-result.entity.js';
import { Experiment } from '../../database/entities/experiment.entity.js';
import { TrainingRunMetric } from '../../database/entities/training-run-metric.entity.js';
import { TrainingRun } from '../../database/entities/training-run.entity.js';
import { ListEvaluationResultsService } from '../../evaluation-results/services/list-evaluation-results.service.js';
import { GetExperimentService } from '../../experiments/services/get-experiment.service.js';
import {
  GenerationResponse,
  toGenerationResponse,
} from '../../generations/responses/generation.response.js';
import { ListGenerationsService } from '../../generations/services/list-generations.service.js';
import type { MetricDirection } from '../../metric-directions/metric-direction.js';
import { MetricDirectionsService } from '../../metric-directions/metric-directions.service.js';
import { GetExperimentTrainingRunDriftService } from '../../reports/services/get-experiment-training-run-drift.service.js';
import { GetExperimentTrainingRunHealthService } from '../../reports/services/get-experiment-training-run-health.service.js';
import { GetParameterCorrelationReportService } from '../../reports/services/get-parameter-correlation-report.service.js';
import type { ParameterCorrelationReport } from '../../reports/services/get-parameter-correlation-report.service.js';
import type { TrainingRunDriftReport } from '../../reports/services/get-training-run-drift.service.js';
import type { TrainingRunHealthReport } from '../../reports/services/get-training-run-health.service.js';
import { ListReproductionManifestsService } from '../../reproduction/services/list-reproduction-manifests.service.js';
import { ListTrainingRunMetricsService } from '../../training-run-metrics/services/list-training-run-metrics.service.js';
import { ListTrainingRunsService } from '../../training-runs/services/list-training-runs.service.js';

// What each list route returns when asked with no limit/offset (see
// PaginationQueryDto), so the workspace holds exactly the rows the separate
// requests would have returned.
const PAGE_LIMIT = 100;
const PAGE_OFFSET = 0;

export type WorkspaceTrainingRun = {
  run: TrainingRun;
  metrics: TrainingRunMetric[];
  evaluations: EvaluationResult[];
  health: TrainingRunHealthReport;
  drift: TrainingRunDriftReport;
};

export type WorkspaceGeneration = {
  generation: GenerationResponse;
  manifest: Awaited<
    ReturnType<ListReproductionManifestsService['forGenerations']>
  >[number];
};

export type ExperimentWorkspace = {
  experiment: Experiment;
  /** The directions declared in this experiment; a metric not listed has none (unknown). */
  metricDirections: Record<string, MetricDirection>;
  correlation: ParameterCorrelationReport;
  trainingRuns: WorkspaceTrainingRun[];
  generations: WorkspaceGeneration[];
};

/**
 * Everything the experiment workspace page needs, in one response.
 *
 * Each part is the output of the service behind the route it replaces
 * (experiment, parameter-correlation, training runs with their metrics,
 * evaluations, health and drift, generations with their reproduction
 * manifests), so the pieces are what separate requests would have returned;
 * only the number of HTTP round trips changes. The parts load together, and
 * every one still checks that the experiment belongs to the caller.
 */
@Injectable()
export class GetExperimentWorkspaceService {
  constructor(
    private readonly getExperimentService: GetExperimentService,
    private readonly parameterCorrelationService: GetParameterCorrelationReportService,
    private readonly listTrainingRunsService: ListTrainingRunsService,
    private readonly listTrainingRunMetricsService: ListTrainingRunMetricsService,
    private readonly listEvaluationResultsService: ListEvaluationResultsService,
    private readonly healthService: GetExperimentTrainingRunHealthService,
    private readonly driftService: GetExperimentTrainingRunDriftService,
    private readonly listGenerationsService: ListGenerationsService,
    private readonly manifestsService: ListReproductionManifestsService,
    private readonly metricDirectionsService: MetricDirectionsService,
  ) {}

  /**
   * `timings` (optional) is filled with how long each part took, for a
   * `Server-Timing` header. The parts run at once, so they overlap.
   */
  async execute(
    experimentId: string,
    userId: string,
    timings: ServerTimings = new ServerTimings(),
  ): Promise<ExperimentWorkspace> {
    // Read once and shared: the health verdicts need it, and so does the
    // response. Nothing here is returned unless the experiment is the user's:
    // the other parts reject with a 404 otherwise.
    const metricDirections = timings.measure('metric_directions', () =>
      this.metricDirectionsService.forExperiment(experimentId),
    );

    const [experiment, correlation, trainingRuns, generations, directions] =
      await Promise.all([
        timings.measure('experiment', () =>
          this.getExperimentService.executeForUser(experimentId, userId),
        ),
        timings.measure('correlation', () =>
          this.parameterCorrelationService.execute(experimentId, userId),
        ),
        this.loadTrainingRuns(experimentId, userId, timings, metricDirections),
        this.loadGenerations(experimentId, userId, timings),
        metricDirections,
      ]);

    return {
      experiment,
      metricDirections: directions,
      correlation,
      trainingRuns,
      generations,
    };
  }

  private async loadTrainingRuns(
    experimentId: string,
    userId: string,
    timings: ServerTimings,
    metricDirections: Promise<Record<string, MetricDirection>>,
  ): Promise<WorkspaceTrainingRun[]> {
    const runs = await timings.measure('runs_list', () =>
      this.listTrainingRunsService.execute(
        experimentId,
        userId,
        undefined,
        PAGE_LIMIT,
        PAGE_OFFSET,
      ),
    );

    // Health and drift are computed from the run list just read, so a run
    // created while this loads cannot leave them out of step with it.
    const [health, drift, perRun] = await Promise.all([
      timings.measure('health', async () =>
        this.healthService.forTrainingRuns(
          runs,
          undefined,
          await metricDirections,
        ),
      ),
      timings.measure('drift', () => this.driftService.forTrainingRuns(runs)),
      timings.measure('metrics_evaluations', () =>
        Promise.all(
          runs.map(async (run) => {
            const [metrics, evaluations] = await Promise.all([
              this.listTrainingRunMetricsService.execute(
                run.id,
                userId,
                PAGE_LIMIT,
                PAGE_OFFSET,
              ),
              this.listEvaluationResultsService.execute(
                run.id,
                userId,
                PAGE_LIMIT,
                PAGE_OFFSET,
              ),
            ]);
            return { metrics, evaluations };
          }),
        ),
      ),
    ]);

    return runs.map((run, index) => ({
      run,
      metrics: perRun[index].metrics,
      evaluations: perRun[index].evaluations,
      health: health[index],
      drift: drift[index],
    }));
  }

  private async loadGenerations(
    experimentId: string,
    userId: string,
    timings: ServerTimings,
  ): Promise<WorkspaceGeneration[]> {
    const generations = await timings.measure('generations_list', () =>
      this.listGenerationsService.execute(
        experimentId,
        userId,
        undefined,
        PAGE_LIMIT,
        PAGE_OFFSET,
      ),
    );
    const manifests = await timings.measure('manifests', () =>
      this.manifestsService.forGenerations(generations),
    );

    return generations.map((generation, index) => ({
      generation: toGenerationResponse(generation),
      manifest: manifests[index],
    }));
  }
}
