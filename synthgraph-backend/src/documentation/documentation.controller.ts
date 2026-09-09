import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import { GetDocumentationService } from './services/get-documentation.service.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class DocumentationController {
  constructor(
    private readonly getDocumentationService: GetDocumentationService,
  ) {}

  @Get('generations/:generationId/documentation')
  async getDocumentation(
    @Param(
      'generationId',
      new ParseUUIDPipe({ version: '4' }),
    )
    generationId: string,

    @Req() request: AuthenticatedRequest,

    @Res() response: Response,
  ): Promise<void> {
    const documentation =
      await this.getDocumentationService.execute(
        generationId,
        request.user.id,
      );

    response
      .type('text/markdown')
      .send(documentation);
  }
}