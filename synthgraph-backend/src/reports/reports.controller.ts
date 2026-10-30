import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import { BestRunsQueryDto } from './dto/best-runs-query.dto.js';
import { CaptureCompletenessQueryDto } from './dto/capture-completeness-query.dto.js';
import { CaptureCompletenessRunsQueryDto } from './dto/capture-completeness-runs-query.dto.js';
import { DatasetImpactQueryDto } from './dto/dataset-impact-query.dto.js';
import { EfficiencyLeaderboardQueryDto } from './dto/efficiency-leaderboard-query.dto.js';
import { ParameterCorrelationQueryDto } from './dto/parameter-correlation-query.dto.js';
import { ExperimentAttentionQueryDto } from './dto/experiment-attention-query.dto.js';
import { ExperimentTrainingRunDriftQueryDto } from './dto/experiment-training-run-drift-query.dto.js';
import { ExperimentTrainingRunHealthQueryDto } from './dto/experiment-training-run-health-query.dto.js';
import { TrainingRunDriftQueryDto } from './dto/training-run-drift-query.dto.js';
import { TrainingRunHealthQueryDto } from './dto/training-run-health-query.dto.js';
import { TrainingRunKeysQueryDto } from './dto/training-run-keys-query.dto.js';
import { TrainingRunSearchQueryDto } from './dto/training-run-search-query.dto.js';
import { GetBestRunsReportService } from './services/get-best-runs-report.service.js';
import { GetCaptureCompletenessReportService } from './services/get-capture-completeness-report.service.js';
import { GetCaptureCompletenessRunsService } from './services/get-capture-completeness-runs.service.js';
import { GetDatasetImpactReportService } from './services/get-dataset-impact-report.service.js';
import { GetEfficiencyLeaderboardService } from './services/get-efficiency-leaderboard.service.js';
import { GetParameterCorrelationReportService } from './services/get-parameter-correlation-report.service.js';
import { GetExperimentAttentionService } from './services/get-experiment-attention.service.js';
import { GetExperimentTrainingRunDriftService } from './services/get-experiment-training-run-drift.service.js';
import { GetExperimentTrainingRunHealthService } from './services/get-experiment-training-run-health.service.js';
import { GetTrainingRunDriftService } from './services/get-training-run-drift.service.js';
import { GetTrainingRunHealthService } from './services/get-training-run-health.service.js';
import { GetTrainingRunKeysService } from './services/get-training-run-keys.service.js';
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
    private readonly trainingRunDriftService: GetTrainingRunDriftService,
    private readonly datasetImpactReportService: GetDatasetImpactReportService,
    private readonly trainingRunKeysService: GetTrainingRunKeysService,
    private readonly experimentTrainingRunHealthService: GetExperimentTrainingRunHealthService,
    private readonly experimentTrainingRunDriftService: GetExperimentTrainingRunDriftService,
    private readonly experimentAttentionService: GetExperimentAttentionService,
    private readonly captureCompletenessRunsService: GetCaptureCompletenessRunsService,
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

  @Get('capture-completeness/runs')
  async captureCompletenessRuns(
    @Query() query: CaptureCompletenessRunsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.captureCompletenessRunsService.execute(
      request.user.id,
      query.status,
      query.projectId,
      query.limit,
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

  // Whole-experiment counterparts of training-run-health / training-run-drift:
  // the same per-run reports for every run in one request (additive - the
  // per-run routes are unchanged).
  @Get('experiment-training-run-health')
  async experimentTrainingRunHealth(
    @Query() query: ExperimentTrainingRunHealthQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.experimentTrainingRunHealthService.execute(
      query.experimentId,
      request.user.id,
      query.limit,
      query.offset,
      query.windowSize,
    );
  }

  @Get('experiment-training-run-drift')
  async experimentTrainingRunDrift(
    @Query() query: ExperimentTrainingRunDriftQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.experimentTrainingRunDriftService.execute(
      query.experimentId,
      request.user.id,
      query.limit,
      query.offset,
    );
  }

  @Get('experiment-attention')
  async experimentAttention(
    @Query() query: ExperimentAttentionQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.experimentAttentionService.execute(
      query.experimentId,
      request.user.id,
      query.limit,
      query.offset,
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

  @Get('training-run-drift')
  async trainingRunDrift(
    @Query() query: TrainingRunDriftQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingRunDriftService.execute(
      query.trainingRunId,
      request.user.id,
    );
  }

  @Get('dataset-impact')
  async datasetImpact(
    @Query() query: DatasetImpactQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.datasetImpactReportService.execute(
      query.datasetVersionId,
      request.user.id,
    );
  }

  @Get('training-run-keys')
  async trainingRunKeys(
    @Query() query: TrainingRunKeysQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.trainingRunKeysService.execute(
      request.user.id,
      query.field,
      query.projectId,
    );
  }
}
