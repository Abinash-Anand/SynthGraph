import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';
import { GetProjectService } from './services/get-project.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly getProjectService: GetProjectService,
  ) {}

  @Get(':projectId')
  @UseGuards(ApiKeyGuard)
  async getProject(
    @Param('projectId') projectId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.getProjectService.execute(
      projectId,
      request.user.id,
    );
  }
}