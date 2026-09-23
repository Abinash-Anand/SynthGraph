import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Asset } from '../../database/entities/asset.entity.js';
import type { AssetRepository } from '../repositories/asset.repository.js';
import { ASSET_REPOSITORY } from '../repositories/asset.tokens.js';

@Injectable()
export class UpdateAssetService {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(
    assetId: string,
    userId: string,
    changes: { name?: string; description?: string },
  ): Promise<Asset> {
    if (changes.name === undefined && changes.description === undefined) {
      throw new BadRequestException(
        'At least one of name or description must be provided',
      );
    }

    const updated = await this.assetRepository.update(
      assetId,
      userId,
      changes,
    );

    if (!updated) {
      throw new NotFoundException('Asset not found');
    }

    const asset = await this.assetRepository.findByIdForUser(
      assetId,
      userId,
    );

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }
}
