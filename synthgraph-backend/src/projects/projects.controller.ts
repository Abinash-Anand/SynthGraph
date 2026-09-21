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
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { CreateProjectService } from './services/create-project.service.js';
import { GetProjectService } from './services/get-project.service.js';
import { ListProjectsService } from './services/list-projects.service.js';

@Controller('projects')
@UseGuards(ApiKeyGuard)
export class ProjectsController {
  constructor(
    private readonly createProjectService: CreateProjectService,
    private readonly getProjectService: GetProjectService,
    private readonly listProjectsService: ListProjectsService,
  ) {}

  @Post()
  async createProject(
    @Body() body: CreateProjectDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.createProjectService.execute(
      request.user.id,
      body.name,
      body.description,
    );
  }

  @Get()
  async listProjects(@Req() request: AuthenticatedRequest) {
    return this.listProjectsService.execute(request.user.id);
  }

  @Get(':projectId')
  async getProject(
    @Param('projectId') projectId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.getProjectService.execute(projectId, request.user.id);
  }
}
