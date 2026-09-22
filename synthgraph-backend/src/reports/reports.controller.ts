import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import { CaptureCompletenessQueryDto } from './dto/capture-completeness-query.dto.js';
import { EfficiencyLeaderboardQueryDto } from './dto/efficiency-leaderboard-query.dto.js';
import { ParameterCorrelationQueryDto } from './dto/parameter-correlation-query.dto.js';
import { GetCaptureCompletenessReportService } from './services/get-capture-completeness-report.service.js';
import { GetEfficiencyLeaderboardService } from './services/get-efficiency-leaderboard.service.js';
import { GetParameterCorrelationReportService } from './services/get-parameter-correlation-report.service.js';

@Controller('reports')
@UseGuards(ApiKeyGuard)
export class ReportsController {
  constructor(
    private readonly captureCompletenessReportService: GetCaptureCompletenessReportService,
    private readonly efficiencyLeaderboardService: GetEfficiencyLeaderboardService,
    private readonly parameterCorrelationReportService: GetParameterCorrelationReportService,
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
}
