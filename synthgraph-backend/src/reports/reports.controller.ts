import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import { BestRunsQueryDto } from './dto/best-runs-query.dto.js';
import { CaptureCompletenessQueryDto } from './dto/capture-completeness-query.dto.js';
import { EfficiencyLeaderboardQueryDto } from './dto/efficiency-leaderboard-query.dto.js';
import { ParameterCorrelationQueryDto } from './dto/parameter-correlation-query.dto.js';
import { TrainingRunHealthQueryDto } from './dto/training-run-health-query.dto.js';
import { TrainingRunSearchQueryDto } from './dto/training-run-search-query.dto.js';
import { GetBestRunsReportService } from './services/get-best-runs-report.service.js';
import { GetCaptureCompletenessReportService } from './services/get-capture-completeness-report.service.js';
import { GetEfficiencyLeaderboardService } from './services/get-efficiency-leaderboard.service.js';
import { GetParameterCorrelationReportService } from './services/get-parameter-correlation-report.service.js';
import { GetTrainingRunHealthService } from './services/get-training-run-health.service.js';
import { SearchTrainingRunsService } from './services/search-training-runs.service.js';

@Controller('reports')
@UseGuards(ApiKeyGuard)
export class ReportsController {
  constructor(
    private readonly captureCompletenessReportService: GetCaptureCompletenessReportService,
    private readonly efficiencyLeaderboardService: GetEfficiencyLeaderboardService,
    private readonly parameterCorrelationReportService: GetParameterCorrelationReportService,
    private readonly trainingRunHealthService: GetTrainingRunHealthService,
    private readonly searchTrainingRunsService: SearchTrainingRunsService,
    private readonly bestRunsReportService: GetBestRunsReportService,
  ) {}

  @Get('capture-completeness')
  async captureCompleteness(
    @Query() query: CaptureCompletenessQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.captureCompletenessReportService.execute(
      request.user.id,
      query.projectId,
    );
  }

  @Get('efficiency-leaderboard')
  async efficiencyLeaderboard(
    @Query() query: EfficiencyLeaderboardQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.efficiencyLeaderboardService.execute(
      request.user.id,
      query.projectId,
    );
  }

  @Get('parameter-correlation')
  async parameterCorrelation(
    @Query() query: ParameterCorrelationQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.parameterCorrelationReportService.execute(
      query.experimentId,
      request.user.id,
    );
  }

  @Get('training-run-health')
  async trainingRunHealth(
    @Query() query: TrainingRunHealthQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingRunHealthService.execute(
      query.trainingRunId,
      request.user.id,
      query.windowSize,
    );
  }

  @Get('training-run-search')
  async trainingRunSearch(
    @Query() query: TrainingRunSearchQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.searchTrainingRunsService.execute(
      request.user.id,
      query.field,
      query.key,
      query.op,
      query.value,
      query.projectId,
    );
  }

  @Get('best-runs')
  async bestRuns(
    @Query() query: BestRunsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.bestRunsReportService.execute(request.user.id, query.projectId);
  }
}
