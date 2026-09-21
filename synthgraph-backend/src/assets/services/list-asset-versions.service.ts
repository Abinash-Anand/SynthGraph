import { Inject, Injectable } from '@nestjs/common';

import { AssetVersion } from '../../database/entities/asset-version.entity.js';

import { ASSET_VERSION_REPOSITORY } from '../repositories/asset.tokens.js';

import type { AssetVersionRepository } from '../repositories/asset-version.repository.js';

@Injectable()
export class ListAssetVersionsService {
  constructor(
    @Inject(ASSET_VERSION_REPOSITORY)
    private readonly repository: AssetVersionRepository,
  ) {}

  async execute(
    assetId: string,
    userId: string,
  ): Promise<AssetVersion[]> {
    return this.repository.findAllForAsset(
      assetId,
      userId,
    );
  }
}
