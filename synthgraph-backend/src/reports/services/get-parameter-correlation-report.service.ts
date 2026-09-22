import { Injectable, NotFoundException } from '@nestjs/common';

import { EvaluationResult } from '../../database/entities/evaluation-result.entity.js';
import { TrainingRun } from '../../database/entities/training-run.entity.js';
import { TypeOrmExperimentRepository } from '../../experiments/repositories/typeorm-experiment.repository.js';
import { ReportsRepository } from '../repositories/reports.repository.js';

export type ParameterCorrelationGroup = {
  value: string;
  runCount: number;
  metrics: Record<string, { avg: number; min: number; max: number }>;
};

export type ParameterCorrelation = {
  parameterKey: string;
  groups: ParameterCorrelationGroup[];
};

export type ParameterCorrelationReport = {
  experimentId: string;
  runCount: number;
  correlations: ParameterCorrelation[];
};

@Injectable()
export class GetParameterCorrelationReportService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    // Reaching into the experiments module's own repository directly,
    // mirroring the existing satellite-module pattern (Comparisons,
    // Reproduction do the same against generations/datasets).
    private readonly experimentRepository: TypeOrmExperimentRepository,
  ) {}

  // Grouping/averaging happens in application code, not SQL: parameter
  // and metric keys are unknown ahead of time (arbitrary jsonb), and
  // dynamic SQL grouping is unnecessary risk for what's a small,
  // per-experiment row count (a sweep of runs, not the whole fleet).
  async execute(
    experimentId: string,
    userId: string,
  ): Promise<ParameterCorrelationReport> {
    const experiment = await this.experimentRepository.findByIdForUser(
      experimentId,
      userId,
    );
    if (!experiment) {
      throw new NotFoundException(`Experiment ${experimentId} not found`);
    }

    const trainingRuns =
      await this.reportsRepository.findTrainingRunsForExperimentOwnedByUser(
        experimentId,
        userId,
      );

    if (trainingRuns.length === 0) {
      return { experimentId, runCount: 0, correlations: [] };
    }

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

    // Union of every parameters.* key across all runs in this experiment.
    const parameterKeys = new Set<string>();
    for (const run of trainingRuns) {
      for (const key of Object.keys(run.parameters ?? {})) {
        parameterKeys.add(key);
      }
    }

    const correlations: ParameterCorrelation[] = [];

    for (const parameterKey of parameterKeys) {
      const runsByValue = new Map<string, TrainingRun[]>();
      for (const run of trainingRuns) {
        const rawValue = (run.parameters ?? {})[parameterKey];
        if (rawValue === undefined) continue;
        const value =
          typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue);
        const list = runsByValue.get(value) ?? [];
        list.push(run);
        runsByValue.set(value, list);
      }

      // Only meaningful if this parameter actually varies across the
      // sweep - a constant param across every run has nothing to correlate.
      if (runsByValue.size < 2) continue;

      const groups: ParameterCorrelationGroup[] = [];
      for (const [value, runsInGroup] of runsByValue) {
        const metricSamples = new Map<string, number[]>();
        for (const run of runsInGroup) {
          for (const evaluation of evaluationsByRunId.get(run.id) ?? []) {
            for (const [metricKey, metricValue] of Object.entries(
              evaluation.metrics ?? {},
            )) {
              if (typeof metricValue !== 'number') continue;
              const samples = metricSamples.get(metricKey) ?? [];
              samples.push(metricValue);
              metricSamples.set(metricKey, samples);
            }
          }
        }

        const metrics: ParameterCorrelationGroup['metrics'] = {};
        for (const [metricKey, samples] of metricSamples) {
          metrics[metricKey] = {
            avg: samples.reduce((sum, sample) => sum + sample, 0) / samples.length,
            min: Math.min(...samples),
            max: Math.max(...samples),
          };
        }

        groups.push({ value, runCount: runsInGroup.length, metrics });
      }

      correlations.push({ parameterKey, groups });
    }

    return {
      experimentId,
      runCount: trainingRuns.length,
      correlations,
    };
  }
}
