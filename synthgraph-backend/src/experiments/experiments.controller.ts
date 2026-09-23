import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import { CreateExperimentDto } from './dto/create-experiment.dto.js';
import { ListExperimentsQueryDto } from './dto/list-experiments-query.dto.js';
import { UpdateExperimentDto } from './dto/update-experiment.dto.js';
import { CreateExperimentService } from './services/create-experiment.service.js';
import { GetExperimentService } from './services/get-experiment.service.js';
import { ListExperimentsService } from './services/list-experiments.service.js';
import { UpdateExperimentService } from './services/update-experiment.service.js';
import { ArchiveExperimentService } from './services/archive-experiment.service.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class ExperimentsController {
  constructor(
    private readonly createExperimentService: CreateExperimentService,
    private readonly listExperimentsService: ListExperimentsService,
    private readonly getExperimentService: GetExperimentService,
    private readonly updateExperimentService: UpdateExperimentService,
    private readonly archiveExperimentService: ArchiveExperimentService,
  ) {}

  @Post('projects/:projectId/experiments')
  async createExperiment(
    @Param('projectId') projectId: string,
    @Body() body: CreateExperimentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.createExperimentService.execute(
      projectId,
      request.user.id,
      body.name,
      body.description,
    );
  }

  @Get('projects/:projectId/experiments')
  async listExperiments(
    @Param('projectId') projectId: string,
    @Query() query: ListExperimentsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listExperimentsService.execute(
      projectId,
      request.user.id,
      query.search,
      query.limit,
      query.offset,
    );
  }

  @Get('projects/:projectId/experiments/:experimentId')
  async getExperimentForProject(
    @Param('projectId') projectId: string,
    @Param('experimentId') experimentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.getExperimentService.executeForProject(
      projectId,
      experimentId,
      request.user.id,
    );
  }

  @Get('experiments/:experimentId')
  async getExperiment(
    @Param('experimentId') experimentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.getExperimentService.executeForUser(
      experimentId,
      request.user.id,
    );
  }

  @Patch('experiments/:experimentId')
  async updateExperiment(
    @Param('experimentId') experimentId: string,
    @Body() body: UpdateExperimentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.updateExperimentService.execute(
      experimentId,
      request.user.id,
      {
        name: body.name,
        description: body.description,
      },
    );
  }

  @Delete('experiments/:experimentId')
  async archiveExperiment(
    @Param('experimentId') experimentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.archiveExperimentService.execute(
      experimentId,
      request.user.id,
    );

    return { message: 'Experiment archived' };
  }
}