import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import { CreateEvaluationResultDto } from './dto/create-evaluation-result.dto.js';
import { CreateEvaluationResultService } from './services/create-evaluation-result.service.js';
import { GetEvaluationResultService } from './services/get-evaluation-result.service.js';
import { ListEvaluationResultsService } from './services/list-evaluation-results.service.js';

@Controller()
@UseGuards(ApiKeyGuard)
export class EvaluationResultsController {
  constructor(
    private readonly createEvaluationResultService: CreateEvaluationResultService,
    private readonly getEvaluationResultService: GetEvaluationResultService,
    private readonly listEvaluationResultsService: ListEvaluationResultsService,
  ) {}

  @Post('training-runs/:trainingRunId/evaluations')
  async create(
    @Param('trainingRunId') trainingRunId: string,
    @Body() dto: CreateEvaluationResultDto,
    @Req() request: any,
  ) {
    return this.createEvaluationResultService.execute(
      trainingRunId,
      request.user.id,
      dto.datasetVersionId,
      dto.metrics,
      dto.metadata,
      dto.name,
    );
  }

  @Get('evaluation-results/:evaluationResultId')
  async get(
    @Param('evaluationResultId') evaluationResultId: string,
    @Req() request: any,
  ) {
    return this.getEvaluationResultService.execute(
      evaluationResultId,
      request.user.id,
    );
  }

  @Get('training-runs/:trainingRunId/evaluations')
  async list(
    @Param('trainingRunId') trainingRunId: string,
    @Req() request: any,
  ) {
    return this.listEvaluationResultsService.execute(
      trainingRunId,
      request.user.id,
    );
  }
}