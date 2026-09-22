import { Injectable } from '@nestjs/common';

import { EvaluationResult } from '../../database/entities/evaluation-result.entity.js';
import { ReportsRepository } from '../repositories/reports.repository.js';

export type EfficiencyLeaderboardEntry = {
  trainingRunId: string;
  name: string;
  durationSeconds: number;
  evaluations: Array<{
    id: string;
    name: string | null;
    metrics: Record<string, unknown>;
  }>;
};

@Injectable()
export class GetEfficiencyLeaderboardService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  // Deliberately does not pre-rank or pick "the" metric: which metric
  // matters and which direction is "better" (higher mAP vs. lower loss)
  // is a UI concern, not something the backend should guess. The real
  // value added here is the join - one call instead of the frontend doing
  // N+1 fetches across every run and every evaluation.
  async execute(
    userId: string,
    projectId?: string,
  ): Promise<{ runs: EfficiencyLeaderboardEntry[] }> {
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
          }),
        ),
      };
    });

    return { runs };
  }
}
