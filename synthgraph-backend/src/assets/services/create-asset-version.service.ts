import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AssetVersion } from '../../database/entities/asset-version.entity.js';

import {
  ASSET_REPOSITORY,
  ASSET_VERSION_REPOSITORY,
} from '../repositories/asset.tokens.js';

import type { AssetRepository } from '../repositories/asset.repository.js';
import type { AssetVersionRepository } from '../repositories/asset-version.repository.js';

@Injectable()
export class CreateAssetVersionService {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,

    @Inject(ASSET_VERSION_REPOSITORY)
    private readonly assetVersionRepository: AssetVersionRepository,
  ) {}

  async execute(
    userId: string,
    assetId: string,
    input: {
      version: string;
      uri: string;
      size?: number;
      checksum?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<AssetVersion> {
    const asset =
      await this.assetRepository.findByIdForUser(
        assetId,
        userId,
      );

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const exists =
      await this.assetVersionRepository.existsByAssetAndVersion(
        assetId,
        input.version,
      );

    if (exists) {
      throw new ConflictException(
        'Asset version already exists',
      );
    }

    const assetVersion = Object.assign(
      new AssetVersion(),
      {
        assetId,
        version: input.version,
        uri: input.uri,
        size:
          input.size === undefined
            ? null
            : String(input.size),
        checksum: input.checksum ?? null,
        metadata: input.metadata ?? {},
      },
    );

    return this.assetVersionRepository.create(
      assetVersion,
    );
  }
}
