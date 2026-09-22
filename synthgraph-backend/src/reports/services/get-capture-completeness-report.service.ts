import { Injectable } from '@nestjs/common';

import { ReportsRepository } from '../repositories/reports.repository.js';

export type CaptureCompletenessReport = {
  total: number;
  byStatus: {
    complete: number;
    partial: number;
    unknown: number;
  };
  byIntegration: Record<
    string,
    { total: number; attached: number; closed: number }
  >;
};

@Injectable()
export class GetCaptureCompletenessReportService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async execute(
    userId: string,
    projectId?: string,
  ): Promise<CaptureCompletenessReport> {
    const [statusCounts, integrationCounts] = await Promise.all([
      this.reportsRepository.getCaptureStatusCounts(userId, projectId),
      this.reportsRepository.getIntegrationBreakdown(userId, projectId),
    ]);

    const byStatus = { complete: 0, partial: 0, unknown: 0 };
    let total = 0;

    for (const row of statusCounts) {
      const count = Number(row.count);
      total += count;
      if (
        row.status === 'complete' ||
        row.status === 'partial' ||
        row.status === 'unknown'
      ) {
        byStatus[row.status] = count;
      }
    }

    const byIntegration: CaptureCompletenessReport['byIntegration'] = {};
    for (const row of integrationCounts) {
      byIntegration[row.integration] = {
        total: Number(row.totalCount),
        attached: Number(row.attachedCount),
        closed: Number(row.closedCount),
      };
    }

    return { total, byStatus, byIntegration };
  }
}
