import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { CreateTrainingRunMetricDto } from './dto/create-training-run-metric.dto.js';
import { CreateTrainingRunMetricsBatchDto } from './dto/create-training-run-metrics-batch.dto.js';
import { CreateTrainingRunMetricService } from './services/create-training-run-metric.service.js';
import { CreateTrainingRunMetricsBatchService } from './services/create-training-run-metrics-batch.service.js';
import { ListTrainingRunMetricsService } from './services/list-training-run-metrics.service.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class TrainingRunMetricsController {
  constructor(
    private readonly createTrainingRunMetricService: CreateTrainingRunMetricService,
    private readonly createTrainingRunMetricsBatchService: CreateTrainingRunMetricsBatchService,
    private readonly listTrainingRunMetricsService: ListTrainingRunMetricsService,
  ) {}

  @Post('training-runs/:trainingRunId/metrics')
  async create(
    @Param('trainingRunId') trainingRunId: string,
    @Body() dto: CreateTrainingRunMetricDto,
    @Req() request: any,
  ) {
    return this.createTrainingRunMetricService.execute(
      trainingRunId,
      request.user.id,
      dto.step,
      dto.metrics,
    );
  }

  @Post('training-runs/:trainingRunId/metrics/batch')
  async createBatch(
    @Param('trainingRunId') trainingRunId: string,
    @Body() dto: CreateTrainingRunMetricsBatchDto,
    @Req() request: any,
  ) {
    return this.createTrainingRunMetricsBatchService.execute(
      trainingRunId,
      request.user.id,
      dto.metrics,
    );
  }

  @Get('training-runs/:trainingRunId/metrics')
  async list(
    @Param('trainingRunId') trainingRunId: string,
    @Query() query: PaginationQueryDto,
    @Req() request: any,
  ) {
    return this.listTrainingRunMetricsService.execute(
      trainingRunId,
      request.user.id,
      query.limit,
      query.offset,
    );
  }
}
