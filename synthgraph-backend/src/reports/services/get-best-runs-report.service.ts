import { Injectable } from '@nestjs/common';

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
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async execute(userId: string, projectId?: string): Promise<BestRunsReport> {
    const trainingRuns = await this.reportsRepository.findCompletedTrainingRunsForUser(
      userId,
      projectId,
    );

    if (trainingRuns.length === 0) {
      return { projectId: projectId ?? null, runCount: 0, records: [] };
    }

    const nameByRunId = new Map(trainingRuns.map((run) => [run.id, run.name]));
    const evaluations = await this.reportsRepository.findEvaluationsForTrainingRunIds(
      trainingRuns.map((run) => run.id),
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

    return { projectId: projectId ?? null, runCount: trainingRuns.length, records };
  }
}
