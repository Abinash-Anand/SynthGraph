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
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import { ListExperimentsQueryDto } from './dto/list-experiments-query.dto.js';
import { CreateExperimentService } from './services/create-experiment.service.js';
import { GetExperimentService } from './services/get-experiment.service.js';
import { ListExperimentsService } from './services/list-experiments.service.js';

@Controller('projects/:projectId/experiments')
@UseGuards(ApiKeyGuard)
export class ExperimentsController {
  constructor(
    private readonly createExperimentService: CreateExperimentService,
    private readonly listExperimentsService: ListExperimentsService,
    private readonly getExperimentService: GetExperimentService,
  ) {}

  @Post()
  async createExperiment(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      name: string;
      description?: string;
    },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.createExperimentService.execute(
      projectId,
      request.user.id,
      body.name,
      body.description,
    );
  }

  @Get()
  async listExperiments(
    @Param('projectId') projectId: string,
    @Query() query: ListExperimentsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listExperimentsService.execute(
      projectId,
      request.user.id,
      query.search,
    );
  }

  @Get(':experimentId')
  async getExperiment(
    @Param('projectId') projectId: string,
    @Param('experimentId') experimentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.getExperimentService.execute(
      projectId,
      experimentId,
      request.user.id,
    );
  }
}