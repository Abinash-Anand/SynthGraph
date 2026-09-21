import { Inject, Injectable } from '@nestjs/common';

import { Asset } from '../../database/entities/asset.entity.js';
import { ASSET_REPOSITORY } from '../repositories/asset.tokens.js';
import type { AssetRepository } from '../repositories/asset.repository.js';

@Injectable()
export class ListAssetsService {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(userId: string): Promise<Asset[]> {
    return this.assetRepository.findAllForUser(userId);
  }
}
