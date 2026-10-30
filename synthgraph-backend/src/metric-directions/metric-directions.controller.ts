import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';
import {
  CorrectMetricDirectionDto,
  DeclareMetricDirectionsDto,
} from './dto/metric-directions.dto.js';
import {
  assertMetricKey,
  isMetricDirection,
  parseMetricDirections,
} from './metric-direction.js';
import { MetricDirectionsService } from './metric-directions.service.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class MetricDirectionsController {
  constructor(private readonly metricDirectionsService: MetricDirectionsService) {}

  @Get('experiments/:experimentId/metric-directions')
  async list(
    @Param('experimentId', new ParseUUIDPipe({ version: '4' }))
    experimentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.metricDirectionsService.list(experimentId, request.user.id);
  }

  // Declares directions. Never overwrites: a different direction for a metric
  // that already has one is a 409 and nothing is written.
  @Post('experiments/:experimentId/metric-directions')
  @HttpCode(200)
  async declare(
    @Param('experimentId', new ParseUUIDPipe({ version: '4' }))
    experimentId: string,
    @Body() body: DeclareMetricDirectionsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.metricDirectionsService.declare(
      experimentId,
      request.user.id,
      parseMetricDirections(body.directions),
    );
  }

  // The explicit correction of an existing declaration. The metric key is in
  // the body, not the path, because keys such as "eval/episode_reward" contain
  // slashes.
  @Put('experiments/:experimentId/metric-directions')
  async correct(
    @Param('experimentId', new ParseUUIDPipe({ version: '4' }))
    experimentId: string,
    @Body() body: CorrectMetricDirectionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    assertMetricKey(body.metricKey);
    if (!isMetricDirection(body.direction)) {
      throw new BadRequestException(
        'direction must be one of maximize, minimize, neutral',
      );
    }
    return this.metricDirectionsService.correct(experimentId, request.user.id, {
      metricKey: body.metricKey,
      direction: body.direction,
      correctionNote: body.correctionNote,
    });
  }
}
