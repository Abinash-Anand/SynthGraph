import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import { GetReproductionManifestService } from './services/get-reproduction-manifest.service.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class ReproductionController {
  constructor(
    private readonly getReproductionManifestService:
      GetReproductionManifestService,
  ) {}

  @Get(
    'generations/:generationId/reproduction-manifest',
  )
  async getReproductionManifest(
    @Param(
      'generationId',
      new ParseUUIDPipe({ version: '4' }),
    )
    generationId: string,

    @Req() request: AuthenticatedRequest,
  ) {
    return this.getReproductionManifestService.execute(
      generationId,
      request.user.id,
    );
  }
}