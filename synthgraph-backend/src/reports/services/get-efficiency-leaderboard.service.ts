import { Injectable } from '@nestjs/common';

import { EvaluationResult } from '../../database/entities/evaluation-result.entity.js';
import {
  aggregateMetricDirections,
  type AggregatedMetricDirection,
} from '../../metric-directions/metric-direction.js';
import { MetricDirectionsService } from '../../metric-directions/metric-directions.service.js';
import {
  analyzeEfficiency,
  type EfficiencyMetricAnalysis,
} from '../efficiency-analysis.js';
import { ReportsRepository } from '../repositories/reports.repository.js';

export type EfficiencyLeaderboardEntry = {
  trainingRunId: string;
  name: string;
  durationSeconds: number;
  evaluations: Array<{
    id: string;
    name: string | null;
    metrics: Record<string, unknown>;
    /** The evaluation set this was scored on. */
    datasetVersionId: string;
    checkpointStep: number | null;
  }>;
};

/** An evaluation set the leaderboard has scores for. */
export type EfficiencyEvaluationSet = {
  datasetVersionId: string;
  datasetId: string;
  datasetName: string;
  version: string;
};

@Injectable()
export class GetEfficiencyLeaderboardService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly metricDirectionsService: MetricDirectionsService,
  ) {}

  // Does not pick "the" metric: which one matters is the researcher's call, so
  // `analysis` ranks every numeric metric. Which direction is "better" is the
  // declared one (ARCH-001); with none declared both are ranked and the client
  // lets the user choose. Scores are ranked only against other scores on the
  // same evaluation set (ARCH-005): see efficiency-analysis.ts.
  async execute(
    userId: string,
    projectId?: string,
  ): Promise<{
    runs: EfficiencyLeaderboardEntry[];
    /** See BestRunsReport.metricDirections: declared where every experiment agrees, mixed otherwise, absent if undeclared. */
    metricDirections: Record<string, AggregatedMetricDirection>;
    /** The evaluation sets the rankings in `analysis` are split by. */
    evaluationSets: EfficiencyEvaluationSet[];
    /** Every numeric metric, ranked per evaluation set. */
    analysis: Record<string, EfficiencyMetricAnalysis>;
  }> {
    const trainingRuns =
      await this.reportsRepository.findCompletedTrainingRunsForUser(
        userId,
        projectId,
      );

    const evaluations =
      await this.reportsRepository.findEvaluationsForTrainingRunIds(
        trainingRuns.map((run) => run.id),
      );

    const evaluationsByRunId = new Map<string, EvaluationResult[]>();
    for (const evaluation of evaluations) {
      const list = evaluationsByRunId.get(evaluation.trainingRunId) ?? [];
      list.push(evaluation);
      evaluationsByRunId.set(evaluation.trainingRunId, list);
    }

    const runs: EfficiencyLeaderboardEntry[] = trainingRuns.map((run) => {
      // Both are guaranteed non-null here - findCompletedTrainingRunsForUser
      // filters on IS NOT NULL for both columns.
      const startedAt = run.startedAt as Date;
      const completedAt = run.completedAt as Date;

      return {
        trainingRunId: run.id,
        name: run.name,
        durationSeconds: Math.round(
          (completedAt.getTime() - startedAt.getTime()) / 1000,
        ),
        evaluations: (evaluationsByRunId.get(run.id) ?? []).map(
          (evaluation) => ({
            id: evaluation.id,
            name: evaluation.name,
            metrics: evaluation.metrics,
            datasetVersionId: evaluation.datasetVersionId,
            checkpointStep: evaluation.checkpointStep,
          }),
        ),
      };
    });

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

    const metricDirections = aggregateMetricDirections(
      [...keysByExperiment].map(([experimentId, metricKeys]) => ({
        experimentId,
        metricKeys,
      })),
      declared,
    );

    const analysis = analyzeEfficiency(runs, metricDirections);
    const setIds = new Set<string>();
    for (const metric of Object.values(analysis)) {
      for (const set of metric.sets) setIds.add(set.datasetVersionId);
    }
    const evaluationSets = (
      await this.reportsRepository.findDatasetVersionLabels([...setIds])
    ).sort(
      (a, b) =>
        a.datasetName.localeCompare(b.datasetName) ||
        a.version.localeCompare(b.version),
    );

    return { runs, metricDirections, evaluationSets, analysis };
  }
}
