import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import { CreateTrainingRunDto } from './dto/create-training-run.dto.js';
import { CreateTrainingRunDatasetReferenceDto } from './dto/create-training-run-dataset-reference.dto.js';

import { CreateTrainingRunService } from './services/create-training-run.service.js';
import { GetTrainingRunService } from './services/get-training-run.service.js';
import { CreateTrainingRunDatasetReferenceService } from './services/create-training-run-dataset-reference.service.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class TrainingRunsController {
  constructor(
    private readonly createTrainingRunService: CreateTrainingRunService,
    private readonly getTrainingRunService: GetTrainingRunService,
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