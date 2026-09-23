import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import { CompareTrainingRunsDto } from './dto/compare-training-runs.dto.js';
import { CompareTrainingRunsService } from './services/compare-training-runs.service.js';

@Controller('training-runs')
@UseGuards(ApiKeyGuard)
export class TrainingRunComparisonsController {
  constructor(
    private readonly compareTrainingRunsService: CompareTrainingRunsService,
  ) {}

  @Post('compare')
  async compare(
    @Body() body: CompareTrainingRunsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.compareTrainingRunsService.execute(
      body.trainingRunIds,
      request.user.id,
    );
  }
}
