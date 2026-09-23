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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { CreateProjectService } from './services/create-project.service.js';
import { GetProjectService } from './services/get-project.service.js';
import { ListProjectsService } from './services/list-projects.service.js';
import { UpdateProjectService } from './services/update-project.service.js';
import { ArchiveProjectService } from './services/archive-project.service.js';

@Controller('projects')
@UseGuards(ApiKeyGuard)
export class ProjectsController {
  constructor(
    private readonly createProjectService: CreateProjectService,
    private readonly getProjectService: GetProjectService,
    private readonly listProjectsService: ListProjectsService,
    private readonly updateProjectService: UpdateProjectService,
    private readonly archiveProjectService: ArchiveProjectService,
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
  async listProjects(
    @Query() query: PaginationQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listProjectsService.execute(
      request.user.id,
      query.limit,
      query.offset,
    );
  }

  @Get(':projectId')
  async getProject(
    @Param('projectId') projectId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.getProjectService.execute(projectId, request.user.id);
  }

  @Patch(':projectId')
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.updateProjectService.execute(projectId, request.user.id, {
      name: body.name,
      description: body.description,
    });
  }

  @Delete(':projectId')
  async archiveProject(
    @Param('projectId') projectId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.archiveProjectService.execute(projectId, request.user.id);

    return { message: 'Project archived' };
  }
}
