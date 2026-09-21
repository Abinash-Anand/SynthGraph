import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import { CreateTrainingRunMetricDto } from './dto/create-training-run-metric.dto.js';
import { CreateTrainingRunMetricService } from './services/create-training-run-metric.service.js';
import { ListTrainingRunMetricsService } from './services/list-training-run-metrics.service.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class TrainingRunMetricsController {
  constructor(
    private readonly createTrainingRunMetricService: CreateTrainingRunMetricService,
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

  @Get('training-runs/:trainingRunId/metrics')
  async list(
    @Param('trainingRunId') trainingRunId: string,
    @Req() request: any,
  ) {
    return this.listTrainingRunMetricsService.execute(
      trainingRunId,
      request.user.id,
    );
  }
}
