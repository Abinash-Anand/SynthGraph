import { Repository } from 'typeorm';

import { AssetVersion } from '../../database/entities/asset-version.entity.js';
import { AssetVersionRepository } from './asset-version.repository.js';

export class TypeOrmAssetVersionRepository
  implements AssetVersionRepository
{
  constructor(
    private readonly repository: Repository<AssetVersion>,
  ) {}

  async create(version: AssetVersion): Promise<AssetVersion> {
    return this.repository.save(version);
  }

  async findByIdForUser(
    versionId: string,
    userId: string,
  ): Promise<AssetVersion | null> {
    return this.repository
      .createQueryBuilder('version')
      .innerJoin('version.asset', 'asset')
      .where('version.id = :versionId', { versionId })
      .andWhere('asset.user_id = :userId', { userId })
      .getOne();
  }

  async findAllForAsset(
    assetId: string,
    userId: string,
  ): Promise<AssetVersion[]> {
    return this.repository
      .createQueryBuilder('version')
      .innerJoin('version.asset', 'asset')
      .where('version.asset_id = :assetId', { assetId })
      .andWhere('asset.user_id = :userId', { userId })
      .orderBy('version.created_at', 'DESC')
      .getMany();
  }

  async existsByAssetAndVersion(
    assetId: string,
    version: string,
  ): Promise<boolean> {
    return this.repository.exists({
      where: {
        assetId,
        version,
      },
    });
  }
}
