import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import { CompareGenerationsDto } from './dto/compare-generations.dto.js';
import { CompareGenerationsService } from './services/compare-generations.service.js';

@Controller('generations')
@UseGuards(ApiKeyGuard)
export class ComparisonsController {
  constructor(
    private readonly compareGenerationsService: CompareGenerationsService,
  ) {}

  @Post('compare')
  async compare(
    @Body() body: CompareGenerationsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.compareGenerationsService.execute(
      body.generationIds,
      request.user.id,
    );
  }
}