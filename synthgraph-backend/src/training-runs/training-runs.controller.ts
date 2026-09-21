import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';
import { TrainingRunStatus } from '../database/entities/training-run.entity.js';

import { CreateTrainingRunDto } from './dto/create-training-run.dto.js';
import { CreateTrainingRunDatasetReferenceDto } from './dto/create-training-run-dataset-reference.dto.js';
import { ListTrainingRunsQueryDto } from './dto/list-training-runs-query.dto.js';
import { UpdateTrainingRunCaptureStatusDto } from './dto/update-training-run-capture-status.dto.js';
import { UpdateTrainingRunStatusDto } from './dto/update-training-run-status.dto.js';

import { CreateTrainingRunService } from './services/create-training-run.service.js';
import { GetTrainingRunService } from './services/get-training-run.service.js';
import { ListTrainingRunsService } from './services/list-training-runs.service.js';
import { UpdateTrainingRunCaptureStatusService } from './services/update-training-run-capture-status.service.js';
import { UpdateTrainingRunStatusService } from './services/update-training-run-status.service.js';
import { CreateTrainingRunDatasetReferenceService } from './services/create-training-run-dataset-reference.service.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class TrainingRunsController {
  constructor(
    private readonly createTrainingRunService: CreateTrainingRunService,
    private readonly getTrainingRunService: GetTrainingRunService,
    private readonly listTrainingRunsService: ListTrainingRunsService,
    private readonly updateTrainingRunStatusService: UpdateTrainingRunStatusService,
    private readonly updateTrainingRunCaptureStatusService: UpdateTrainingRunCaptureStatusService,
    private readonly createTrainingRunDatasetReferenceService: CreateTrainingRunDatasetReferenceService,
  ) {}

  @Post('experiments/:experimentId/training-runs')
  async createTrainingRun(
    @Param('experimentId', new ParseUUIDPipe({ version: '4' }))
    experimentId: string,
    @Body() body: CreateTrainingRunDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.createTrainingRunService.execute(
      experimentId,
      request.user.id,
      {
        name: body.name,
        description: body.description,
        trainer: body.trainer,
        parameters: body.parameters,
        metadata: body.metadata,
      },
    );
  }

  @Get('experiments/:experimentId/training-runs')
  async listTrainingRuns(
    @Param('experimentId', new ParseUUIDPipe({ version: '4' }))
    experimentId: string,
    @Query() query: ListTrainingRunsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listTrainingRunsService.execute(
      experimentId,
      request.user.id,
      query.captureStatus,
    );
  }

  @Get('training-runs/:trainingRunId')
  async getTrainingRun(
    @Param('trainingRunId', new ParseUUIDPipe({ version: '4' }))
    trainingRunId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.getTrainingRunService.execute(
      trainingRunId,
      request.user.id,
    );
  }

  @Patch('training-runs/:trainingRunId')
  async updateTrainingRunStatus(
    @Param('trainingRunId', new ParseUUIDPipe({ version: '4' }))
    trainingRunId: string,
    @Body() body: UpdateTrainingRunStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.updateTrainingRunStatusService.execute(
      trainingRunId,
      request.user.id,
      body.status as TrainingRunStatus,
    );
  }

  @Patch('training-runs/:trainingRunId/capture-status')
  async updateTrainingRunCaptureStatus(
    @Param('trainingRunId', new ParseUUIDPipe({ version: '4' }))
    trainingRunId: string,
    @Body() body: UpdateTrainingRunCaptureStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.updateTrainingRunCaptureStatusService.execute(
      trainingRunId,
      request.user.id,
      {
        status: body.status,
        integrations: body.integrations,
      },
    );
  }

  @Post('training-runs/:trainingRunId/datasets')
  async createTrainingRunDatasetReference(
    @Param('trainingRunId', new ParseUUIDPipe({ version: '4' }))
    trainingRunId: string,
    @Body() body: CreateTrainingRunDatasetReferenceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.createTrainingRunDatasetReferenceService.execute(
      trainingRunId,
      request.user.id,
      {
        datasetVersionId: body.datasetVersionId,
        role: body.role,
      },
    );
  }
}