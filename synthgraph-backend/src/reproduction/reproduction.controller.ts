import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

import { GetReproductionManifestService } from './services/get-reproduction-manifest.service.js';
import { ListReproductionManifestsService } from './services/list-reproduction-manifests.service.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class ReproductionController {
  constructor(
    private readonly getReproductionManifestService:
      GetReproductionManifestService,

    private readonly listReproductionManifestsService:
      ListReproductionManifestsService,
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

  // Additive: every generation's manifest for an experiment in one request,
  // in the same order as `GET /experiments/:experimentId/generations`.
  @Get(
    'experiments/:experimentId/reproduction-manifests',
  )
  async listReproductionManifests(
    @Param(
      'experimentId',
      new ParseUUIDPipe({ version: '4' }),
    )
    experimentId: string,

    @Query() query: PaginationQueryDto,

    @Req() request: AuthenticatedRequest,
  ) {
    return this.listReproductionManifestsService.execute(
      experimentId,
      request.user.id,
      query.limit,
      query.offset,
    );
  }
}