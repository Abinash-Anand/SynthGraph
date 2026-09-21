import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Asset } from '../../database/entities/asset.entity.js';
import { ASSET_REPOSITORY } from '../repositories/asset.tokens.js';
import type { AssetRepository } from '../repositories/asset.repository.js';

@Injectable()
export class GetAssetService {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(
    assetId: string,
    userId: string,
  ): Promise<Asset> {
    const asset =
      await this.assetRepository.findByIdForUser(
        assetId,
        userId,
      );

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }
}
