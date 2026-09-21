import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AssetVersion } from '../../database/entities/asset-version.entity.js';

import { ASSET_VERSION_REPOSITORY } from '../repositories/asset.tokens.js';

import type { AssetVersionRepository } from '../repositories/asset-version.repository.js';

@Injectable()
export class GetAssetVersionService {
  constructor(
    @Inject(ASSET_VERSION_REPOSITORY)
    private readonly repository: AssetVersionRepository,
  ) {}

  async execute(
    versionId: string,
    userId: string,
  ): Promise<AssetVersion> {
    const version =
      await this.repository.findByIdForUser(
        versionId,
        userId,
      );

    if (!version) {
      throw new NotFoundException(
        'Asset version not found',
      );
    }

    return version;
  }
}
