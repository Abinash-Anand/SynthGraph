import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TrainingRun } from '../../database/entities/training-run.entity.js';
import type { TrainingRunRepository } from '../../training-runs/repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../../training-runs/repositories/training-run.tokens.js';

export type TrainingRunDifference = {
  field: string;
  values: Record<string, unknown>;
};

@Injectable()
export class CompareTrainingRunsService {
  constructor(
    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,
  ) {}

  async execute(
    trainingRunIds: string[],
    userId: string,
  ): Promise<{
    trainingRuns: TrainingRun[];
    differences: TrainingRunDifference[];
  }> {
    const uniqueTrainingRunIds = [...new Set(trainingRunIds)];

    if (uniqueTrainingRunIds.length < 2) {
      throw new BadRequestException(
        'At least two distinct training runs are required',
      );
    }

    const trainingRuns: TrainingRun[] = [];

    for (const trainingRunId of uniqueTrainingRunIds) {
      const trainingRun = await this.trainingRunRepository.findByIdForUser(
        trainingRunId,
        userId,
      );

      if (!trainingRun) {
        throw new NotFoundException(
          `Training run ${trainingRunId} not found`,
        );
      }

      trainingRuns.push(trainingRun);
    }

    return {
      trainingRuns,
      differences: buildDifferences(trainingRuns),
    };
  }
}

// Mirrors CompareGenerationsService's buildDifferences exactly (deep-equal
// per field via JSON.stringify), extended with metrics.* alongside
// parameters.* - a TrainingRun's recorded outcome numbers are as much a
// point of comparison as its hyperparameters, unlike Generation which has
// no equivalent outcome field.
function buildDifferences(
  trainingRuns: TrainingRun[],
): TrainingRunDifference[] {
  const differences: TrainingRunDifference[] = [];

  const addIfDiffers = (
    field: string,
    getValue: (run: TrainingRun) => unknown,
  ) => {
    const values: Record<string, unknown> = {};
    for (const trainingRun of trainingRuns) {
      values[trainingRun.id] = getValue(trainingRun);
    }
    const serialized = Object.values(values).map((value) =>
      JSON.stringify(value),
    );
    const allEqual = serialized.every((value) => value === serialized[0]);
    if (!allEqual) {
      differences.push({ field, values });
    }
  };

  addIfDiffers('status', (run) => run.status);
  addIfDiffers('trainer', (run) => run.trainer);
  addIfDiffers('startedAt', (run) => run.startedAt);
  addIfDiffers('completedAt', (run) => run.completedAt);

  const parameterKeys = new Set<string>();
  for (const trainingRun of trainingRuns) {
    for (const key of Object.keys(trainingRun.parameters ?? {})) {
      parameterKeys.add(key);
    }
  }
  for (const key of parameterKeys) {
    addIfDiffers(`parameters.${key}`, (run) => (run.parameters ?? {})[key]);
  }

  const metricKeys = new Set<string>();
  for (const trainingRun of trainingRuns) {
    for (const key of Object.keys(trainingRun.metrics ?? {})) {
      metricKeys.add(key);
    }
  }
  for (const key of metricKeys) {
    addIfDiffers(`metrics.${key}`, (run) => (run.metrics ?? {})[key]);
  }

  return differences;
}
