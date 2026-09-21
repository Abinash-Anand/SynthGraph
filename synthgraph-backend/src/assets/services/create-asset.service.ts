import { Inject, Injectable } from '@nestjs/common';

import { Asset } from '../../database/entities/asset.entity.js';

import { ASSET_REPOSITORY } from '../repositories/asset.tokens.js';
import type { AssetRepository } from '../repositories/asset.repository.js';

@Injectable()
export class CreateAssetService {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(
    userId: string,
    input: {
      name: string;
      type?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<Asset> {
    const asset = Object.assign(new Asset(), {
      userId,
      name: input.name,
      type: input.type ?? null,
      description: input.description ?? null,
      metadata: input.metadata ?? {},
    });

    return this.assetRepository.create(asset);
  }
}
