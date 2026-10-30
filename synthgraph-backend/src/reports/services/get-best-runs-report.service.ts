import { Injectable } from '@nestjs/common';

import {
  aggregateMetricDirections,
  type AggregatedMetricDirection,
} from '../../metric-directions/metric-direction.js';
import { MetricDirectionsService } from '../../metric-directions/metric-directions.service.js';
import { ReportsRepository } from '../repositories/reports.repository.js';

export type BestRunsRecord = {
  metricKey: string;
  maxValue: number;
  maxTrainingRunId: string;
  maxTrainingRunName: string;
  minValue: number;
  minTrainingRunId: string;
  minTrainingRunName: string;
};

export type BestRunsReport = {
  projectId: string | null;
  runCount: number;
  records: BestRunsRecord[];
  /**
   * The declared direction for a metric, only where every experiment in scope
   * that reports it declares the same one; `mixed` (direction null) where they
   * disagree or some have not declared it. A metric with no declaration anywhere
   * is absent. Without a direction there is no "best": the report keeps both
   * extremes and picks neither.
   */
  metricDirections: Record<string, AggregatedMetricDirection>;
};

@Injectable()
export class GetBestRunsReportService {
  // Scoped to completed runs with recorded durations, same universe as the
  // efficiency leaderboard - an in-progress run has no final result yet.
  // Reports both the max AND the min per metric key rather than picking
  // "the best" - whether higher or lower is better for a given metric
  // (mAP vs. loss) is a UI-level judgment call this service deliberately
  // doesn't make, same principle as the efficiency leaderboard's
  // client-side metric picker.
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly metricDirectionsService: MetricDirectionsService,
  ) {}

  async execute(userId: string, projectId?: string): Promise<BestRunsReport> {
    const trainingRuns = await this.reportsRepository.findCompletedTrainingRunsForUser(
      userId,
      projectId,
    );

    if (trainingRuns.length === 0) {
      return {
        projectId: projectId ?? null,
        runCount: 0,
        records: [],
        metricDirections: {},
      };
    }

    const nameByRunId = new Map(trainingRuns.map((run) => [run.id, run.name]));
    const evaluations = await this.reportsRepository.findEvaluationsForTrainingRunIds(
      trainingRuns.map((run) => run.id),
    );

    // Which numeric metrics each experiment in scope reports, to decide where a
    // declared direction applies.
    const experimentByRunId = new Map(
      trainingRuns.map((run) => [run.id, run.experimentId]),
    );
    const keysByExperiment = new Map<string, Set<string>>();
    for (const evaluation of evaluations) {
      const experimentId = experimentByRunId.get(evaluation.trainingRunId);
      if (!experimentId) continue;
      const keys = keysByExperiment.get(experimentId) ?? new Set<string>();
      for (const [metricKey, rawValue] of Object.entries(evaluation.metrics ?? {})) {
        if (typeof rawValue === 'number') keys.add(metricKey);
      }
      keysByExperiment.set(experimentId, keys);
    }
    const declared = await this.metricDirectionsService.forExperiments([
      ...keysByExperiment.keys(),
    ]);
    const metricDirections: Record<string, AggregatedMetricDirection> =
      aggregateMetricDirections(
        [...keysByExperiment].map(([experimentId, metricKeys]) => ({
          experimentId,
          metricKeys,
        })),
        declared,
      );

    type Extremum = { value: number; trainingRunId: string };
    const maxByMetric = new Map<string, Extremum>();
    const minByMetric = new Map<string, Extremum>();

    for (const evaluation of evaluations) {
      for (const [metricKey, rawValue] of Object.entries(evaluation.metrics ?? {})) {
        if (typeof rawValue !== 'number') continue;

        const currentMax = maxByMetric.get(metricKey);
        if (!currentMax || rawValue > currentMax.value) {
          maxByMetric.set(metricKey, {
            value: rawValue,
            trainingRunId: evaluation.trainingRunId,
          });
        }

        const currentMin = minByMetric.get(metricKey);
        if (!currentMin || rawValue < currentMin.value) {
          minByMetric.set(metricKey, {
            value: rawValue,
            trainingRunId: evaluation.trainingRunId,
          });
        }
      }
    }

    const records: BestRunsRecord[] = [];
    for (const [metricKey, max] of maxByMetric) {
      const min = minByMetric.get(metricKey)!;
      records.push({
        metricKey,
        maxValue: max.value,
        maxTrainingRunId: max.trainingRunId,
        maxTrainingRunName: nameByRunId.get(max.trainingRunId) ?? 'Unknown',
        minValue: min.value,
        minTrainingRunId: min.trainingRunId,
        minTrainingRunName: nameByRunId.get(min.trainingRunId) ?? 'Unknown',
      });
    }

    return {
      projectId: projectId ?? null,
      runCount: trainingRuns.length,
      records,
      metricDirections,
    };
  }
}
