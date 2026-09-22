import { Injectable, NotFoundException } from '@nestjs/common';

import { TrainingRun } from '../../database/entities/training-run.entity.js';
import { TypeOrmTrainingRunRepository } from '../../training-runs/repositories/typeorm-training-run.repository.js';
import { ReportsRepository } from '../repositories/reports.repository.js';

export type TrainingRunDriftEntry = {
  field: string;
  currentValue: unknown;
  baselineValue: unknown;
};

export type TrainingRunDriftReport = {
  trainingRunId: string;
  baselineRunCount: number;
  drift: TrainingRunDriftEntry[];
};

// There's no dedicated "environment snapshot" column on TrainingRun (only
// freeform, SDK-populated `metadata`/`trainer` JSONB) - so this compares
// the one genuinely structured field (`trainer`) plus whatever metadata
// keys the baseline runs actually agree on, rather than assuming any
// particular "dependencies"/"environment" key shape that may not exist in
// real data yet.
const TRAINER_FIELDS = ['name', 'version', 'type'] as const;

function serialize(value: unknown): string {
  return JSON.stringify(value ?? null);
}

// Only a field every baseline run agrees on has a meaningful "expected"
// value to drift from - if the baseline itself is inconsistent, there's
// no stable value to alert against.
function findConsensusValue(values: unknown[]): { value: unknown } | null {
  if (values.length === 0) return null;
  const serialized = values.map(serialize);
  const allEqual = serialized.every((v) => v === serialized[0]);
  return allEqual ? { value: values[0] } : null;
}

@Injectable()
export class GetTrainingRunDriftService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly trainingRunRepository: TypeOrmTrainingRunRepository,
  ) {}

  async execute(
    trainingRunId: string,
    userId: string,
  ): Promise<TrainingRunDriftReport> {
    const trainingRun = await this.trainingRunRepository.findByIdForUser(
      trainingRunId,
      userId,
    );
    if (!trainingRun) {
      throw new NotFoundException(`Training run ${trainingRunId} not found`);
    }

    const baseline =
      await this.reportsRepository.findPriorCompletedTrainingRunsInExperiment(
        trainingRun.experimentId,
        trainingRun.createdAt,
        trainingRun.id,
      );

    if (baseline.length === 0) {
      return { trainingRunId, baselineRunCount: 0, drift: [] };
    }

    const drift: TrainingRunDriftEntry[] = [];

    const checkField = (field: string, getValue: (run: TrainingRun) => unknown) => {
      const consensus = findConsensusValue(baseline.map(getValue));
      if (!consensus) return;

      const currentValue = getValue(trainingRun);
      if (serialize(currentValue) !== serialize(consensus.value)) {
        drift.push({ field, currentValue, baselineValue: consensus.value });
      }
    };

    for (const field of TRAINER_FIELDS) {
      checkField(`trainer.${field}`, (run) => run.trainer?.[field]);
    }

    const metadataKeys = new Set<string>();
    for (const run of baseline) {
      for (const key of Object.keys(run.metadata ?? {})) {
        metadataKeys.add(key);
      }
    }
    for (const key of metadataKeys) {
      checkField(`metadata.${key}`, (run) => (run.metadata ?? {})[key]);
    }

    return { trainingRunId, baselineRunCount: baseline.length, drift };
  }
}
