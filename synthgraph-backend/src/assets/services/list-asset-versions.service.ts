import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AssetVersion } from '../../database/entities/asset-version.entity.js';

import { ASSET_REPOSITORY, ASSET_VERSION_REPOSITORY } from '../repositories/asset.tokens.js';

import type { AssetRepository } from '../repositories/asset.repository.js';
import type { AssetVersionRepository } from '../repositories/asset-version.repository.js';

@Injectable()
export class ListAssetVersionsService {
  constructor(
    @Inject(ASSET_VERSION_REPOSITORY)
    private readonly repository: AssetVersionRepository,

    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(
    assetId: string,
    userId: string,
  ): Promise<AssetVersion[]> {
    const asset = await this.assetRepository.findByIdForUser(
      assetId,
      userId,
    );

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return this.repository.findAllForAsset(
      assetId,
      userId,
    );
  }
}
