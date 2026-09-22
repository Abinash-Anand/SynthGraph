import { Injectable } from '@nestjs/common';

import {
  NumericFilterField,
  NumericFilterOperator,
  ReportsRepository,
} from '../repositories/reports.repository.js';

export type TrainingRunSearchMatch = {
  trainingRunId: string;
  name: string;
  experimentId: string;
  matchedValue: number;
};

@Injectable()
export class SearchTrainingRunsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async execute(
    userId: string,
    field: NumericFilterField,
    key: string,
    operator: NumericFilterOperator,
    value: number,
    projectId?: string,
  ): Promise<{ matches: TrainingRunSearchMatch[] }> {
    const rows = await this.reportsRepository.findTrainingRunsByNumericFilter(
      userId,
      field,
      key,
      operator,
      value,
      projectId,
    );

    return {
      matches: rows.map((row) => ({
        trainingRunId: row.id,
        name: row.name,
        experimentId: row.experimentId,
        matchedValue: Number(row.matchedValue),
      })),
    };
  }
}
