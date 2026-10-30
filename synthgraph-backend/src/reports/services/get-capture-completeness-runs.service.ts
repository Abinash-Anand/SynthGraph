import { Injectable } from '@nestjs/common';

import { captureIssues, type CaptureIssue } from '../capture-issues.js';
import type { CaptureStatusBucket } from '../dto/capture-completeness-runs-query.dto.js';
import { ReportsRepository } from '../repositories/reports.repository.js';
import { GetCaptureCompletenessReportService } from './get-capture-completeness-report.service.js';

/** What "needs attention" means here: runs whose capture did not finish cleanly. */
const NEEDS_ATTENTION: readonly CaptureStatusBucket[] = ['partial', 'unknown'];

export type CaptureCompletenessRun = {
  trainingRunId: string;
  name: string;
  createdAt: Date;
  /** The status the run reported, or null when it never reported capture. */
  captureStatus: CaptureStatusBucket | null;
  projectId: string;
  projectName: string;
  experimentId: string;
  experimentName: string;
  issues: CaptureIssue[];
};

export type CaptureCompletenessRuns = {
  /** All runs in the scope (the report's total), not only the ones listed. */
  total: number;
  /** True when more runs matched than were listed. */
  truncated: boolean;
  runs: CaptureCompletenessRun[];
};

function reportedStatus(
  status: string | undefined,
): CaptureStatusBucket | null {
  return status === 'complete' || status === 'partial' || status === 'unknown'
    ? status
    : null;
}

/**
 * The runs behind the capture report's counts, with what is wrong with each one's
 * capture. Judged against the same scope as the report (the caller's runs, or one
 * project's), so the majority rule and the counts agree with `capture-completeness`.
 */
@Injectable()
export class GetCaptureCompletenessRunsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly reportService: GetCaptureCompletenessReportService,
  ) {}

  async execute(
    userId: string,
    status: CaptureStatusBucket | undefined,
    projectId: string | undefined,
    limit: number,
  ): Promise<CaptureCompletenessRuns> {
    const buckets = status ? [status] : NEEDS_ATTENTION;

    const [report, rows] = await Promise.all([
      this.reportService.execute(userId, projectId),
      // One more than asked for, to know whether there are more.
      this.reportsRepository.findRunsByCaptureBucket(
        userId,
        buckets,
        projectId,
        limit + 1,
      ),
    ]);

    return {
      total: report.total,
      truncated: rows.length > limit,
      runs: rows.slice(0, limit).map((row) => ({
        trainingRunId: row.id,
        name: row.name,
        createdAt: row.createdAt,
        captureStatus: reportedStatus(row.captureStatus?.status),
        projectId: row.projectId,
        projectName: row.projectName,
        experimentId: row.experimentId,
        experimentName: row.experimentName,
        issues: captureIssues(
          row.captureStatus?.integrations,
          report.byIntegration,
          report.total,
        ),
      })),
    };
  }
}
