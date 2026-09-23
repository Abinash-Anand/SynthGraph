import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { AssetRepository } from '../repositories/asset.repository.js';
import { ASSET_REPOSITORY } from '../repositories/asset.tokens.js';

@Injectable()
export class ArchiveAssetService {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(assetId: string, userId: string): Promise<void> {
    const archived = await this.assetRepository.archive(assetId, userId);

    if (!archived) {
      throw new NotFoundException('Asset not found');
    }
  }
}
