import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import {
  validateCreateGenerationRequest,
  validateUpdateGenerationStatusRequest,
} from './dto/generation-request.dto.js';

import { CreateGenerationDatasetReferenceDto } from './dto/create-generation-dataset-reference.dto.js';

import {
  toGenerationResponse,
  GenerationResponse,
} from './responses/generation.response.js';

import { CreateGenerationService } from './services/create-generation.service.js';
import { GetGenerationService } from './services/get-generation.service.js';
import { ListGenerationsService } from './services/list-generations.service.js';
import { UpdateGenerationStatusService } from './services/update-generation-status.service.js';
import { CreateGenerationDatasetReferenceService } from './services/create-generation-dataset-reference.service.js';

import { GenerationDatasetReference } from '../database/entities/generation-dataset-reference.entity.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class GenerationsController {
  constructor(
    private readonly createGenerationService: CreateGenerationService,
    private readonly getGenerationService: GetGenerationService,
    private readonly listGenerationsService: ListGenerationsService,
    private readonly updateGenerationStatusService: UpdateGenerationStatusService,
    private readonly createGenerationDatasetReferenceService: CreateGenerationDatasetReferenceService,
  ) {}

  @Post('experiments/:experimentId/generations')
  async createGeneration(
    @Param('experimentId', new ParseUUIDPipe({ version: '4' }))
    experimentId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<GenerationResponse> {
    const generation = await this.createGenerationService.execute(
      experimentId,
      request.user.id,
      validateCreateGenerationRequest(body),
    );

    return toGenerationResponse(generation);
  }

  @Get('generations/:generationId')
  async getGeneration(
    @Param('generationId', new ParseUUIDPipe({ version: '4' }))
    generationId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<GenerationResponse> {
    const generation = await this.getGenerationService.execute(
      generationId,
      request.user.id,
    );

    return toGenerationResponse(generation);
  }

  @Get('experiments/:experimentId/generations')
  async listGenerations(
    @Param('experimentId', new ParseUUIDPipe({ version: '4' }))
    experimentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<GenerationResponse[]> {
    const generations = await this.listGenerationsService.execute(
      experimentId,
      request.user.id,
    );

    return generations.map(toGenerationResponse);
  }

  @Patch('generations/:generationId')
  async updateGenerationStatus(
    @Param('generationId', new ParseUUIDPipe({ version: '4' }))
    generationId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<GenerationResponse> {
    const input = validateUpdateGenerationStatusRequest(body);

    const generation =
      await this.updateGenerationStatusService.execute(
        generationId,
        request.user.id,
        input.status,
      );

    return toGenerationResponse(generation);
  }

  @Post('generations/:generationId/datasets')
  async createGenerationDatasetReference(
    @Param('generationId', new ParseUUIDPipe({ version: '4' }))
    generationId: string,
    @Body() body: CreateGenerationDatasetReferenceDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<GenerationDatasetReference> {
    return this.createGenerationDatasetReferenceService.execute(
      generationId,
      request.user.id,
      {
        datasetVersionId: body.datasetVersionId,
        role: body.role,
      },
    );
  }
}