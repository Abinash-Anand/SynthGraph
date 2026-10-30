import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';
import { ServerTimings } from '../common/timing/server-timings.js';
import { GetExperimentWorkspaceService } from './services/get-experiment-workspace.service.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class WorkspaceController {
  constructor(
    private readonly getExperimentWorkspaceService: GetExperimentWorkspaceService,
  ) {}

  // Additive: the separate routes this combines are unchanged.
  @Get('experiments/:experimentId/workspace')
  async getWorkspace(
    @Param('experimentId') experimentId: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const timings = new ServerTimings();
    const startedAt = performance.now();
    try {
      return await this.getExperimentWorkspaceService.execute(
        experimentId,
        request.user.id,
        timings,
      );
    } finally {
      // Set on failures too: a slow error is as worth explaining as a slow page.
      timings.record('total', performance.now() - startedAt);
      response.setHeader('Server-Timing', timings.header());
    }
  }
}
