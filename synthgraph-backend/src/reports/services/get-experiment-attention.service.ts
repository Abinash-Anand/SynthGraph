import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { ExperimentRepository } from '../../experiments/repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../../experiments/repositories/experiment.tokens.js';
import type { TrainingRunRepository } from '../../training-runs/repositories/training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../../training-runs/repositories/training-run.tokens.js';
import {
  buildExperimentAttention,
  type ExperimentAttention,
} from '../attention.js';
import { GetExperimentTrainingRunDriftService } from './get-experiment-training-run-drift.service.js';

export type ExperimentAttentionReport = ExperimentAttention & {
  experimentId: string;
};

/**
 * Which training runs of one experiment need a look, with the same run set and
 * order as `GET /experiments/:id/training-runs`. The rule itself lives in
 * `attention.ts`; the workspace route applies the same function to the runs and
 * drift it has already loaded.
 */
@Injectable()
export class GetExperimentAttentionService {
  constructor(
    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,

    @Inject(TRAINING_RUN_REPOSITORY)
    private readonly trainingRunRepository: TrainingRunRepository,

    private readonly driftService: GetExperimentTrainingRunDriftService,
  ) {}

  async execute(
    experimentId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<ExperimentAttentionReport> {
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
    const drift = await this.driftService.forTrainingRuns(trainingRuns);

    return {
      experimentId: experiment.id,
      ...buildExperimentAttention(
        trainingRuns.map((run, index) => ({
          run,
          driftFieldCount: drift[index].drift.length,
        })),
      ),
    };
  }
}
