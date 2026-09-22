import { Injectable, NotFoundException } from '@nestjs/common';

import { ReportsRepository } from '../repositories/reports.repository.js';

export type DatasetImpactMetric = {
  metricKey: string;
  avg: number;
  highestValue: number;
  highestTrainingRunId: string;
  highestTrainingRunName: string;
  lowestValue: number;
  lowestTrainingRunId: string;
  lowestTrainingRunName: string;
};

export type DatasetImpactReport = {
  datasetVersionId: string;
  generationCount: number;
  trainingRuns: Array<{ trainingRunId: string; name: string; status: string }>;
  metrics: DatasetImpactMetric[];
};

@Injectable()
export class GetDatasetImpactReportService {
  // Two independent one-hop relationships to this dataset version, not a
  // true multi-hop "generation -> training run" chain: there's no direct
  // foreign key between Generation and TrainingRun anywhere in this
  // schema, and both junction tables' `role` column is freeform/SDK-
  // populated. Reporting both sides honestly (a count of generations that
  // referenced it, a list of training runs that referenced it) rather
  // than implying a chain the data doesn't actually support.
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async execute(
    datasetVersionId: string,
    userId: string,
  ): Promise<DatasetImpactReport> {
    const datasetVersion = await this.reportsRepository.findDatasetVersionForUser(
      datasetVersionId,
      userId,
    );
    if (!datasetVersion) {
      throw new NotFoundException(
        `Dataset version ${datasetVersionId} not found`,
      );
    }

    const [generationCount, trainingRuns] = await Promise.all([
      this.reportsRepository.countGenerationReferencesForDatasetVersion(
        datasetVersionId,
      ),
      this.reportsRepository.findTrainingRunsForDatasetVersion(datasetVersionId),
    ]);

    if (trainingRuns.length === 0) {
      return { datasetVersionId, generationCount, trainingRuns: [], metrics: [] };
    }

    const nameByRunId = new Map(trainingRuns.map((run) => [run.id, run.name]));
    const evaluations = await this.reportsRepository.findEvaluationsForTrainingRunIds(
      trainingRuns.map((run) => run.id),
    );

    type Extremum = { value: number; trainingRunId: string };
    const sumByMetric = new Map<string, number>();
    const countByMetric = new Map<string, number>();
    const maxByMetric = new Map<string, Extremum>();
    const minByMetric = new Map<string, Extremum>();

    for (const evaluation of evaluations) {
      for (const [metricKey, rawValue] of Object.entries(evaluation.metrics ?? {})) {
        if (typeof rawValue !== 'number') continue;

        sumByMetric.set(metricKey, (sumByMetric.get(metricKey) ?? 0) + rawValue);
        countByMetric.set(metricKey, (countByMetric.get(metricKey) ?? 0) + 1);

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

    const metrics: DatasetImpactMetric[] = [];
    for (const [metricKey, max] of maxByMetric) {
      const min = minByMetric.get(metricKey)!;
      metrics.push({
        metricKey,
        avg: sumByMetric.get(metricKey)! / countByMetric.get(metricKey)!,
        highestValue: max.value,
        highestTrainingRunId: max.trainingRunId,
        highestTrainingRunName: nameByRunId.get(max.trainingRunId) ?? 'Unknown',
        lowestValue: min.value,
        lowestTrainingRunId: min.trainingRunId,
        lowestTrainingRunName: nameByRunId.get(min.trainingRunId) ?? 'Unknown',
      });
    }

    return {
      datasetVersionId,
      generationCount,
      trainingRuns: trainingRuns.map((run) => ({
        trainingRunId: run.id,
        name: run.name,
        status: run.status,
      })),
      metrics,
    };
  }
}
