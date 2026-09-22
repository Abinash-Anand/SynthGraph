import { Injectable, NotFoundException } from '@nestjs/common';

import { TypeOrmTrainingRunRepository } from '../../training-runs/repositories/typeorm-training-run.repository.js';
import { ReportsRepository } from '../repositories/reports.repository.js';

const DEFAULT_WINDOW_SIZE = 5;
// A window's predicted total change smaller than 1% of the metric's own
// average magnitude reads as noise, not a real trend - purely a trend
// classifier, not a value judgment: which direction is "better" for a
// given metric is left to the caller, same principle as the efficiency
// leaderboard's metric picker.
const FLAT_THRESHOLD_RATIO = 0.01;

export type TrainingRunHealthMetric = {
  metricKey: string;
  sampleCount: number;
  trend: 'increasing' | 'decreasing' | 'flat' | 'insufficient_data';
  slope: number | null;
  latestStep: number | null;
  latestValue: number | null;
};

export type TrainingRunHealthReport = {
  trainingRunId: string;
  windowSize: number;
  metrics: TrainingRunHealthMetric[];
};

function computeSlope(points: Array<{ step: number; value: number }>): number {
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.step, 0);
  const sumY = points.reduce((sum, p) => sum + p.value, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let denominator = 0;
  for (const { step, value } of points) {
    numerator += (step - meanX) * (value - meanY);
    denominator += (step - meanX) * (step - meanX);
  }

  if (denominator === 0) return 0;
  return numerator / denominator;
}

@Injectable()
export class GetTrainingRunHealthService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    // Reused directly (mirrors GetParameterCorrelationReportService reusing
    // TypeOrmExperimentRepository) for the same ownership-scoped lookup
    // every training-run route already uses.
    private readonly trainingRunRepository: TypeOrmTrainingRunRepository,
  ) {}

  async execute(
    trainingRunId: string,
    userId: string,
    windowSize: number = DEFAULT_WINDOW_SIZE,
  ): Promise<TrainingRunHealthReport> {
    const trainingRun = await this.trainingRunRepository.findByIdForUser(
      trainingRunId,
      userId,
    );
    if (!trainingRun) {
      throw new NotFoundException(`Training run ${trainingRunId} not found`);
    }

    const recentRows = await this.reportsRepository.findRecentMetricsForTrainingRun(
      trainingRunId,
      windowSize,
    );

    const pointsByKey = new Map<string, Array<{ step: number; value: number }>>();
    for (const row of recentRows) {
      for (const [key, rawValue] of Object.entries(row.metrics ?? {})) {
        if (typeof rawValue !== 'number') continue;
        const points = pointsByKey.get(key) ?? [];
        points.push({ step: row.step, value: rawValue });
        pointsByKey.set(key, points);
      }
    }

    const metrics: TrainingRunHealthMetric[] = [];
    for (const [metricKey, points] of pointsByKey) {
      const latest = points[points.length - 1];

      if (points.length < 2) {
        metrics.push({
          metricKey,
          sampleCount: points.length,
          trend: 'insufficient_data',
          slope: null,
          latestStep: latest?.step ?? null,
          latestValue: latest?.value ?? null,
        });
        continue;
      }

      const slope = computeSlope(points);
      const steps = points.map((p) => p.step);
      const totalChange = slope * (Math.max(...steps) - Math.min(...steps));
      const avgAbsValue =
        points.reduce((sum, p) => sum + Math.abs(p.value), 0) / points.length;
      const relativeChange = totalChange / (avgAbsValue || 1e-9);

      const trend: TrainingRunHealthMetric['trend'] =
        Math.abs(relativeChange) < FLAT_THRESHOLD_RATIO
          ? 'flat'
          : slope > 0
            ? 'increasing'
            : 'decreasing';

      metrics.push({
        metricKey,
        sampleCount: points.length,
        trend,
        slope,
        latestStep: latest.step,
        latestValue: latest.value,
      });
    }

    return { trainingRunId, windowSize, metrics };
  }
}
