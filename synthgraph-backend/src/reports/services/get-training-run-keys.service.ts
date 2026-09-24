import { Injectable } from '@nestjs/common';

import {
  NumericFilterField,
  ReportsRepository,
} from '../repositories/reports.repository.js';

@Injectable()
export class GetTrainingRunKeysService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async execute(
    userId: string,
    field: NumericFilterField,
    projectId?: string,
  ): Promise<{ keys: string[] }> {
    const rows = await this.reportsRepository.findDistinctTrainingRunKeys(
      userId,
      field,
      projectId,
    );

    return { keys: rows.map((row) => row.key) };
  }
}
