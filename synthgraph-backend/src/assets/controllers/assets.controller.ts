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

import { CreateAssetDto } from '../dto/create-asset.dto.js';
import { CreateAssetVersionDto } from '../dto/create-asset-version.dto.js';
import { UpdateAssetDto } from '../dto/update-asset.dto.js';

import { CreateAssetService } from '../services/create-asset.service.js';
import { GetAssetService } from '../services/get-asset.service.js';
import { ListAssetsService } from '../services/list-assets.service.js';
import { CreateAssetVersionService } from '../services/create-asset-version.service.js';
import { GetAssetVersionService } from '../services/get-asset-version.service.js';
import { ListAssetVersionsService } from '../services/list-asset-versions.service.js';
import { UpdateAssetService } from '../services/update-asset.service.js';
import { ArchiveAssetService } from '../services/archive-asset.service.js';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller()
@UseGuards(ApiKeyGuard)
export class AssetsController {
  constructor(
    private readonly createAssetService: CreateAssetService,
    private readonly getAssetService: GetAssetService,
    private readonly listAssetsService: ListAssetsService,
    private readonly createAssetVersionService: CreateAssetVersionService,
    private readonly getAssetVersionService: GetAssetVersionService,
    private readonly listAssetVersionsService: ListAssetVersionsService,
    private readonly updateAssetService: UpdateAssetService,
    private readonly archiveAssetService: ArchiveAssetService,
  ) {}

  @Post('assets')
  async createAsset(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateAssetDto,
  ) {
    return this.createAssetService.execute(
      request.user.id,
      body,
    );
  }

  @Get('assets')
  async listAssets(
    @Req() request: AuthenticatedRequest,
    @Query() query: PaginationQueryDto,
  ) {
    return this.listAssetsService.execute(
      request.user.id,
      query.limit,
      query.offset,
    );
  }

  @Get('assets/:assetId')
  async getAsset(
    @Req() request: AuthenticatedRequest,
    @Param('assetId') assetId: string,
  ) {
    return this.getAssetService.execute(
      assetId,
      request.user.id,
    );
  }

  @Patch('assets/:assetId')
  async updateAsset(
    @Req() request: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Body() body: UpdateAssetDto,
  ) {
    return this.updateAssetService.execute(assetId, request.user.id, {
      name: body.name,
      description: body.description,
    });
  }

  @Delete('assets/:assetId')
  async archiveAsset(
    @Req() request: AuthenticatedRequest,
    @Param('assetId') assetId: string,
  ) {
    await this.archiveAssetService.execute(assetId, request.user.id);

    return { message: 'Asset archived' };
  }

  @Post('assets/:assetId/versions')
  async createAssetVersion(
    @Req() request: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Body() body: CreateAssetVersionDto,
  ) {
    return this.createAssetVersionService.execute(
      request.user.id,
      assetId,
      body,
    );
  }

  @Get('assets/:assetId/versions')
  async listAssetVersions(
    @Req() request: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.listAssetVersionsService.execute(
      assetId,
      request.user.id,
      query.limit,
      query.offset,
    );
  }

  @Get('asset-versions/:assetVersionId')
  async getAssetVersion(
    @Req() request: AuthenticatedRequest,
    @Param('assetVersionId') assetVersionId: string,
  ) {
    return this.getAssetVersionService.execute(
      assetVersionId,
      request.user.id,
    );
  }
}
