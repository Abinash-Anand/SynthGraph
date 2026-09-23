import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { ApiKeyGuard } from '../../auth/guards/api-key.guard.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

import { CreateDatasetDto } from '../dto/create-dataset.dto.js';
import { CreateDatasetVersionDto } from '../dto/create-dataset-version.dto.js';
import { UpdateDatasetDto } from '../dto/update-dataset.dto.js';

import { CreateDatasetService } from '../services/create-dataset.service.js';
import { GetDatasetService } from '../services/get-dataset.service.js';
import { ListDatasetsService } from '../services/list-datasets.service.js';
import { CreateDatasetVersionService } from '../services/create-dataset-version.service.js';
import { GetDatasetVersionService } from '../services/get-dataset-version.service.js';
import { ListDatasetVersionsService } from '../services/list-dataset-versions.service.js';
import { UpdateDatasetService } from '../services/update-dataset.service.js';
import { ArchiveDatasetService } from '../services/archive-dataset.service.js';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller()
@UseGuards(ApiKeyGuard)
export class DatasetsController {
  constructor(
    private readonly createDatasetService: CreateDatasetService,
    private readonly getDatasetService: GetDatasetService,
    private readonly listDatasetsService: ListDatasetsService,
    private readonly createDatasetVersionService: CreateDatasetVersionService,
    private readonly getDatasetVersionService: GetDatasetVersionService,
    private readonly listDatasetVersionsService: ListDatasetVersionsService,
    private readonly updateDatasetService: UpdateDatasetService,
    private readonly archiveDatasetService: ArchiveDatasetService,
  ) {}

  @Post('datasets')
  async createDataset(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateDatasetDto,
  ) {
    return this.createDatasetService.execute(
      request.user.id,
      body,
    );
  }

  @Get('datasets')
  async listDatasets(
    @Req() request: AuthenticatedRequest,
    @Query() query: PaginationQueryDto,
  ) {
    return this.listDatasetsService.execute(
      request.user.id,
      query.limit,
      query.offset,
    );
  }

  @Get('datasets/:datasetId')
  async getDataset(
    @Req() request: AuthenticatedRequest,
    @Param('datasetId') datasetId: string,
  ) {
    return this.getDatasetService.execute(
      datasetId,
      request.user.id,
    );
  }

  @Patch('datasets/:datasetId')
  async updateDataset(
    @Req() request: AuthenticatedRequest,
    @Param('datasetId') datasetId: string,
    @Body() body: UpdateDatasetDto,
  ) {
    return this.updateDatasetService.execute(datasetId, request.user.id, {
      name: body.name,
      description: body.description,
    });
  }

  @Delete('datasets/:datasetId')
  async archiveDataset(
    @Req() request: AuthenticatedRequest,
    @Param('datasetId') datasetId: string,
  ) {
    await this.archiveDatasetService.execute(datasetId, request.user.id);

    return { message: 'Dataset archived' };
  }

  @Post('datasets/:datasetId/versions')
  async createDatasetVersion(
    @Req() request: AuthenticatedRequest,
    @Param('datasetId') datasetId: string,
    @Body() body: CreateDatasetVersionDto,
  ) {
    return this.createDatasetVersionService.execute(
      request.user.id,
      datasetId,
      body,
    );
  }

  @Get('datasets/:datasetId/versions')
  async listDatasetVersions(
    @Req() request: AuthenticatedRequest,
    @Param('datasetId') datasetId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.listDatasetVersionsService.execute(
      datasetId,
      request.user.id,
      query.limit,
      query.offset,
    );
  }

  @Get('dataset-versions/:datasetVersionId')
  async getDatasetVersion(
    @Req() request: AuthenticatedRequest,
    @Param('datasetVersionId') datasetVersionId: string,
  ) {
    return this.getDatasetVersionService.execute(
      datasetVersionId,
      request.user.id,
    );
  }
}